/**
 * connection.ts - handles low level communication with sqlitecloud server
 */

import tls, { TLSSocket } from 'tls'

const lz4 = require('lz4js')

import { SQLiteCloudConfig, SQLCloudRowsetMetadata, SQLiteCloudError, SQLiteCloudDataTypes, ErrorCallback, ResultsCallback } from './types'
import { SQLiteCloudRowset } from './rowset'
import { parseConnectionString, parseBoolean } from './utilities'

/**
 * The server communicates with clients via commands defined
 * in the SQLiteCloud Server Protocol (SCSP), see more at:
 * https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
 */
const CMD_STRING = '+'
const CMD_ZEROSTRING = '!'
const CMD_ERROR = '-'
const CMD_INT = ':'
const CMD_FLOAT = ','
const CMD_ROWSET = '*'
const CMD_ROWSET_CHUNK = '/'
const CMD_JSON = '#'
const CMD_NULL = '_'
const CMD_BLOB = '$'
const CMD_COMPRESSED = '%'
const CMD_COMMAND = '^'
const CMD_ARRAY = '='
// const CMD_RAWJSON = '{'
// const CMD_PUBSUB = '|'
// const CMD_RECONNECT = '@'

/** Default timeout value for queries */
export const DEFAULT_TIMEOUT = 300 * 1000

/** Default tls connection port */
export const DEFAULT_PORT = 9960

/**
 * SQLiteCloud low-level connection, will do messaging, handle socket, authentication, etc.
 * A connection socket is established when the connection is created and closed when the connection is closed.
 * All operations are serialized by waiting for any pending operations to complete. Once a connection is closed,
 * it cannot be reopened and you must create a new connection.
 */
export class SQLiteCloudConnection {
  /** Parse and validate provided connectionString or configuration */
  constructor(config: SQLiteCloudConfig | string, callback?: ErrorCallback) {
    if (typeof config === 'string') {
      this.config = this.validateConfiguration({ connectionString: config })
    } else {
      this.config = this.validateConfiguration(config)
    }
    this.connect(callback)
  }

  /** Configuration passed by client or extracted from connection string */
  private config: SQLiteCloudConfig

  /** Currently opened tls socket used to communicated with SQLiteCloud server */
  private socket?: tls.TLSSocket | null

  /** Operations are serialized by waiting an any pending promises */
  private operations = new OperationsQueue()

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

  /** Validate configuration, apply defaults, throw if something is missing or misconfigured */
  private validateConfiguration(config: SQLiteCloudConfig): SQLiteCloudConfig {
    if (config.connectionString) {
      config = {
        ...config,
        ...parseConnectionString(config.connectionString)
      }
    }

    // apply defaults where needed
    config.port ||= DEFAULT_PORT
    config.timeout = config.timeout && config.timeout > 0 ? config.timeout : DEFAULT_TIMEOUT
    config.clientId ||= 'SQLiteCloud'

    config.verbose = parseBoolean(config.verbose)
    config.noBlob = parseBoolean(config.noBlob)
    config.compression = parseBoolean(config.compression)
    config.createDatabase = parseBoolean(config.createDatabase)
    config.nonlinearizable = parseBoolean(config.nonlinearizable)
    config.sqliteMode = parseBoolean(config.sqliteMode)

    if (!config.username || !config.password || !config.host) {
      throw new SQLiteCloudError('The user, password and host arguments must be specified.', { errorCode: 'ERR_MISSING_ARGS' })
    }

    return config
  }

  /** Will log to console if verbose mode is enabled */
  private log(message: string, ...optionalParams: any[]): void {
    if (this.config.verbose) {
      message = anonimizeCommand(message)
      console.log(`${new Date().toISOString()} ${this.config.clientId as string}: ${message}`, ...optionalParams)
    }
  }

