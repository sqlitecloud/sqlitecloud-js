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
  CMD_ROWSET_CHUNK,
  bufferEndsWith,
  ROWSET_CHUNKS_END
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
  /* eslint-disable @typescript-eslint/no-unused-vars */
  connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this {
    this.log(`-> connecting ${config?.host as string}:${config?.port as number}`)
    console.assert(!this.connected, 'BunSocketTransport.connect - connection already established')
    this.config = config

    void Bun.connect<any>({
      hostname: config.host as string,
      port: config.port as number,
      tls: config.insecure ? false : true,

      socket: {
        open: socket => {
          // console.debug('BunSocketTransport.connect - open')
          this.socket = socket

          // send initialization commands
          const commands = getInitializationCommands(config)
          this.transportCommands(commands, error => {
            // any results are ignored
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
          console.error('BunTransport.connect - connectError', error)
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
        console.debug('BunTransport.connect - error', error)
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
    this.startedOn = new Date()
    this.processCallback = callback

    // compose commands following SCPC protocol
    const formattedCommands = formatCommand(commands)
    this.log(`-> ${formattedCommands}`)
    this.socket.write(formattedCommands)
    this.socket.flush()

    return this
  }

  // processCommands sets up empty buffers, results callback then send the command to the server via socket.write
  // onData is called when data is received, it will process the data until all data is retrieved for a response
  // when response is complete or there's an error, finish is called to call the results callback set by processCommands...

  // buffer to accumulate incoming data until an whole command is received and can be parsed
  private buffer: Buffer = Buffer.alloc(0)
  private startedOn: Date = new Date()

  // callback to be called when a command is finished processing
  private processCallback?: ResultsCallback

  /** Handles data received in response to an outbound command sent by processCommands */
  private processCommandsData(socket: Socket<any>, data: Buffer) {
    try {
      // append data to buffer as it arrives
      if (data.length && data.length > 0) {
        this.buffer = Buffer.concat([this.buffer, data])
      }

      let dataType = this.buffer?.subarray(0, 1).toString()
      if (hasCommandLength(dataType)) {
        const commandLength = parseCommandLength(this.buffer)
        const hasReceivedEntireCommand = this.buffer.length - this.buffer.indexOf(' ') - 1 >= commandLength ? true : false

        if (hasReceivedEntireCommand) {
          this.log(`<- ${this.buffer.toString('utf8').slice(0, 1000)} (${new Date().getTime() - this.startedOn.getTime()}ms)`)

          // need to decompress this buffer before decoding?
          if (dataType === CMD_COMPRESSED) {
            ;({ buffer: this.buffer, dataType } = decompressBuffer(this.buffer))
          }

          if (dataType !== CMD_ROWSET_CHUNK) {
            const { data } = popData(this.buffer)
            this.processCommandsFinish?.call(this, null, data)
          } else {
            // check if rowset received the ending chunk in which case it can be unpacked
            if (bufferEndsWith(this.buffer, ROWSET_CHUNKS_END)) {
              const parsedData = parseRowsetChunks([this.buffer])
              this.processCommandsFinish?.call(this, null, parsedData)
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
        this.processCommandsFinish?.call(this, error, null)
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
      // console.error(`SQLiteCloudBunConnection.processCommandsFinish - error:${error}, result: ${result}`, error, result)
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