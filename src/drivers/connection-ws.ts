/**
 * transport-ws.ts - handles low level communication with sqlitecloud server via socket.io websocket
 */

import { io, Socket } from 'socket.io-client'
import { Decoder as SocketIODecoder, Encoder as SocketIOEncoder } from 'socket.io-parser'
import { SQLiteCloudConnection } from './connection'
import { decodeGatewayResponse } from './gateway-response'
import { buildGatewayHost } from './gateway-url'
import {
  DEFAULT_WEBSOCKET_BLOB_TRANSFER_FORMAT,
  ErrorCallback,
  ResultsCallback,
  SQLiteCloudCommand,
  SQLiteCloudConfig,
  SQLiteCloudError
} from './types'
import { encodeBigIntMarkers, parseWebsocketMaxAttachments } from './utilities'

const SocketIODecoderBase = SocketIODecoder as unknown as new (...args: any[]) => { opts?: { maxAttachments?: number } }

function createSocketIOParser(maxAttachments: number) {
  class SQLiteCloudSocketIODecoder extends SocketIODecoderBase {
    constructor(opts?: any) {
      const decoderOptions = typeof opts === 'function' ? { reviver: opts } : opts
      super(decoderOptions?.reviver)
      this.opts ||= {}
      this.opts.maxAttachments = Math.max(this.opts.maxAttachments ?? decoderOptions?.maxAttachments ?? 0, maxAttachments)
    }
  }

  return {
    Encoder: SocketIOEncoder,
    Decoder: SQLiteCloudSocketIODecoder
  }
}

function getAttachmentLimitError(description: unknown, limit: number): SQLiteCloudError | undefined {
  const descriptionMessage = description instanceof Error ? description.message : typeof description === 'string' ? description : ''
  if (/illegal attachments/i.test(descriptionMessage)) {
    return new SQLiteCloudError(
      `WebSocket blob response exceeded the configured Socket.IO attachment limit (${limit}). Use websocketBlobFormat=base64-blobs-v1 or increase websocketMaxAttachments.`,
      {
        errorCode: 'ERR_WEBSOCKET_MAX_ATTACHMENTS_EXCEEDED',
        cause: description as Error | string
      }
    )
  }
}

/**
 * Implementation of TransportConnection that connects to the database indirectly
 * via SQLite Cloud Gateway, a socket.io based deamon that responds to sql query
 * requests by returning results and rowsets in json format. The gateway handles
 * connect, disconnect, retries, order of operations, timeouts, etc.
 */
export class SQLiteCloudWebsocketConnection extends SQLiteCloudConnection {
  /** Socket.io used to communicated with SQLiteCloud server */
  private socket?: Socket

  /** Commands sent to the gateway that are still waiting for their ack, failed if the socket goes away */
  private pendingCommands?: Set<(error: Error) => void>

