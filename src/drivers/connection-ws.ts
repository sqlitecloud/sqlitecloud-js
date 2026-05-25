/**
 * transport-ws.ts - handles low level communication with sqlitecloud server via socket.io websocket
 */

import { io, Socket } from 'socket.io-client'
import { Decoder as SocketIODecoder, Encoder as SocketIOEncoder } from 'socket.io-parser'
import { SQLiteCloudConnection } from './connection'
import { SQLiteCloudRowset } from './rowset'
import {
  DEFAULT_WEBSOCKET_BLOB_TRANSFER_FORMAT,
  ErrorCallback,
  ResultsCallback,
  SQLiteCloudCommand,
  SQLiteCloudConfig,
  SQLiteCloudError,
  SQLiteCloudWebsocketBlobTransferFormat
} from './types'
import { decodeBigIntMarkers, decodeWebsocketRowsetData, encodeBigIntMarkers, parseWebsocketBlobTransferFormat, parseWebsocketMaxAttachments } from './utilities'

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

function getResponseBlobTransferFormat(response: any): SQLiteCloudWebsocketBlobTransferFormat | undefined {
  return parseWebsocketBlobTransferFormat(response?.capabilities?.blobTransferFormat || response?.blobTransferFormat, undefined)
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
        const connectionstring = this.config.connectionstring as string
        const websocketMaxAttachments = parseWebsocketMaxAttachments(this.config.websocketMaxAttachments)
        const gatewayUrl = this.config?.gatewayurl || `${this.config.host === 'localhost' ? 'ws' : 'wss'}://${this.config.host as string}:443`
        this.socket = io(gatewayUrl, { auth: { token: connectionstring }, parser: createSocketIOParser(websocketMaxAttachments) })

        this.socket.on('connect', () => {
          callback?.call(this, null)
        })

        this.socket.on('disconnect', (reason, description) => {
          this.close()
          callback?.call(
            this,
            (reason === 'parse error' && getAttachmentLimitError(description, websocketMaxAttachments)) ||
              new SQLiteCloudError('Disconnected', { errorCode: 'ERR_CONNECTION_ENDED', cause: reason })
          )
        })

        this.socket.on('connect_error', (error: any) => {
          this.close()
          if (error?.message === 'parse error' || error?.cause === 'parse error') {
            callback?.call(
              this,
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
        row: 'array',
        safe_integer_mode: this.config.safe_integer_mode,
        capabilities: {
          blobTransferFormat: this.config.websocketBlobFormat || DEFAULT_WEBSOCKET_BLOB_TRANSFER_FORMAT
        }
      },
      (response: any) => {
        if (response?.error) {
          const error = new SQLiteCloudError(response.error.detail, { ...response.error })
          callback?.call(this, error)
        } else {
          const { metadata } = response
          const blobTransferFormat = getResponseBlobTransferFormat(response)
          const data =
            metadata && metadata.numberOfRows !== undefined && metadata.numberOfColumns !== undefined && metadata.columns !== undefined
              ? decodeWebsocketRowsetData(response?.data, metadata, this.config.safe_integer_mode, blobTransferFormat)
              : decodeBigIntMarkers(response?.data, this.config.safe_integer_mode)

          if (data !== undefined && metadata) {
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

export default SQLiteCloudWebsocketConnection
