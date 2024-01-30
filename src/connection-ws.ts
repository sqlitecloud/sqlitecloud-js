/**
 * connection-ws.ts - handles low level communication with sqlitecloud server via socket.io websocket
 */

import { SQLiteCloudConfig, SQLCloudRowsetMetadata, SQLiteCloudError, SQLiteCloudDataTypes, ErrorCallback, ResultsCallback } from './types'
import { SQLiteCloudRowset } from './rowset'
import { SQLiteCloudConnection, DEFAULT_TIMEOUT, DEFAULT_PORT } from './connection'
import { anonimizeError, anonimizeCommand } from './connection'

import { io, Socket, SocketOptions } from 'socket.io-client'

/**
 * Implementation of SQLiteCloudConnection that connects directly to the database via tls socket and raw, binary protocol.
 * SQLiteCloud low-level connection, will do messaging, handle socket, authentication, etc.
 * A connection socket is established when the connection is created and closed when the connection is closed.
 * All operations are serialized by waiting for any pending operations to complete. Once a connection is closed,
 * it cannot be reopened and you must create a new connection.
 */
export class SQLiteCloudWebsocketConnection extends SQLiteCloudConnection {
  /** Parse and validate provided connectionString or configuration */
  constructor(config: SQLiteCloudConfig | string, callback?: ErrorCallback) {
    super(config, callback)
  }

  /** Currently opened tls socket used to communicated with SQLiteCloud server */
  private socket?: Socket

  //
  // public properties
  //

  /** True if connection is open */
  public get connected(): boolean {
    return !!this.socket
  }

  //
  // private methods
  //

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  protected connect(callback?: ErrorCallback): this {
    this.operations.enqueue(done => {
      try {
        // connection established while we were waiting in line?
        console.assert(!this.connected, 'Connection already established')
        if (!this.socket) {
          const host = this.config.host as string
          //          const connectionString = this.config.connectionString as string
          const gatewayUrl = 'ws://localhost:4000'
          //const gatewayUrl = `ws://${host}:4000`
          const connectionString = 'sqlitecloud://admin:uN3ARhdcKQ@og0wjec-m.sqlite.cloud:8860/chinook.db'
          this.socket = io(gatewayUrl, { auth: { token: connectionString } })
        }
        callback?.call(this, null)
        done(null)
      } catch (error) {
        callback?.call(this, error as Error)
        done(error as Error)
      }
    })
    return this
  }

  /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
  protected processCommands(commands: string, callback?: ResultsCallback): this {
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

  //
  // public methods
  //

  /** Disconnect from server, release connection. */
  public close(): this {
    console.assert(this.socket !== null, 'SQLiteCloudWsConnection.close - connection already closed')
    if (this.socket) {
      this.socket?.close()
      this.socket = undefined
    }
    this.operations.clear()
    this.socket = undefined
    return this
  }
}
