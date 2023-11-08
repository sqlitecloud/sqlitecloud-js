/**
 * protocol.ts - handles low level communication with sqlitecloud server
 */

import tls from 'tls'
import lz4 from 'lz4'

import { SQLiteCloudConfig } from './types/sqlitecloudconfig'

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

//
// exported classes
//

/* A set of rows returned by a query */
export class SQLiteCloudRowset {
  /* Create a new rowset object */
  constructor(parsedData: { version: number; numberOfRows: number; numberOfColumns: number; columnsNames: string[]; data: any[] }) {
    this._version = parsedData.version
    this._numberOfRows = parsedData.numberOfRows
    this._numberOfColumns = parsedData.numberOfColumns
    this._columnsNames = parsedData.columnsNames
    this._data = parsedData.data
  }

  private _version = 0
  private _numberOfRows = 0
  private _numberOfColumns = 0
  private _columnsNames: string[] = []
  private _data: any[] = []

  /**
   * Rowset version is 1 for a rowset with simple column names, 2 for extended metadata
   * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
   */
  get version(): number {
    return this._version
  }

  /** Number of rows in row set */
  get numberOfRows(): number {
    return this._numberOfRows
  }

  /** Number of columns in row set */
  get numberOfColumns(): number {
    return this._numberOfColumns
  }

  /** Array of columns names */
  get columnsNames(): string[] {
    return this._columnsNames
  }

  /** Return value of item at given row and column */
  getItem(row: number, column: number): any {
    if (row < 0 || row >= this._numberOfRows || column < 0 || column >= this._numberOfColumns) {
      throw new SQLiteCloudError(
        `This rowset has ${this._numberOfColumns} columns by ${this._numberOfRows} rows, requested column ${column} and row ${row} is invalid.`
      )
    }

    const item = this._data[row * this._numberOfColumns + column]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return parseData(item)
  }

  /* Dump values for diagnostic purposes */
  dump(): string[] {
    const rows = []
    for (let i = 0; i < this._numberOfRows; i++) {
      let row = '|'
      for (let j = 0; j < this._numberOfColumns; j++) {
        row = ` ${row}${this.getItem(i, j) as string} |`
      }
      rows.push(row)
    }
    return rows
  }
}

/**
 * SQLiteCloud low-level connection, will do messaging, handle socket, authentication, etc.
 */
export class SQLiteCloudConnection {
  /** Connection string if passed */
  _connectionString?: string
  /** Configuration passed by client or extracted from connection string */
  _config: SQLiteCloudConfig
  /** Currently opened tls socket used to communicated with SQLiteCloud server */
  _socket?: tls.TLSSocket

  /** Parse and validate provided connectionString or configuration */
  constructor(config: SQLiteCloudConfig | string) {
    if (typeof config === 'string') {
      this._config = this._validateConfiguration({ connectionString: config })
    } else {
      this._config = this._validateConfiguration(config)
    }
  }

  //
  // internal methods
  //

  /** Validate configuration, apply defaults, throw if something is missing or misconfigured */
  private _validateConfiguration(config: SQLiteCloudConfig): SQLiteCloudConfig {
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

    if (!config.username || !config.password || !config.host) {
      throw new SQLiteCloudError('The user, password and host arguments must be specified.', { errorCode: 'ERR_MISSING_ARGS' })
    }

    return config
  }

  /** Will log to console if verbose mode is enabled */
  private _log(message: string, ...optionalParams: any[]): void {
    if (this._config.verbose) {
      console.log(`${new Date().toISOString()} ${this._config.clientId as string}: ${message}`, ...optionalParams)
    }
  }

  //
  // public properties
  //

  /** True if connection is open */
  public get connected(): boolean {
    return this._socket !== undefined
  }

