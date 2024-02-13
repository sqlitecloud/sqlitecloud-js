/**
 * connection-tls.ts - handles low level communication with sqlitecloud server via tls socket and binary protocol
 */

import { SQLiteCloudConfig, SQLiteCloudError, ErrorCallback, ResultsCallback } from './types'
import { SQLiteCloudConnection } from './connection'
import { formatCommand, hasCommandLength, parseCommandLength, popData, decompressBuffer, CMD_COMPRESSED, CMD_ROWSET_CHUNK } from './protocol'
import { getInitializationCommands, anonimizeError, anonimizeCommand } from './utilities'
import { parseRowsetChunks } from './protocol'

import net from 'net'
import tls from 'tls'

/**
 * Implementation of SQLiteCloudConnection that connects directly to the database via tls socket and raw, binary protocol.
 * Connects with plain socket with no encryption is the ?insecure=1 parameter is specified.
 * SQLiteCloud low-level connection, will do messaging, handle socket, authentication, etc.
 * A connection socket is established when the connection is created and closed when the connection is closed.
 * All operations are serialized by waiting for any pending operations to complete. Once a connection is closed,
 * it cannot be reopened and you must create a new connection.
 */
export class SQLiteCloudTlsConnection extends SQLiteCloudConnection {
  /** Currently opened tls socket used to communicated with SQLiteCloud server */
  private socket?: tls.TLSSocket | net.Socket | null

  /** True if connection is open */
  get connected(): boolean {
    return !!this.socket
  }

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this {
    // connection established while we were waiting in line?
    console.assert(!this.connected, 'Connection already established')

    // clear all listeners and call done in the operations queue
    const finish: ResultsCallback = error => {
      if (this.socket) {
        this.socket.removeAllListeners('data')
        this.socket.removeAllListeners('error')
        this.socket.removeAllListeners('close')
        if (error) {
          this.close()
        }
      }
      callback?.call(this, error)
    }

    this.config = config
    const initializationCommands = getInitializationCommands(config)

    if (config.insecure) {
      // connect to plain socket, without encryption, only if insecure parameter specified
      // this option is mainly for testing purposes and is not available on production nodes
      // which would need to connect using tls and proper certificates as per code below
      const connectionOptions: net.SocketConnectOpts = {
        host: config.host,
        port: config.port as number
      }
      this.socket = net.connect(connectionOptions, () => {
        console.warn(`TlsConnection.connectTransport - connected to ${config.host as string}:${config.port as number} using insecure protocol`)
        // send initialization commands
        console.assert(this.socket, 'Connection already closed')
        this.transportCommands(initializationCommands, error => {
          if (error && this.socket) {
            this.close()
          }
          if (callback) {
            callback?.call(this, error)
            callback = undefined
          }
          finish(error)
        })
      })
    } else {
      // connect to tls socket, initialize connection, setup event handlers
      this.socket = tls.connect(this.config.port as number, this.config.host, this.config.tlsOptions, () => {
        const tlsSocket = this.socket as tls.TLSSocket
        if (!tlsSocket?.authorized) {
          const anonimizedError = anonimizeError(tlsSocket.authorizationError)
          console.error('Connection was not authorized', anonimizedError)
          this.close()
          finish(new SQLiteCloudError('Connection was not authorized', { cause: anonimizedError }))
        } else {
          // the connection was closed before it was even opened,
          // eg. client closed the connection before the server accepted it
          if (this.socket === null) {
            finish(new SQLiteCloudError('Connection was closed before it was done opening'))
            return
          }

          // send initialization commands
          console.assert(this.socket, 'Connection already closed')
          this.transportCommands(initializationCommands, error => {
            if (error && this.socket) {
              this.close()
            }
            if (callback) {
              callback?.call(this, error)
              callback = undefined
            }
            finish(error)
          })
        }
      })
    }

    this.socket.on('close', () => {
      this.socket = null
      finish(new SQLiteCloudError('Connection was closed'))
    })

    this.socket.once('error', (error: any) => {
      console.error('Connection error', error)
      finish(new SQLiteCloudError('Connection error', { cause: error }))
    })

    return this
  }

