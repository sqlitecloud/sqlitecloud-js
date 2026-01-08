/**
 * connection-tls.ts - connection via tls socket and sqlitecloud protocol
 */

import { SQLiteCloudConnection } from './connection'
import {
  bufferEndsWith,
  CMD_COMPRESSED,
  CMD_ROWSET_CHUNK,
  decompressBuffer,
  formatCommand,
  hasCommandLength,
  parseCommandLength,
  parseRowsetChunks,
  popData,
  ROWSET_CHUNKS_END
} from './protocol'
import { type ErrorCallback, type ResultsCallback, SQLiteCloudCommand, type SQLiteCloudConfig, SQLiteCloudError } from './types'
import { getInitializationCommands } from './utilities'
import { getSafeBuffer, getSafeTLS } from './safe-imports'
import type * as TLSTypes from 'tls'

// explicitly importing buffer library to allow cross-platform support by replacing it
// In React Native: Metro resolves 'buffer' to '@craftzdog/react-native-buffer' via package.json react-native field
// In Web/Node: Uses standard buffer package
const Buffer = getSafeBuffer()

// In React Native: Metro resolves 'tls' to 'react-native-tcp-socket' via package.json react-native field
// In Node: Uses native tls module
// In Browser: Returns null (browser field sets tls to false)
const tls = getSafeTLS()

/**
 * Implementation of SQLiteCloudConnection that connects to the database using specific tls APIs
 * that connect to native sockets or tls sockets and communicates via raw, binary protocol.
 */
export class SQLiteCloudTlsConnection extends SQLiteCloudConnection {
  /** Currently opened bun socket used to communicated with SQLiteCloud server */
  private socket?: TLSTypes.TLSSocket

  /** True if connection is open */
  get connected(): boolean {
    return !!this.socket
  }

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this {
    console.assert(!this.connected, 'SQLiteCloudTlsConnection.connect - connection already established')

    // Check if tls is available (it's null in browser contexts)
    if (!tls) {
      const error = new SQLiteCloudError(
        'TLS connections are not available in this environment. Use WebSocket connections instead by setting usewebsocket: true in your configuration.',
        { errorCode: 'ERR_TLS_NOT_AVAILABLE' }
      )
      if (callback) {
        callback.call(this, error)
        return this
      }
      throw error
    }

    if (this.config.verbose) {
      console.debug(`-> connecting ${config?.host as string}:${config?.port as number}`)
    }

    this.config = config
    const initializationCommands = getInitializationCommands(config)

    // connect to plain socket, without encryption, only if insecure parameter specified
    // this option is mainly for testing purposes and is not available on production nodes
    // which would need to connect using tls and proper certificates as per code below
    const connectionOptions = {
      host: config.host,
      port: config.port as number,
      rejectUnauthorized: config.host != 'localhost',
      // Server name for the SNI (Server Name Indication) TLS extension.
      // https://r2.nodejs.org/docs/v6.11.4/api/tls.html#tls_class_tls_tlssocket
      servername: config.host
    }

    // tls.connect in the react-native-tcp-socket library is tls.connectTLS
    let connector = tls.connect
    // @ts-ignore
    if (typeof tls.connectTLS !== 'undefined') {
      // @ts-ignore
      connector = tls.connectTLS
    }

    this.processCallback = callback

    this.socket = connector(connectionOptions, () => {
      if (this.config.verbose) {
        console.debug(`SQLiteCloudTlsConnection - connected to ${this.config.host}, authorized: ${this.socket?.authorized}`)
      }
      this.transportCommands(initializationCommands, error => {
        if (this.config.verbose) {
          console.debug(`SQLiteCloudTlsConnection - initialized connection`)
        }
        callback?.call(this, error)
      })
    })
    this.socket.setKeepAlive(true)
    // disable Nagle algorithm because we want our writes to be sent ASAP
    // https://brooker.co.za/blog/2024/05/09/nagle.html
    this.socket.setNoDelay(true)

    this.socket.on('data', (data: Buffer) => {
      this.processCommandsData(data)
    })

    this.socket.on('error', (error: Error) => {
      this.close()
      this.processCommandsFinish(new SQLiteCloudError('Connection error', { errorCode: 'ERR_CONNECTION_ERROR', cause: error }))
    })

    this.socket.on('end', () => {
      this.close()
      if (this.processCallback) this.processCommandsFinish(new SQLiteCloudError('Server ended the connection', { errorCode: 'ERR_CONNECTION_ENDED' }))
    })

    this.socket.on('close', () => {
      this.close()
      this.processCommandsFinish(new SQLiteCloudError('Connection closed', { errorCode: 'ERR_CONNECTION_CLOSED' }))
    })

    this.socket.on('timeout', () => {
      this.close()
      this.processCommandsFinish(new SQLiteCloudError('Connection ened due to timeout', { errorCode: 'ERR_CONNECTION_TIMEOUT' }))
    })

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
      commands = { query: commands } as SQLiteCloudCommand
    }