  /** Initialization commands sent to database when connection is established */
  public get initializationCommands(): string {
    // first user authentication, then all other commands
    const config = this._config
    let commands = `AUTH USER ${config.username || ''} ${config.passwordHashed ? 'HASH' : 'PASSWORD'} ${config.password || ''};`

    if (config.database) {
      if (config.createDatabase && !config.dbMemory) commands += `CREATE DATABASE ${config.database} IF NOT EXISTS;`
      commands += `USE DATABASE ${config.database};`
    }
    if (config.sqliteMode) {
      commands += 'SET CLIENT KEY SQLITE TO 1;'
    }
    if (config.compression) {
      commands += 'SET CLIENT KEY COMPRESSION TO 1;'
    }
    if (config.nonlinearizable) {
      commands += 'SET CLIENT KEY NONLINEARIZABLE TO 1;'
    }
    if (config.noBlob) {
      commands += 'SET CLIENT KEY NOBLOB TO 1;'
    }
    if (config.maxData) {
      commands += `SET CLIENT KEY MAXDATA TO ${config.maxData};`
    }
    if (config.maxRows) {
      commands += `SET CLIENT KEY MAXROWS TO ${config.maxRows};`
    }
    if (config.maxRowset) {
      commands += `SET CLIENT KEY MAXROWSET TO ${config.maxRowset};`
    }

    return commands
  }

  //
  // public methods
  //

  /** Enable verbose logging for debug purposes */
  public verbose(): void {
    this._config.verbose = true
  }

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  public async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // connect to tls socket, initialize connection, setup event handlers
      const client: tls.TLSSocket = tls.connect(this._config.port as number, this._config.host, this._config.tlsOptions, () => {
        if (client.authorized) {
          const commands = this.initializationCommands
          this._log('Connection initializing')

          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          this._socket = client

          this.sendCommands(commands).then(
            () => {
              this._log('Connection initialized')
              resolve()
            },
            error => {
              this._log('Error with initialization commands', error)
              reject(error)
            }
          )
        } else {
          this._log('Connection was not authorized', client.authorizationError)
          reject(new SQLiteCloudError('Connection was not authorized', { cause: client.authorizationError }))
        }
      })

      client.on('close', () => {
        if (this._socket) {
          // no loggin if already disposed
          this._log('Connection closed')
          this._socket.destroy()
          this._socket = undefined
        }
      })