  /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
  transportCommands(commands: string, callback?: ResultsCallback): this {
    // connection needs to be established?
    if (!this.socket) {
      callback?.call(this, new SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' }))
      return this
    }

    // compose commands following SCPC protocol
    commands = formatCommand(commands)

    let buffer = Buffer.alloc(0)
    const rowsetChunks: Buffer[] = []
    // const startedOn = new Date()

    // define what to do if an answer does not arrive within the set timeout
    let socketTimeout: NodeJS.Timeout

    // clear all listeners and call done in the operations queue
    const finish: ResultsCallback = (error, result) => {
      clearTimeout(socketTimeout)
      if (this.socket) {
        this.socket.removeAllListeners('data')
        this.socket.removeAllListeners('error')
        this.socket.removeAllListeners('close')
      }
      if (callback) {
        callback?.call(this, error, result)
        callback = undefined
      }
    }

    // define the Promise that waits for the server response
    const readData = (data: Uint8Array) => {
      try {
        // on first ondata event, dataType is read from data, on subsequent ondata event, is read from buffer that is the concatanations of data received on each ondata event
        let dataType = buffer.length === 0 ? data.subarray(0, 1).toString() : buffer.subarray(0, 1).toString('utf8')
        buffer = Buffer.concat([buffer, data])
        const commandLength = hasCommandLength(dataType)

        if (commandLength) {
          const commandLength = parseCommandLength(buffer)
          const hasReceivedEntireCommand = buffer.length - buffer.indexOf(' ') - 1 >= commandLength ? true : false
          if (hasReceivedEntireCommand) {
            if (this.config?.verbose) {
              let bufferString = buffer.toString('utf8')
              if (bufferString.length > 1000) {
                bufferString = bufferString.substring(0, 100) + '...' + bufferString.substring(bufferString.length - 40)
              }
              // const elapsedMs = new Date().getTime() - startedOn.getTime()
              // console.debug(`Receive: ${bufferString} - ${elapsedMs}ms`)
            }

            // need to decompress this buffer before decoding?
            if (dataType === CMD_COMPRESSED) {
              ;({ buffer, dataType } = decompressBuffer(buffer))
            }

            if (dataType !== CMD_ROWSET_CHUNK) {
              this.socket?.off('data', readData)
              const { data } = popData(buffer)
              finish(null, data)
            } else {
              // @ts-expect-error
              // check if rowset received the ending chunk
              if (data.subarray(data.indexOf(' ') + 1, data.length).toString() === '0 0 0 ') {
                const parsedData = parseRowsetChunks(rowsetChunks)
                finish?.call(this, null, parsedData)
              } else {
                // no ending string? ask server for another chunk
                rowsetChunks.push(buffer)
                buffer = Buffer.alloc(0)

                // no longer need to ack the server
                // const okCommand = formatCommand('OK')
                // this.socket?.write(okCommand)
              }
            }
          }
        } else {
          // command with no explicit len so make sure that the final character is a space
          const lastChar = buffer.subarray(buffer.length - 1, buffer.length).toString('utf8')
          if (lastChar == ' ') {
            const { data } = popData(buffer)
            finish(null, data)
          }
        }
      } catch (error) {
        console.assert(error instanceof Error)
        if (error instanceof Error) {
          finish(error)
        }
      }
    }

    this.socket?.once('close', () => {
      finish(new SQLiteCloudError('Connection was closed', { cause: anonimizeCommand(commands) }))
    })

    this.socket?.write(commands, 'utf8', () => {
      // @ts-ignore
      socketTimeout = setTimeout(() => {
        const timeoutError = new SQLiteCloudError('Request timed out', { cause: anonimizeCommand(commands) })
        // console.debug(`Request timed out, config.timeout is ${this.config?.timeout as number}ms`, timeoutError)
        finish(timeoutError)
      }, this.config?.timeout)
      this.socket?.on('data', readData)
    })

    this.socket?.once('error', (error: any) => {
      console.error('Socket error', error)
      this.close()
      finish(new SQLiteCloudError('Socket error', { cause: anonimizeError(error) }))
    })

    return this
  }

  /** Disconnect from server, release connection. */
  close(): this {
    console.assert(this.socket !== null, 'TlsConnection.close - connection already closed')
    this.operations.clear()
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    this.socket = undefined
    return this
  }
}

export default SQLiteCloudTlsConnection