    // reset buffer and rowset chunks, define response callback
    this.buffer = Buffer.alloc(0)
    this.startedOn = new Date()
    this.processCallback = callback
    this.executingCommands = commands

    // compose commands following SCPC protocol
    const formattedCommands = formatCommand(commands)
    if (this.config?.verbose) {
      console.debug(`-> ${formattedCommands}`)
    }

    const timeoutMs = this.config?.timeout ?? 0
    if (timeoutMs > 0) {
      const timeout: any = setTimeout(() => {
        callback?.call(this, new SQLiteCloudError('Connection timeout out', { errorCode: 'ERR_CONNECTION_TIMEOUT' }))
        this.socket?.destroy()
        this.socket = undefined
      }, timeoutMs)

      this.socket?.write(formattedCommands, () => {
        clearTimeout(timeout) // Clear the timeout on successful write
      })
    } else {
      this.socket?.write(formattedCommands)
    }

    return this
  }

  // processCommands sets up empty buffers, results callback then send the command to the server via socket.write
  // onData is called when data is received, it will process the data until all data is retrieved for a response
  // when response is complete or there's an error, finish is called to call the results callback set by processCommands...

  // buffer to accumulate incoming data until an whole command is received and can be parsed
  private buffer: Buffer = Buffer.alloc(0)
  private startedOn: Date = new Date()
  private executingCommands?: SQLiteCloudCommand

  // callback to be called when a command is finished processing
  private processCallback?: ResultsCallback

  private pendingChunks: Buffer[] = []

  /** Handles data received in response to an outbound command sent by processCommands */
  private processCommandsData(data: Buffer) {
    try {
      // append data to buffer as it arrives
      if (data.length && data.length > 0) {
        // console.debug(`processCommandsData - received ${data.length} bytes`)
        this.buffer = Buffer.concat([this.buffer, data])
      }

      let dataType = this.buffer?.subarray(0, 1).toString()
      if (hasCommandLength(dataType)) {
        const commandLength = parseCommandLength(this.buffer)
        const hasReceivedEntireCommand = this.buffer.length - this.buffer.indexOf(' ') - 1 >= commandLength ? true : false

        if (hasReceivedEntireCommand) {
          if (this.config?.verbose) {
            let bufferString = this.buffer.toString('utf8')
            if (bufferString.length > 1000) {
              bufferString = bufferString.substring(0, 100) + '...' + bufferString.substring(bufferString.length - 40)
            }
            const elapsedMs = new Date().getTime() - this.startedOn.getTime()
            console.debug(`<- ${bufferString} (${bufferString.length} bytes, ${elapsedMs}ms)`)
          }

          // need to decompress this buffer before decoding?
          if (dataType === CMD_COMPRESSED) {
            const decompressResults = decompressBuffer(this.buffer)
            if (decompressResults.dataType === CMD_ROWSET_CHUNK) {
              this.pendingChunks.push(decompressResults.buffer)
              this.buffer = decompressResults.remainingBuffer
              this.processCommandsData(Buffer.alloc(0))
              return
            } else {
              const { data } = popData(decompressResults.buffer)
              this.processCommandsFinish?.call(this, null, data)
            }
          } else {
            if (dataType !== CMD_ROWSET_CHUNK) {
              const { data } = popData(this.buffer)
              this.processCommandsFinish?.call(this, null, data)
            } else {
              const completeChunk = bufferEndsWith(this.buffer, ROWSET_CHUNKS_END)
              if (completeChunk) {
                const parsedData = parseRowsetChunks([...this.pendingChunks, this.buffer])
                this.processCommandsFinish?.call(this, null, parsedData)
              }
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
      console.error(`processCommandsData - error: ${error}`)
      console.assert(error instanceof Error, 'An error occoured while processing data')
      if (error instanceof Error) {
        this.processCommandsFinish?.call(this, error)
      }
    }
  }

  /** Completes a transaction initiated by processCommands */
  private processCommandsFinish(error: Error | null, result?: any) {
    if (error) {
      if (this.processCallback) {
        console.error('processCommandsFinish - error', error)
      } else {
        console.warn('processCommandsFinish - error with no registered callback', error)
      }
    }

    if (this.processCallback) {
      this.processCallback(error, result)
    }

    this.buffer = Buffer.alloc(0)
    this.pendingChunks = []
  }

  /** Disconnect immediately, release connection, no events. */
  close(): this {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.destroy()
      this.socket = undefined
    }
    this.operations.clear()
    return this
  }
}

export default SQLiteCloudTlsConnection