      client.once('error', (error: any) => {
        this._log('Connection error', error)
        if (this._socket) {
          this._socket.destroy()
          this._socket = undefined
        }
        reject(new SQLiteCloudError('Connection error', { cause: error }))
      })
    })
  }

  /** Will send a command and return the resulting rowset or throw an error */
  public async sendCommands(commands: string): Promise<SQLiteCloudRowset> {
    if (!this._socket) {
      throw new SQLiteCloudError('Connection is not open')
    }

    // compose commands following SCPC protocol
    commands = formatCommand(commands)

    let buffer = Buffer.alloc(0)
    const rowsetChunkArray: Buffer[] = []
    this._log(`Sending: ${commands}`)

    // define the Promise that waits for the server response
    return new Promise((resolve, reject) => {
      // define what to do if an answer does not arrive within the set timeout
      let socketTimeout: number

      const readData = (data: Uint8Array) => {
        this._log(`Received: ${data.length > 100 ? data.toString().substring(0, 100) + '...' : data.toString()}`)

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
            //remove compressed size
            compressedBuffer = compressedBuffer.subarray(compressedBuffer.indexOf(' ') + 1, compressedBuffer.length)
            // remove decompressed size
            compressedBuffer = compressedBuffer.subarray(compressedBuffer.indexOf(' ') + 1, compressedBuffer.length)
            compressedDataType = compressedBuffer.subarray(0, 1).toString('utf8')
          }

          const hasReceivedEntireCommand = buffer.length - buffer.indexOf(' ') - 1 >= commandLength ? true : false
          if (hasReceivedEntireCommand) {
            if (dataType !== CMD_ROWSET_CHUNK && compressedDataType !== CMD_ROWSET_CHUNK) {
              this._socket?.off('data', readData)
              clearTimeout(socketTimeout)
              try {
                const parsedData = parseData(buffer)
                resolve(parsedData)
              } catch (error) {
                reject(error)
              }
            } else {
              // @ts-expect-error
              // check if rowset received the ending chunk
              if (data.subarray(data.indexOf(' ') + 1, data.length).toString() === '0 0 0 ') {
                clearTimeout(socketTimeout)
                try {
                  const parsedData = parseData(rowsetChunkArray)
                  resolve(parsedData)
                } catch (error) {
                  reject(error)
                }
              } else {
                // no ending string? ask server for another chunk
                rowsetChunkArray.push(buffer)
                buffer = Buffer.alloc(0)
                this._socket?.write(formatCommand('OK'))
              }
            }
          }
        } else {
          // command with no explicit len so make sure that the final character is a space
          const lastChar = buffer.subarray(buffer.length - 1, buffer.length).toString('utf8')
          if (lastChar == ' ') {
            this._socket?.off('data', readData)
            clearTimeout(socketTimeout)
            try {
              const parsedData = parseData(buffer)
              resolve(parsedData)
            } catch (error) {
              reject(error)
            }
          }
        }
      }

      this._socket?.write(commands, 'utf8', () => {
        socketTimeout = setTimeout(() => {
          this._socket?.off('data', readData)
          clearTimeout(socketTimeout)
          reject(new SQLiteCloudError('Request timed out', { cause: commands }))
        }, this._config.timeout)
        this._socket?.on('data', readData)
      })

      this._socket?.once('error', (error: any) => {
        this._log('Socket error', error)
        if (this._socket) {
          this._socket.destroy()
          this._socket = undefined
        }
        reject(new SQLiteCloudError('Connection on error event', { cause: error }))
      })
    })
  }

  /** Disconnect from server, release connection. */
  public async disconnect(): Promise<void> {
    return new Promise(resolve => {
      this._socket?.end(() => {
        this._socket?.destroy()
        this._socket = undefined
        this._log('Connection disconnected')
        resolve()
      })
    })
  }
}

/** Custom error reported by SQLiteCloud drivers */
export class SQLiteCloudError extends Error {
  constructor(message: string, args?: Partial<SQLiteCloudError>) {
    super(message)
    this.name = 'SQLiteCloudError'
    if (args) {
      Object.assign(this, args)
    }
  }

