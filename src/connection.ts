/**
 * connection.ts - handles low level communication with sqlitecloud server
 */

import tls from 'tls'
import lz4 from 'lz4'

import { SQLiteCloudConfig, SQLCloudRowsetMetadata, SQLiteCloudError, SQLiteCloudDataTypes } from './types'
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

/** SQLiteCloud low-level connection, will do messaging, handle socket, authentication, etc. */
export class SQLiteCloudConnection {
  /** Parse and validate provided connectionString or configuration */
  constructor(config: SQLiteCloudConfig | string) {
    if (typeof config === 'string') {
      this.config = this.validateConfiguration({ connectionString: config })
    } else {
      this.config = this.validateConfiguration(config)
    }
  }

  /** Configuration passed by client or extracted from connection string */
  private config: SQLiteCloudConfig

  /** Currently opened tls socket used to communicated with SQLiteCloud server */
  private socket?: tls.TLSSocket

  /** Operations are serialized by waiting an any pending promises */
  private pending?: Promise<any>

  //
  // public properties
  //

  /** True if connection is open */
  public get connected(): boolean {
    return this.socket !== undefined
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
      // hide password in AUTH command if needed
      message = message.replace(/PASSWORD \S+?(?=;)/, 'PASSWORD ******')
      message = message.replace(/HASH \S+?(?=;)/, 'HASH ******')
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

  //
  // public methods
  //

  /** Enable verbose logging for debug purposes */
  public verbose(): void {
    this.config.verbose = true
  }

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  public async connect(): Promise<void> {
    let client: tls.TLSSocket

    const promise = new Promise<void>((resolve, reject) => {
      // connect to tls socket, initialize connection, setup event handlers
      client = tls.connect(this.config.port as number, this.config.host, this.config.tlsOptions, () => {
        if (client.authorized) {
          this.log('Connection initializing')
          const commands = this.initializationCommands
          this.socket = client

          this.sendCommands(commands).then(
            () => {
              this.log('Connection initialized')
              resolve()
            },
            error => {
              this.log('Error with initialization commands', error)
              reject(error)
            }
          )
        } else {
          this.log('Connection was not authorized', client.authorizationError)
          reject(new SQLiteCloudError('Connection was not authorized', { cause: client.authorizationError }))
        }
      })

      client.on('close', () => {
        if (this.socket) {
          // no loggin if already disposed
          this.log('Connection closed')
          this.socket.destroy()
          this.socket = undefined
        }
      })

      client.once('error', (error: any) => {
        this.log('Connection error', error)
        if (this.socket) {
          this.socket.destroy()
          this.socket = undefined
        }
        reject(new SQLiteCloudError('Connection error', { cause: error }))
      })
    })

    promise.finally(() => {
      if (client) {
        client.removeAllListeners('error')
      }
    })

    return promise
  }

  /** Will send a command and return the resulting rowset or result or throw an error */
  public async sendCommands<T = SQLiteCloudRowset>(commands: string): Promise<T> {
    // connection needs to be established?
    if (this.socket === undefined) {
      await this.connect()
    }

    // serialize commands by waiting on any other pending operations
    if (this.pending) {
      await this.pending
    }

    // compose commands following SCPC protocol
    commands = formatCommand(commands)

    let buffer = Buffer.alloc(0)
    const rowsetChunks: Buffer[] = []
    this.log(`Sending: ${commands}`)

    // define what to do if an answer does not arrive within the set timeout
    let socketTimeout: number

    // define the Promise that waits for the server response
    this.pending = new Promise<T>((resolve, reject) => {
      const readData = (data: Uint8Array) => {
        this.log(`Received: ${data.length > 100 ? data.toString().substring(0, 100) + '...' : data.toString()}`)
        try {
          // on first ondata event, dataType is read from data, on subsequent ondata event, is read from buffer that is the concatanations of data received on each ondata event
          const dataType = buffer.length === 0 ? data.subarray(0, 1).toString() : buffer.subarray(0, 1).toString('utf8')
          buffer = Buffer.concat([buffer, data])
          const commandLength = hasCommandLength(dataType)

          if (commandLength) {
            const commandLength = parseCommandLength(buffer)

            // in case of compressed data, extract the dataType of compressed data
            let compressedDataType = null
            if (dataType === CMD_COMPRESSED) {
              // remove LEN
              let compressedBuffer = buffer.subarray(buffer.indexOf(' ') + 1, buffer.length)
              // remove compressed size
              compressedBuffer = compressedBuffer.subarray(compressedBuffer.indexOf(' ') + 1, compressedBuffer.length)
              // remove decompressed size
              compressedBuffer = compressedBuffer.subarray(compressedBuffer.indexOf(' ') + 1, compressedBuffer.length)
              compressedDataType = compressedBuffer.subarray(0, 1).toString('utf8')
            }

            const hasReceivedEntireCommand = buffer.length - buffer.indexOf(' ') - 1 >= commandLength ? true : false
            if (hasReceivedEntireCommand) {
              if (dataType !== CMD_ROWSET_CHUNK && compressedDataType !== CMD_ROWSET_CHUNK) {
                this.socket?.off('data', readData)
                clearTimeout(socketTimeout)
                const { data } = popData(buffer)
                resolve(data as T)
              } else {
                // @ts-expect-error
                // check if rowset received the ending chunk
                if (data.subarray(data.indexOf(' ') + 1, data.length).toString() === '0 0 0 ') {
                  clearTimeout(socketTimeout)
                  const parsedData = parseRowsetChunks(rowsetChunks)
                  resolve(parsedData as T)
                } else {
                  // no ending string? ask server for another chunk
                  rowsetChunks.push(buffer)
                  buffer = Buffer.alloc(0)
                  this.socket?.write(formatCommand('OK'))
                }
              }
            }
          } else {
            // command with no explicit len so make sure that the final character is a space
            const lastChar = buffer.subarray(buffer.length - 1, buffer.length).toString('utf8')
            if (lastChar == ' ') {
              const { data } = popData(buffer)
              resolve(data as T)
            }
          }
        } catch (error) {
          this.close()
          reject(error)
        }
      }

      this.socket?.write(commands, 'utf8', () => {
        socketTimeout = setTimeout(() => {
          reject(new SQLiteCloudError('Request timed out', { cause: commands }))
        }, this.config.timeout)
        this.socket?.on('data', readData)
      })

      this.socket?.once('error', (error: any) => {
        this.log('Socket error', error)
        this.close()
        reject(new SQLiteCloudError('Connection on error event', { cause: error }))
      })
    })

    this.pending.finally(() => {
      clearTimeout(socketTimeout)
      if (this.socket) {
        this.socket.removeAllListeners('data')
        this.socket.removeAllListeners('error')
      }
      this.pending = undefined
    })

    return this.pending
  }

  /** Disconnect from server, release connection. */
  public close() {
    if (this.socket) {
      this.socket.destroy()
    }
    this.socket = undefined
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
  buffer = buffer.subarray(spaceIndex + 1, buffer.length)

  // extract compressed size
  const compressedSize = parseInt(buffer.subarray(0, buffer.indexOf(' ') + 1).toString('utf8'))
  buffer = buffer.subarray(buffer.indexOf(' ') + 1, buffer.length)

  // extract decompressed size
  const decompressedSize = parseInt(buffer.subarray(0, buffer.indexOf(' ') + 1).toString('utf8'))
  buffer = buffer.subarray(buffer.indexOf(' ') + 1, buffer.length)

  // extract compressed dataType
  const dataType = buffer.subarray(0, 1).toString('utf8')
  const decompressedBuffer = Buffer.alloc(decompressedSize)
  const decompressionResult = lz4.decodeBlock(buffer.subarray(buffer.length - compressedSize, buffer.length), decompressedBuffer)
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
    let buffer = buffers[i]
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

  return new SQLiteCloudRowset(metadata, data)
}

/** Pop one or more space separated integers from beginning of buffer, move buffer forward */
function popIntegers(buffer: Buffer, numberOfIntegers: number = 1): { data: number[]; fwdBuffer: Buffer } {
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
  let dataType: string = buffer.subarray(0, 1).toString('utf8')

  // need to decompress this buffer before decoding?
  if (dataType === CMD_COMPRESSED) {
    ;({ buffer, dataType } = decompressBuffer(buffer))
  }

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
    case CMD_ROWSET_CHUNK:
      console.assert(false)
      break
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