  /** Initialization commands sent to database when connection is established */
  private get initializationCommands(): string {
    // first user authentication, then all other commands
    const config = this.config
    let commands = `AUTH USER ${config.username || ''} ${config.passwordHashed ? 'HASH' : 'PASSWORD'} ${config.password || ''}; `

    if (config.database) {
      if (config.createDatabase && !config.dbMemory) {
        commands += `CREATE DATABASE ${config.database} IF NOT EXISTS; `
      }
      commands += `USE DATABASE ${config.database}; `
    }
    if (config.sqliteMode) {
      commands += 'SET CLIENT KEY SQLITE TO 1; '
    }
    if (config.compression) {
      commands += 'SET CLIENT KEY COMPRESSION TO 1; '
    }
    if (config.nonlinearizable) {
      commands += 'SET CLIENT KEY NONLINEARIZABLE TO 1; '
    }
    if (config.noBlob) {
      commands += 'SET CLIENT KEY NOBLOB TO 1; '
    }
    if (config.maxData) {
      commands += `SET CLIENT KEY MAXDATA TO ${config.maxData}; `
    }
    if (config.maxRows) {
      commands += `SET CLIENT KEY MAXROWS TO ${config.maxRows}; `
    }
    if (config.maxRowset) {
      commands += `SET CLIENT KEY MAXROWSET TO ${config.maxRowset}; `
    }

    return commands
  }

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  private connect(callback?: ErrorCallback): this {
    this.operations.enqueue(done => {
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
        done(error)
      }

      // connect to tls socket, initialize connection, setup event handlers
      this.socket = tls.connect(this.config.port as number, this.config.host, this.config.tlsOptions, () => {
        if (!this.socket?.authorized) {
          const anonimizedError = anonimizeError((this.socket as TLSSocket).authorizationError)
          this.log('Connection was not authorized', anonimizedError)
          this.close()
          finish(new SQLiteCloudError('Connection was not authorized', { cause: anonimizedError }))
        } else {
          // the connection was closed before it was even opened,
          // eg. client closed the connection before the server accepted it
          if (this.socket === null) {
            this.log('Connection was closed before it was opened')
            finish(new SQLiteCloudError('Connection was closed before it was done opening'))
            return
          }

          // send initialization commands
          console.assert(this.socket, 'Connection already closed')
          const commands = this.initializationCommands
          this.processCommands(commands, error => {
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

      this.socket.on('close', () => {
        this.log('Connection closed')
        this.socket = null
        finish(new SQLiteCloudError('Connection was closed'))
      })

      this.socket.once('error', (error: any) => {
        this.log('Connection error', error)
        finish(new SQLiteCloudError('Connection error', { cause: error }))
      })
    })

    return this
  }

  /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
  private processCommands(commands: string, callback?: ResultsCallback): this {
    // connection needs to be established?
    if (!this.socket) {
      callback?.call(this, new SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' }))
      return this
    }

    // compose commands following SCPC protocol
    commands = formatCommand(commands)

    let buffer = Buffer.alloc(0)
    const rowsetChunks: Buffer[] = []
    const startedOn = new Date()
    this.log(`Send: ${commands}`)

    // define what to do if an answer does not arrive within the set timeout
    let socketTimeout: number

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
            if (this.config.verbose) {
              let bufferString = buffer.toString('utf8')
              if (bufferString.length > 1000) {
                bufferString = bufferString.substring(0, 100) + '...' + bufferString.substring(bufferString.length - 40)
              }
              const elapsedMs = new Date().getTime() - startedOn.getTime()
              this.log(`Receive: ${bufferString} - ${elapsedMs}ms`)
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
                const okCommand = formatCommand('OK')
                this.log(`Send: ${okCommand}`)
                this.socket?.write(okCommand)
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
      socketTimeout = setTimeout(() => {
        const timeoutError = new SQLiteCloudError('Request timed out', { cause: anonimizeCommand(commands) })
        this.log(`Request timed out, config.timeout is ${this.config.timeout as number}ms`, timeoutError)
        finish(timeoutError)
      }, this.config.timeout)
      this.socket?.on('data', readData)
    })

    this.socket?.once('error', (error: any) => {
      this.log('Socket error', error)
      this.close()
      finish(new SQLiteCloudError('Socket error', { cause: anonimizeError(error) }))
    })

    return this
  }

  //
  // public methods
  //

  /** Enable verbose logging for debug purposes */
  public verbose(): void {
    this.config.verbose = true
  }

  /** Will enquee a command to be executed and callback with the resulting rowset/result/error */
  public sendCommands(commands: string, callback?: ResultsCallback): this {
    this.operations.enqueue(done => {
      this.processCommands(commands, (error, result) => {
        callback?.call(this, error, result)
        done(error)
      })
    })

    return this
  }

  /** Disconnect from server, release connection. */
  public close(): this {
    console.assert(this.socket !== null, 'SQLiteCloudConnection.close - connection already closed')
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    this.operations.clear()
    this.socket = undefined
    return this
  }
}

//
// OperationsQueue - used to linearize operations on the connection
//

type OperationCallback = (error: Error | null) => void
type Operation = (done: OperationCallback) => void

export class OperationsQueue {
  private queue: Operation[] = []
  private isProcessing = false

  /** Add operations to the queue, process immediately if possible, else wait for previous operations to complete */
  public enqueue(operation: Operation): void {
    this.queue.push(operation)
    if (!this.isProcessing) {
      this.processNext()
    }
  }

  /** Clear the queue */
  public clear(): void {
    this.queue = []
    this.isProcessing = false
  }

  /** Process the next operation in the queue */
  private processNext(): void {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const operation = this.queue.shift()
    operation?.(() => {
      // could receive (error) => { ...
      // if (error) {
      //   console.warn('OperationQueue.processNext - error in operation', error)
      // }

      // process the next operation in the queue
      this.processNext()
    })
  }
}

//
// utility functions
//

/** Analyze first character to check if corresponding data type has LEN */
function hasCommandLength(firstCharacter: string): boolean {
  return firstCharacter == CMD_INT || firstCharacter == CMD_FLOAT || firstCharacter == CMD_NULL ? false : true
}

/** Analyze a command with explict LEN and extract it */
function parseCommandLength(data: Buffer) {
  return parseInt(data.subarray(1, data.indexOf(' ')).toString('utf8'))
}

/** Receive a compressed buffer, decompress with lz4, return buffer and datatype */
function decompressBuffer(buffer: Buffer): { buffer: Buffer; dataType: string } {
  const spaceIndex = buffer.indexOf(' ')
  buffer = buffer.subarray(spaceIndex + 1)

  // extract compressed size
  const compressedSize = parseInt(buffer.subarray(0, buffer.indexOf(' ') + 1).toString('utf8'))
  buffer = buffer.subarray(buffer.indexOf(' ') + 1)

  // extract decompressed size
  const decompressedSize = parseInt(buffer.subarray(0, buffer.indexOf(' ') + 1).toString('utf8'))
  buffer = buffer.subarray(buffer.indexOf(' ') + 1)

  // extract compressed dataType
  const dataType = buffer.subarray(0, 1).toString('utf8')
  const decompressedBuffer = Buffer.alloc(decompressedSize)
  const compressedBuffer = buffer.subarray(buffer.length - compressedSize)

  // lz4js library is javascript and doesn't have types so we silence the type check
  // eslint-disable-next-line
  const decompressionResult: number = lz4.decompressBlock(compressedBuffer, decompressedBuffer, 0, compressedSize, 0)
  buffer = Buffer.concat([buffer.subarray(0, buffer.length - compressedSize), decompressedBuffer])
  if (decompressionResult <= 0 || decompressionResult !== decompressedSize) {
    throw new Error(`lz4 decompression error at offset ${decompressionResult}`)
  }

  return { buffer, dataType: dataType }
}

/** Parse error message or extended error message */
function parseError(buffer: Buffer, spaceIndex: number): never {
  const errorBuffer = buffer.subarray(spaceIndex + 1)
  const errorString = errorBuffer.toString('utf8')
  const parts = errorString.split(' ')

  let errorCodeStr = parts.shift() || '0' // Default errorCode is '0' if not present
  let extErrCodeStr = '0' // Default extended error code
  let offsetCodeStr = '-1' // Default offset code

  // Split the errorCode by ':' to check for extended error codes
  const errorCodeParts = errorCodeStr.split(':')
  errorCodeStr = errorCodeParts[0]
  if (errorCodeParts.length > 1) {
    extErrCodeStr = errorCodeParts[1]
    if (errorCodeParts.length > 2) {
      offsetCodeStr = errorCodeParts[2]
    }
  }

  // Rest of the error string is the error message
  const errorMessage = parts.join(' ')

  // Parse error codes to integers safely, defaulting to 0 if NaN
  const errorCode = parseInt(errorCodeStr)
  const extErrCode = parseInt(extErrCodeStr)
  const offsetCode = parseInt(offsetCodeStr)

  // create an Error object and add the custom properties
  throw new SQLiteCloudError(errorMessage, {
    errorCode: errorCode.toString(),
    externalErrorCode: extErrCode.toString(),
    offsetCode
  })
}

/** Parse an array of items (each of which will be parsed by type separately) */
function parseArray(buffer: Buffer, spaceIndex: number): SQLiteCloudDataTypes[] {
  const parsedData = []

  const array = buffer.subarray(spaceIndex + 1, buffer.length)
  const numberOfItems = parseInt(array.subarray(0, spaceIndex - 2).toString('utf8'))
  let arrayItems = array.subarray(array.indexOf(' ') + 1, array.length)

  for (let i = 0; i < numberOfItems; i++) {
    const { data, fwdBuffer: buffer } = popData(arrayItems)
    parsedData.push(data)
    arrayItems = buffer
  }

  return parsedData as SQLiteCloudDataTypes[]
}

/** Parse header in a rowset or chunk of a chunked rowset */
function parseRowsetHeader(buffer: Buffer): { index: number; metadata: SQLCloudRowsetMetadata; fwdBuffer: Buffer } {
  const index = parseInt(buffer.subarray(0, buffer.indexOf(':') + 1).toString())
  buffer = buffer.subarray(buffer.indexOf(':') + 1)

  // extract rowset header
  const { data, fwdBuffer } = popIntegers(buffer, 3)

  return {
    index,
    metadata: {
      version: data[0],
      numberOfRows: data[1],
      numberOfColumns: data[2],
      columns: []
    },
    fwdBuffer
  }
}

/** Extract column names and, optionally, more metadata out of a rowset's header */
function parseRowsetColumnsMetadata(buffer: Buffer, metadata: SQLCloudRowsetMetadata): Buffer {
  function popForward() {
    const { data, fwdBuffer: fwdBuffer } = popData(buffer) // buffer in parent scope
    buffer = fwdBuffer
    return data
  }

  for (let i = 0; i < metadata.numberOfColumns; i++) {
    metadata.columns.push({ name: popForward() as string })
  }

  // extract additional metadata if rowset has version 2
  if (metadata.version == 2) {
    for (let i = 0; i < metadata.numberOfColumns; i++) metadata.columns[i].type = popForward() as string
    for (let i = 0; i < metadata.numberOfColumns; i++) metadata.columns[i].database = popForward() as string
    for (let i = 0; i < metadata.numberOfColumns; i++) metadata.columns[i].table = popForward() as string
    for (let i = 0; i < metadata.numberOfColumns; i++) metadata.columns[i].column = popForward() as string // original column name
  }

  return buffer
}

/** Parse a regular rowset (no chunks) */
function parseRowset(buffer: Buffer, spaceIndex: number): SQLiteCloudRowset {
  buffer = buffer.subarray(spaceIndex + 1, buffer.length)

  const { metadata, fwdBuffer } = parseRowsetHeader(buffer)
  buffer = parseRowsetColumnsMetadata(fwdBuffer, metadata)

  // decode each rowset item
  const data = []
  for (let j = 0; j < metadata.numberOfRows * metadata.numberOfColumns; j++) {
    const { data: rowData, fwdBuffer } = popData(buffer)
    data.push(rowData)
    buffer = fwdBuffer
  }

  console.assert(data && data.length === metadata.numberOfRows * metadata.numberOfColumns, 'SQLiteCloudConnection.parseRowset - invalid rowset data')
  return new SQLiteCloudRowset(metadata, data)
}

/**
 * Parse a chunk of a chunked rowset command, eg:
 * *LEN 0:VERS NROWS NCOLS DATA
 */
function parseRowsetChunks(buffers: Buffer[]) {
  let metadata: SQLCloudRowsetMetadata = { version: 1, numberOfColumns: 0, numberOfRows: 0, columns: [] }
  const data = []

  for (let i = 0; i < buffers.length; i++) {
    let buffer: Buffer = buffers[i]

    // validate and skip data type
    const dataType = buffer.subarray(0, 1).toString()
    console.assert(dataType === CMD_ROWSET_CHUNK)
    buffer = buffer.subarray(buffer.indexOf(' ') + 1)

    // chunk header, eg: 0:VERS NROWS NCOLS
    const { index: chunkIndex, metadata: chunkMetadata, fwdBuffer } = parseRowsetHeader(buffer)
    buffer = fwdBuffer

    // first chunk? extract columns metadata
    if (chunkIndex === 1) {
      metadata = chunkMetadata
      buffer = parseRowsetColumnsMetadata(buffer, metadata)
    } else {
      metadata.numberOfRows += chunkMetadata.numberOfRows
    }

    // extract single rowset row
    for (let k = 0; k < chunkMetadata.numberOfRows * metadata.numberOfColumns; k++) {
      const { data: itemData, fwdBuffer } = popData(buffer)
      data.push(itemData)
      buffer = fwdBuffer
    }
  }

  console.assert(data && data.length === metadata.numberOfRows * metadata.numberOfColumns, 'SQLiteCloudConnection.parseRowsetChunks - invalid rowset data')
  return new SQLiteCloudRowset(metadata, data)
}

/** Pop one or more space separated integers from beginning of buffer, move buffer forward */
function popIntegers(buffer: Buffer, numberOfIntegers = 1): { data: number[]; fwdBuffer: Buffer } {
  const data: number[] = []
  for (let i = 0; i < numberOfIntegers; i++) {
    const spaceIndex = buffer.indexOf(' ')
    data[i] = parseInt(buffer.subarray(0, spaceIndex).toString())
    buffer = buffer.subarray(spaceIndex + 1)
  }
  return { data, fwdBuffer: buffer }
}

/** Parse command, extract its data, return the data and the buffer moved to the first byte after the command */
function popData(buffer: Buffer): { data: SQLiteCloudDataTypes | SQLiteCloudRowset; fwdBuffer: Buffer } {
  function popResults(data: any) {
    const fwdBuffer = buffer.subarray(commandEnd)
    return { data, fwdBuffer }
  }

  // first character is the data type
  console.assert(buffer && buffer instanceof Buffer)
  const dataType: string = buffer.subarray(0, 1).toString('utf8')
  console.assert(dataType !== CMD_COMPRESSED, "Compressed data shouldn't be decompressed before parsing")
  console.assert(dataType !== CMD_ROWSET_CHUNK, 'Chunked data should be parsed by parseRowsetChunks')

  let spaceIndex = buffer.indexOf(' ')
  if (spaceIndex === -1) {
    spaceIndex = buffer.length - 1
  }

  let commandEnd = -1
  if (dataType === CMD_INT || dataType === CMD_FLOAT || dataType === CMD_NULL) {
    commandEnd = spaceIndex + 1
  } else {
    const commandLength = parseInt(buffer.subarray(1, spaceIndex).toString())
    commandEnd = spaceIndex + 1 + commandLength
  }

  switch (dataType) {
    case CMD_INT:
      return popResults(parseInt(buffer.subarray(1, spaceIndex).toString()))
    case CMD_FLOAT:
      return popResults(parseFloat(buffer.subarray(1, spaceIndex).toString()))
    case CMD_NULL:
      return popResults(null)
    case CMD_STRING:
      return popResults(buffer.subarray(spaceIndex + 1, commandEnd).toString('utf8'))
    case CMD_ZEROSTRING:
      return popResults(buffer.subarray(spaceIndex + 1, commandEnd - 1).toString('utf8'))
    case CMD_COMMAND:
      return popResults(buffer.subarray(spaceIndex + 1, commandEnd).toString('utf8'))
    case CMD_JSON:
      return popResults(JSON.parse(buffer.subarray(spaceIndex + 1, commandEnd).toString('utf8')))
    case CMD_BLOB:
      return popResults(buffer.subarray(spaceIndex + 1, commandEnd))
    case CMD_ARRAY:
      return popResults(parseArray(buffer, spaceIndex))
    case CMD_ROWSET:
      return popResults(parseRowset(buffer, spaceIndex))
    case CMD_ERROR:
      parseError(buffer, spaceIndex) // throws custom error
      break
  }

  throw new TypeError(`Data type: ${dataType} is not defined in SCSP`)
}

/** Format a command to be sent via SCSP protocol */
function formatCommand(command: string): string {
  const commandLength = Buffer.byteLength(command, 'utf-8')
  return `+${commandLength} ${command}`
}

/** Messages going to the server are sometimes logged when error conditions occour and need to be stripped of user credentials  */
export function anonimizeCommand(message: string): string {
  // hide password in AUTH command if needed
  message = message.replace(/USER \S+/, 'USER ******')
  message = message.replace(/PASSWORD \S+?(?=;)/, 'PASSWORD ******')
  message = message.replace(/HASH \S+?(?=;)/, 'HASH ******')
  return message
}

/** Strip message code in error of user credentials */
export function anonimizeError(error: Error): Error {
  if (error?.message) {
    error.message = anonimizeCommand(error.message)
  }
  return error
}