  /** Upstream error that cause this error */
  cause?: Error | string
  /** Error code returned by drivers or server */
  errorCode?: string
  /** Additional error code */
  externalErrorCode?: string
  /** Additional offset code in commands */
  offsetCode?: number
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
function parseArray(buffer: Buffer, spaceIndex: number): any[] {
  const parsedData = []

  const array = buffer.subarray(spaceIndex + 1, buffer.length)
  const numberOfItems = parseInt(array.subarray(0, spaceIndex - 2).toString('utf8'))
  let arrayItems = array.subarray(array.indexOf(' ') + 1, array.length)

  if (numberOfItems > 0) {
    for (let i = 0; i < numberOfItems; i++) {
      const dataType = arrayItems.subarray(0, 1).toString('utf8')
      const hasCommandLen = hasCommandLength(dataType)
      if (hasCommandLen) {
        const lenToRead = parseCommandLength(arrayItems)
        parsedData.push(parseData(arrayItems.subarray(0, arrayItems.indexOf(' ') + 1 + lenToRead)))
        arrayItems = arrayItems.subarray(arrayItems.indexOf(' ') + 1 + lenToRead, arrayItems.length)
      } else {
        parsedData.push(parseData(arrayItems.subarray(0, arrayItems.indexOf(' '))))
        arrayItems = arrayItems.subarray(arrayItems.indexOf(' ') + 1, arrayItems.length)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return parsedData
}

/** Parse a set of rows (no chunking) */
function parseRowset(buffer: Buffer, spaceIndex: number): SQLiteCloudRowset {
  let rowset = buffer.subarray(spaceIndex + 1, buffer.length)

  // extract rowset version
  const version = parseInt(rowset.subarray(rowset.indexOf(':') + 1, rowset.indexOf(' ') + 1).toString('utf8'))
  // extract rowset rows number
  rowset = rowset.subarray(rowset.indexOf(' ') + 1, rowset.length)
  const numberOfRows = parseInt(rowset.subarray(0, rowset.indexOf(' ') + 1).toString('utf8'))
  // extract rowset cols number
  rowset = rowset.subarray(rowset.indexOf(' ') + 1, rowset.length)
  const numberOfColumns = parseInt(rowset.subarray(0, rowset.indexOf(' ') + 1).toString('utf8'))

  // extract rowset data
  rowset = rowset.subarray(rowset.indexOf(' ') + 1, rowset.length)

  // extract columns names
  const columnsNames = []
  for (let i = 0; i < numberOfColumns; i++) {
    const commandLength = parseCommandLength(rowset)
    columnsNames.push(parseData(rowset.subarray(0, rowset.indexOf(' ') + 1 + commandLength)))
    rowset = rowset.subarray(rowset.indexOf(' ') + 1 + commandLength, rowset.length)
  }

  // extract each rowset item
  const data = []
  for (let j = 0; j < numberOfRows * numberOfColumns; j++) {
    const dataType = rowset.subarray(0, 1).toString('utf8')
    if (hasCommandLength(dataType)) {
      const commandLength = parseCommandLength(rowset)
      data.push(rowset.subarray(0, rowset.indexOf(' ') + 1 + commandLength))
      rowset = rowset.subarray(rowset.indexOf(' ') + 1 + commandLength, rowset.length)
    } else {
      data.push(rowset.subarray(0, rowset.indexOf(' ')))
      rowset = rowset.subarray(rowset.indexOf(' ') + 1, rowset.length)
    }
  }

  return new SQLiteCloudRowset({
    version,
    numberOfRows,
    numberOfColumns,
    columnsNames,
    data
  })
}

/** Parse a rowset that is split in multiple chunks */
function parseRowsetChunks(buffer: Buffer[], spaceIndex: number) {
  let version = 1
  let numberOfRows = 0
  let numberOfColumns = 0
  const columnsNames = []
  const data = []

  for (let i = 0; i < buffer.length; i++) {
    let rowset = buffer[i]
    spaceIndex = rowset.indexOf(' ')
    rowset = rowset.subarray(spaceIndex + 1, rowset.length)

    const chunkIndex = parseInt(rowset.subarray(0, rowset.indexOf(' ')).toString('utf8'))
    version = parseInt(rowset.subarray(rowset.indexOf(':') + 1, rowset.indexOf(' ')).toString('utf8'))
    rowset = rowset.subarray(rowset.indexOf(' ') + 1, rowset.length)

    const nRowsSingleChunk = parseInt(rowset.subarray(0, rowset.indexOf(' ') + 1).toString('utf8'))
    numberOfRows = numberOfRows + nRowsSingleChunk
    rowset = rowset.subarray(rowset.indexOf(' ') + 1, rowset.length)

    numberOfColumns = parseInt(rowset.subarray(0, rowset.indexOf(' ') + 1).toString('utf8'))
    rowset = rowset.subarray(rowset.indexOf(' ') + 1, rowset.length)

    if (chunkIndex === 1) {
      // extract columns names
      for (let j = 0; j < numberOfColumns; j++) {
        const commandLength = parseCommandLength(rowset)
        columnsNames.push(parseData(rowset.subarray(0, rowset.indexOf(' ') + 1 + commandLength)))
        rowset = rowset.subarray(rowset.indexOf(' ') + 1 + commandLength, rowset.length)
      }
    }

    // extract single rowset row
    for (let k = 0; k < nRowsSingleChunk * numberOfColumns; k++) {
      const dataType = rowset.subarray(0, 1).toString('utf8')
      const hasCommandLen = hasCommandLength(dataType)
      if (hasCommandLen) {
        const lenToRead = parseCommandLength(rowset)
        data.push(rowset.subarray(0, rowset.indexOf(' ') + 1 + lenToRead))
        rowset = rowset.subarray(rowset.indexOf(' ') + 1 + lenToRead, rowset.length)
      } else {
        data.push(rowset.subarray(0, rowset.indexOf(' ')))
        rowset = rowset.subarray(rowset.indexOf(' ') + 1, rowset.length)
      }
    }
  }

  return new SQLiteCloudRowset({
    version,
    numberOfRows,
    numberOfColumns,
    columnsNames,
    data
  })
}

/* Receives a buffer or array of buffers and parses it based on dataType at beginning of block */
function parseData(data: Buffer | Buffer[]): any {
  // buffer is really an array of buffers? eg. chunked response
  const chunksBuffers: Buffer[] | undefined = Array.isArray(data) ? data : undefined
  let buffer: Buffer | undefined = data as Buffer

  // first character is the data type
  let dataType: string = chunksBuffers ? chunksBuffers[0].subarray(0, 1).toString('utf8') : buffer.subarray(0, 1).toString('utf8')
  let spaceIndex = buffer.indexOf(' ')

  // need to decompress data?
  if (dataType === CMD_COMPRESSED) {
    if (chunksBuffers) {
      for (let i = 0; i < buffer.length; i++) {
        const decompressionResult = decompressBuffer(chunksBuffers[i])
        chunksBuffers[i] = decompressionResult.buffer
        dataType = decompressionResult.dataType
      }
    } else {
      const decompressionResult = decompressBuffer(buffer)
      buffer = decompressionResult.buffer
      dataType = decompressionResult.dataType
      spaceIndex = buffer.indexOf(' ')
    }
  }

  switch (dataType) {
    case CMD_INT:
      return parseInt(buffer.subarray(1, buffer.length - 1).toString('utf8'))
    case CMD_FLOAT:
      return parseFloat(buffer.subarray(1, buffer.length - 1).toString('utf8'))
    case CMD_NULL:
      return null
    case CMD_STRING:
      return buffer.subarray(spaceIndex + 1, buffer.length).toString('utf8')
    case CMD_ZEROSTRING:
      return buffer.subarray(spaceIndex + 1, buffer.length - 1).toString('utf8')
    case CMD_COMMAND:
      return buffer.subarray(spaceIndex + 1, buffer.length).toString('utf8')
    case CMD_JSON:
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(buffer.subarray(spaceIndex + 1, buffer.length).toString('utf8'))
    case CMD_BLOB:
      return buffer.subarray(spaceIndex + 1, buffer.length)
    case CMD_ARRAY:
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return parseArray(buffer, spaceIndex)
    case CMD_ROWSET:
      return parseRowset(buffer, spaceIndex)
    case CMD_ROWSET_CHUNK:
      console.assert(chunksBuffers !== undefined)
      return parseRowsetChunks(chunksBuffers as Buffer[], spaceIndex)

    case CMD_ERROR:
      // will throw custom error
      parseError(buffer, spaceIndex)
      break

    default:
      throw new TypeError(`Data type: ${dataType} is not defined in SCSP`)
  }
}

/** Parse connectionString like sqlitecloud://usernam:password@host:port/database?option1=xxx&option2=xxx into its components */
export function parseConnectionString(connectionString: string): SQLiteCloudConfig {
  try {
    // The URL constructor throws a TypeError if the URL is not valid.
    const url = new URL(connectionString)
    const database = url.pathname.replace('/', '') // pathname is database name, remove the leading slash
    const options: { [key: string]: string } = {}

    url.searchParams.forEach((value, key) => {
      options[key] = value
    })

    return {
      username: url.username,
      password: url.password,
      host: url.hostname,
      port: url.port ? parseInt(url.port) : undefined,
      database,
      ...options
    }
  } catch (error) {
    throw new SQLiteCloudError(`Invalid connection string: ${connectionString}`)
  }
}

/** Format a command to be sent via SCSP protocol */
function formatCommand(command: string): string {
  const commandLength = Buffer.byteLength(command, 'utf-8')
  return `+${commandLength} ${command}`
}
