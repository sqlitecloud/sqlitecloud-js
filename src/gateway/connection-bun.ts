/**
 * transport-bun.ts - handles low level communication with sqlitecloud server via specific Bun APIs for tls socket and binary protocol
 */

import { type SQLiteCloudConfig, SQLiteCloudError, type ErrorCallback, type ResultsCallback } from '../drivers/types'
import { SQLiteCloudConnection } from '../drivers/connection'
import { getInitializationCommands } from '../drivers/utilities'
import {
  formatCommand,
  hasCommandLength,
  parseCommandLength,
  popData,
  decompressBuffer,
  parseRowsetChunks,
  CMD_COMPRESSED,
  CMD_ROWSET_CHUNK
} from '../drivers/protocol'
import type { Socket } from 'bun'

/**
 * Implementation of SQLiteCloudConnection that connects to the database using specific Bun APIs
 * that connect to native sockets or tls sockets and communicates via raw, binary protocol.
 */
export class SQLiteCloudBunConnection extends SQLiteCloudConnection {
  /** Currently opened bun socket used to communicated with SQLiteCloud server */
  private socket?: Socket<any>

  /** True if connection is open */
  get connected(): boolean {
    return !!this.socket
  }

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this {
    console.debug(`-> connecting ${config?.host}:${config?.port}`)
    console.assert(!this.connected, 'BunSocketTransport.connect - connection already established')
    this.config = config

    Bun.connect<any>({
      hostname: config.host as string,
      port: config.port as number,
      tls: config.insecure ? false : true,

      socket: {
        open: socket => {
          // console.debug('BunSocketTransport.connect - open')
          this.socket = socket

          // send initialization commands
          const commands = getInitializationCommands(config)
          this.transportCommands(commands, (error, rowset) => {
            if (error) {
              console.error('BunSocketTransport.connect - error initializing connection', error)
              callback?.call(this, error)
            } else {
              // console.debug(`<- connected ${config?.host}:${config?.port}`)
              callback?.call(this, null)
            }
          })
        },

        // connection failed
        connectError: (socket, error) => {
          console.error(`BunTransport.connect - connectError: ${error}`)
          this.close()
          callback?.call(this, error)
        },

        // data received is processed by onData chunk by chunk
        data: (socket, data) => {
          this.processCommandsData(socket, data)
        },

        // close is received when we call socket.end() or when the server closes the connection
        close: socket => {
          if (this.socket) {
            this.close()
            this.processCommandsFinish(new SQLiteCloudError('Connection was closed'))
          }
        },

        drain: socket => {
          // console.debug('BunTransport.connect - drain')
        },

        error: (socket, error) => {
          this.close()
          this.processCommandsFinish(new SQLiteCloudError('Connection error', { cause: error }))
        },

        // connection closed by server
        end: socket => {
          if (this.socket) {
            this.close()
            this.processCommandsFinish(new SQLiteCloudError('Connection ended'))
          }
        },

        // connection timed out
        timeout: socket => {
          this.close()
          this.processCommandsFinish(new SQLiteCloudError('Connection timed out'))
        }
      }
    })
      .catch(error => {
        console.debug(`BunTransport.connect - error: ${error}`)
        this.close()
        callback?.call(this, error)
      })
      .then(socket => {
        // connection established
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

    // reset buffer and rowset chunks, define response callback
    this.buffer = Buffer.alloc(0)
    this.rowsetChunks = []
    this.processCallback = callback
    this.startedOn = new Date()

    // compose commands following SCPC protocol
    const formattedCommands = formatCommand(commands)
    if (this.config?.verbose) {
      console.debug(`-> ${formattedCommands}`)
    }
    this.socket.write(formattedCommands)
    this.socket.flush()

    return this
  }

  // processCommands sets up empty buffers, results callback then send the command to the server via socket.write
  // onData is called when data is received, it will process the data until all data is retrieved for a response
  // when response is complete or there's an error, finish is called to call the results callback set by processCommands...

  // buffer to store incoming data
  private buffer: Buffer = Buffer.alloc(0)
  private rowsetChunks: Buffer[] = []
  private startedOn: Date = new Date()

  // callback to be called when a command is finished processing
  private processCallback?: ResultsCallback

  /** Handles data received in response to an outbound command sent by processCommands */
  private processCommandsData(socket: Socket<any>, data: Buffer) {
    try {
      // on first ondata event, dataType is read from data, on subsequent ondata event, is read from buffer that is the concatanations of data received on each ondata event
      let dataType = this.buffer.length === 0 ? data.subarray(0, 1).toString() : this.buffer.subarray(0, 1).toString('utf8')
      this.buffer = Buffer.concat([this.buffer, data])
      const commandLength = hasCommandLength(dataType)

      if (commandLength) {
        const commandLength = parseCommandLength(this.buffer)
        const hasReceivedEntireCommand = this.buffer.length - this.buffer.indexOf(' ') - 1 >= commandLength ? true : false
        if (hasReceivedEntireCommand) {
          if (this.config?.verbose) {
            let bufferString = this.buffer.toString('utf8')
            if (bufferString.length > 1000) {
              bufferString = bufferString.substring(0, 100) + '...' + bufferString.substring(bufferString.length - 40)
            }
            const elapsedMs = new Date().getTime() - this.startedOn.getTime()
            console.debug(`<- ${bufferString} (${elapsedMs}ms)`)
          }

          // need to decompress this buffer before decoding?
          if (dataType === CMD_COMPRESSED) {
            ;({ buffer: this.buffer, dataType } = decompressBuffer(this.buffer))
          }

          if (dataType !== CMD_ROWSET_CHUNK) {
            const { data } = popData(this.buffer)
            this.processCommandsFinish?.call(this, null, data)
          } else {
            // check if rowset received the ending chunk
            if (data.subarray(data.indexOf(' ') + 1, data.length).toString() === '0 0 0 ') {
              const parsedData = parseRowsetChunks(this.rowsetChunks)
              this.processCommandsFinish?.call(this, null, parsedData)
            } else {
              // no ending string? ask server for another chunk
              this.rowsetChunks.push(this.buffer)
              this.buffer = Buffer.alloc(0)

              // no longer need to ack the server
              // const okCommand = formatCommand('OK')
              // this.socket?.write(okCommand)
            }
          }
        }
      } else {
        // command with no explicit len so make sure that the final character is a space
        const lastChar = this.buffer.subarray(this.buffer.length - 1, this.buffer.length).toString('utf8')
        if (lastChar == ' ') {
          const { data } = popData(this.buffer)
          this.processCommandsFinish?.call(this, null, data)
        }
      }
    } catch (error) {
      console.assert(error instanceof Error)
      if (error instanceof Error) {
        this.processCommandsFinish?.call(this, error)
      }
    }
  }

  /** Completes a transaction initiated by processCommands */
  private processCommandsFinish(error: Error | null, result?: any) {
    if (error) {
      console.error('BunTransport.finish - error', error)
    } else {
      // console.debug('BunTransport.finish - result', result)
    }
    if (this.processCallback) {
      this.processCallback(error, result)
    }
  }

  /** Disconnect immediately, release connection. */
  close(): this {
    if (this.socket) {
      const socket = this.socket
      this.socket = undefined
      socket.end()
    }
    this.operations.clear()
    return this
  }
}
