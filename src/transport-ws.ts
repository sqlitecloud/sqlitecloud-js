/**
 * transport-ws.ts - handles low level communication with sqlitecloud server via socket.io websocket
 */

import { SQLiteCloudConfig, SQLiteCloudError, ErrorCallback, ResultsCallback } from './types'
import { SQLiteCloudRowset } from './rowset'
import { ConnectionTransport } from './connection'
import { io, Socket } from 'socket.io-client'

/**
 * Implementation of TransportConnection that connects to the database indirectly
 * via SQLite Cloud Gateway, a socket.io based deamon that responds to sql query
 * requests by returning results and rowsets in json format. The gateway handles
 * connect, disconnect, retries, order of operations, timeouts, etc.
 */
export class WebSocketTransport implements ConnectionTransport {
  /** Configuration passed to connect */
  private config?: SQLiteCloudConfig
  /** Socket.io used to communicated with SQLiteCloud server */
  private socket?: Socket

  /** True if connection is open */
  get connected(): boolean {
    return !!this.socket
  }

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  connect(config: SQLiteCloudConfig, callback?: ErrorCallback): this {
    try {
      // connection established while we were waiting in line?
      console.assert(!this.connected, 'Connection already established')
      if (!this.socket) {
        this.config = config
        const host = this.config.host as string
        //          const connectionString = this.config.connectionString as string
        const gatewayUrl = 'ws://localhost:4000'
        //const gatewayUrl = `ws://${host}:4000`
        const connectionString = 'sqlitecloud://admin:uN3ARhdcKQ@og0wjec-m.sqlite.cloud:8860/chinook.db'
        this.socket = io(gatewayUrl, { auth: { token: connectionString } })
      }
      callback?.call(this, null)
    } catch (error) {
      callback?.call(this, error as Error)
    }
    return this
  }

  /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
  processCommands(commands: string, callback?: ResultsCallback): this {
    // connection needs to be established?
    if (!this.socket) {
      callback?.call(this, new SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' }))
      return this
    }

    this.socket.emit('v1/sql', { sql: commands, row: 'array' }, (response: any) => {
      if (response?.error) {
        const error = new SQLiteCloudError(response.error.detail, { ...response.error })
        callback?.call(this, error)
      } else {
        console.debug(`SQLiteCloudWebsocketConnection.processCommands - response: ${JSON.stringify(response)}`)
        const { data, metadata } = response
        if (data && metadata) {
          if (metadata.numberOfRows !== undefined && metadata.numberOfColumns !== undefined && metadata.columns !== undefined) {
            // we can recreate a SQLiteCloudRowset from the response
            const rowset = new SQLiteCloudRowset(metadata, data.flat())
            callback?.call(this, null, rowset)
            return
          }
        }
        callback?.call(this, null, response?.data)
      }
    })

    return this
  }

  /** Disconnect socket.io from server */
  public close(): this {
    console.assert(this.socket !== null, 'WebsocketTransport.close - connection already closed')
    if (this.socket) {
      this.socket?.close()
      this.socket = undefined
    }
    this.socket = undefined
    return this
  }
}