  /** True if connection is open */
  get connected(): boolean {
    return !!(this.socket && this.socket?.connected)
  }

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this {
    try {
      // connection established while we were waiting in line?
      console.assert(!this.connected, 'Connection already established')
      if (!this.socket) {
        this.config = config

        const websocketMaxAttachments = parseWebsocketMaxAttachments(this.config.websocketMaxAttachments)

        // Gateway tenant routing is derived from the Host header. In production, `gatewayurl` is
        // a domain suffix (eg `gateway.sqlite.cloud`) appended to the tenant prefix from the core
        // hostname (eg crvheg7dhk.g4 from crvheg7dhk.g4.sqlite.cloud) to form the gateway host
        // (→ crvheg7dhk.g4.gateway.sqlite.cloud). For local development, pass a `gatewayurl`
        // containing `localhost` — the driver routes TCP to it and injects the tenant Host header
        // (with the gateway marker label) so the gateway still tenant-routes correctly.
        const authToken = this.config.unauthenticated ? undefined : this.config.apikey || this.config.token
        const ioOpts: Record<string, unknown> = { parser: createSocketIOParser(websocketMaxAttachments) }
        if (authToken) {
          ioOpts.auth = { token: authToken }
        }
        let gatewayUrl: string
        if (this.config.gatewayurl?.includes('localhost')) {
          const raw = this.config.gatewayurl
          gatewayUrl = raw.startsWith('ws://') || raw.startsWith('wss://') ? raw : `ws://${raw}`
          ioOpts.extraHeaders = { Host: buildGatewayHost(this.config.host as string) }
          ioOpts.transports = ['websocket']
        } else {
          const gatewayHost = buildGatewayHost(this.config.host as string, this.config.gatewayurl)
          gatewayUrl = `wss://${gatewayHost}:443`
        }
        this.socket = io(gatewayUrl, ioOpts)

        // the connect callback reports the outcome of the connection attempt and is called only once,
        // errors that happen later are reported to the commands that are waiting for a response
        let connectReported = false
        const reportConnect = (error: Error | null) => {
          if (!connectReported) {
            connectReported = true
            callback?.call(this, error)
          }
        }
        const fail = (error: Error) => {
          this.closeWithError(error)
          reportConnect(error)
        }

        this.socket.on('connect', () => {
          reportConnect(null)
        })

        this.socket.on('disconnect', (reason, description) => {
          fail(
            (reason === 'parse error' && getAttachmentLimitError(description, websocketMaxAttachments)) ||
              new SQLiteCloudError('Disconnected', { errorCode: 'ERR_CONNECTION_ENDED', cause: reason })
          )
        })

        this.socket.on('connect_error', (error: any) => {
          if (error?.message === 'parse error' || error?.cause === 'parse error') {
            fail(
              getAttachmentLimitError(error?.description || error?.data || error?.cause, websocketMaxAttachments) ||
                new SQLiteCloudError('Connection error', { errorCode: 'ERR_CONNECTION_ERROR', cause: error })
            )
            return
          }
          let message = error.message || 'Connection error'
          if (typeof error.context == 'object' && error.context.responseText) {
            try {
              const parsed = JSON.parse(error.context.responseText)
              message = parsed?.message || error.context.responseText
            } catch {
              message = error.context.responseText
            }
          }
          fail(new SQLiteCloudError(message, { errorCode: 'ERR_CONNECTION_ERROR' }))
        })

        this.socket.on('error', (error: Error) => {
          fail(new SQLiteCloudError('Connection error', { errorCode: 'ERR_CONNECTION_ERROR', cause: error }))
        })
      }
    } catch (error) {
      callback?.call(this, error as Error)
    }

    return this
  }

  /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
  transportCommands(commands: string | SQLiteCloudCommand, callback?: ResultsCallback): this {
    // connection needs to be established?
    if (!this.socket) {
      callback?.call(this, new SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' }))
      return this
    }

    if (typeof commands === 'string') {
      commands = { query: commands }
    }

    // the callback is called exactly once: with the gateway response, on timeout or when the connection drops
    let settled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    const finish = (error: Error | null, results?: any) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      this.pendingCommands?.delete(fail)
      callback?.call(this, error, results)
    }
    const fail = (error: Error) => finish(error)

    this.pendingCommands ||= new Set()
    this.pendingCommands.add(fail)

    const timeoutMs = this.config?.timeout ?? 0
    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        finish(new SQLiteCloudError(`Request timed out after ${timeoutMs} ms`, { errorCode: 'ERR_CONNECTION_TIMEOUT' }))
      }, timeoutMs)
    }

    this.socket.emit(
      'GET /v2/weblite/sql',
      {
        sql: commands.query,
        bind: encodeBigIntMarkers(commands.parameters),
        database: this.config.database,
        row: 'array',
        safe_integer_mode: this.config.safe_integer_mode,
        capabilities: {
          blobTransferFormat: this.config.websocketBlobFormat || DEFAULT_WEBSOCKET_BLOB_TRANSFER_FORMAT,
          bigIntMarkerFormat: 'tagged-v1'
        }
      },
      (response: any) => {
        const decoded = decodeGatewayResponse(response, this.config.safe_integer_mode)
        finish(decoded.error || null, decoded.result)
      }
    )

    return this
  }

  /** Disconnect socket.io from server */
  public close(): this {
    return this.closeWithError(new SQLiteCloudError('Connection closed', { errorCode: 'ERR_CONNECTION_CLOSED' }))
  }

  /** Disconnect socket.io from server and fail the commands still waiting for a response with the given error */
  private closeWithError(error: Error): this {
    console.assert(this.socket !== null, 'SQLiteCloudWebsocketConnection.close - connection already closed')
    if (this.socket) {
      this.socket?.removeAllListeners()
      this.socket?.close()
      this.socket = undefined
    }

    this.operations.clear()

    const pendingCommands = this.pendingCommands
    this.pendingCommands = undefined
    pendingCommands?.forEach(fail => fail(error))
    return this
  }
}

export default SQLiteCloudWebsocketConnection
