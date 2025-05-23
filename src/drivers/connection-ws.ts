/**
 * transport-ws.ts - handles low level communication with sqlitecloud server via socket.io websocket
 */

import { io, Socket } from 'socket.io-client'
import { SQLiteCloudConnection } from './connection'
import { SQLiteCloudRowset } from './rowset'
import { ErrorCallback, ResultsCallback, SQLiteCloudCommand, SQLiteCloudConfig, SQLiteCloudError } from './types'

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
        const gatewayUrl = this.config?.gatewayurl || `${this.config.host === 'localhost' ? 'ws' : 'wss'}://${this.config.host as string}:4000`
        this.socket = io(gatewayUrl, { auth: { token: connectionstring } })
        
        this.socket.on('connect', () => {
          callback?.call(this, null)
        })

        this.socket.on('disconnect', (reason) => {
          this.close()
          callback?.call(this, new SQLiteCloudError('Disconnected', { errorCode: 'ERR_CONNECTION_ENDED', cause: reason }))
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

    this.socket.emit('GET /v2/weblite/sql', { sql: commands.query, bind: commands.parameters, row: 'array' }, (response: any) => {
      if (response?.error) {
        const error = new SQLiteCloudError(response.error.detail, { ...response.error })
        callback?.call(this, error)
      } else {
        const { data, metadata } = response
        if (data && metadata) {
          if (metadata.numberOfRows !== undefined && metadata.numberOfColumns !== undefined && metadata.columns !== undefined) {
            console.assert(Array.isArray(data), 'SQLiteCloudWebsocketConnection.transportCommands - data is not an array')
            // we can recreate a SQLiteCloudRowset from the response which we know to be an array of arrays
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
