/**
 * transport-ws.ts - handles low level communication with sqlitecloud server via socket.io websocket
 */

import { io, Socket } from 'socket.io-client'
import { Decoder as SocketIODecoder, Encoder as SocketIOEncoder } from 'socket.io-parser'
import { SQLiteCloudConnection } from './connection'
import { SQLiteCloudRowset } from './rowset'
import { ErrorCallback, ResultsCallback, SQLiteCloudCommand, SQLiteCloudConfig, SQLiteCloudError } from './types'
import { decodeBigIntMarkers, encodeBigIntMarkers } from './utilities'

const MAX_SOCKET_IO_ATTACHMENTS = 100000
const SocketIODecoderBase = SocketIODecoder as unknown as new (...args: any[]) => { opts?: { maxAttachments?: number } }

class SQLiteCloudSocketIODecoder extends SocketIODecoderBase {
  constructor(opts?: any) {
    super(typeof opts === 'function' ? opts : opts?.reviver)

    if (this.opts) {
      this.opts.maxAttachments = Math.max(this.opts.maxAttachments ?? 0, MAX_SOCKET_IO_ATTACHMENTS)
    }
  }
}

const sqliteCloudSocketIOParser = {
  Encoder: SocketIOEncoder,
  Decoder: SQLiteCloudSocketIODecoder
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

        // Gateway tenant routing is derived from the Host header. In production, `gatewayurl` is
        // a domain suffix (eg `gateway.sqlite.cloud`) appended to the tenant prefix from the core
        // hostname (eg crvheg7dhk.g4 from crvheg7dhk.g4.sqlite.cloud) to form the gateway host
        // (→ crvheg7dhk.g4.gateway.sqlite.cloud). For local development, pass a `gatewayurl`
        // containing `localhost` — the driver routes TCP to it and injects the tenant Host header
        // separately so the gateway still tenant-routes correctly.
        const authToken = this.config.apikey || this.config.token
        const ioOpts: Record<string, unknown> = { auth: { token: authToken }, parser: sqliteCloudSocketIOParser }
        let gatewayUrl: string
        if (this.config.gatewayurl?.includes('localhost')) {
          const raw = this.config.gatewayurl
          gatewayUrl = raw.startsWith('ws://') || raw.startsWith('wss://') ? raw : `ws://${raw}`
          ioOpts.extraHeaders = { Host: this.config.host }
        } else {
          const gatewayHost = buildGatewayHost(this.config.host as string, this.config.gatewayurl)
          gatewayUrl = `wss://${gatewayHost}:443`
        }
        this.socket = io(gatewayUrl, ioOpts)

        this.socket.on('connect', () => {
          callback?.call(this, null)
        })

        this.socket.on('disconnect', reason => {
          this.close()
          callback?.call(this, new SQLiteCloudError('Disconnected', { errorCode: 'ERR_CONNECTION_ENDED', cause: reason }))
        })

        this.socket.on('connect_error', (error: any) => {
          this.close()
          let message = error.message || 'Connection error'
          if (typeof error.context == 'object' && error.context.responseText) {
            try {
              const parsed = JSON.parse(error.context.responseText)
              message = parsed?.message || error.context.responseText
            } catch {
              message = error.context.responseText
            }
          }
          callback?.call(this, new SQLiteCloudError(message, { errorCode: 'ERR_CONNECTION_ERROR' }))
        })

        this.socket.on('error', (error: Error) => {
          this.close()
          callback?.call(this, new SQLiteCloudError('Connection error', { errorCode: 'ERR_CONNECTION_ERROR', cause: error }))
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

    this.socket.emit(
      'GET /v2/weblite/sql',
      {
        sql: commands.query,
        bind: encodeBigIntMarkers(commands.parameters),
        database: this.config.database,
        row: 'array',
        safe_integer_mode: this.config.safe_integer_mode
      },
      (response: any) => {
        if (response?.error) {
          const error = new SQLiteCloudError(response.error.detail, { ...response.error })
          callback?.call(this, error)
        } else {
          const { metadata } = response
          const data = decodeBigIntMarkers(response?.data, this.config.safe_integer_mode)
          if (data && metadata) {
            if (metadata.numberOfRows !== undefined && metadata.numberOfColumns !== undefined && metadata.columns !== undefined) {
              console.assert(Array.isArray(data), 'SQLiteCloudWebsocketConnection.transportCommands - data is not an array')
              // we can recreate a SQLiteCloudRowset from the response which we know to be an array of arrays
              const rowset = new SQLiteCloudRowset(metadata, data.flat())
              callback?.call(this, null, rowset)
              return
            }
          }
          callback?.call(this, null, data)
        }
      }
    )

    return this
  }

  /** Disconnect socket.io from server */
  public close(): this {
    console.assert(this.socket !== null, 'SQLiteCloudWebsocketConnection.close - connection already closed')
    if (this.socket) {
      this.socket?.removeAllListeners()
      this.socket?.close()
      this.socket = undefined
    }

    this.operations.clear()
    return this
  }
}

/** Builds the gateway hostname from a core hostname by replacing the last two labels with
 *  the given `gatewayurl` suffix (default `gateway.sqlite.cloud`). Returns host unchanged
 *  when it already ends with the suffix (idempotent) or is too short to have a tenant prefix. */
function buildGatewayHost(host: string, gatewayurl?: string): string {
  if (!host) return host
  const suffix = gatewayurl || 'gateway.sqlite.cloud'
  if (host === suffix || host.endsWith('.' + suffix)) return host
  const labels = host.split('.')
  if (labels.length < 3) return host
  return labels.slice(0, -2).join('.') + '.' + suffix
}

export default SQLiteCloudWebsocketConnection
