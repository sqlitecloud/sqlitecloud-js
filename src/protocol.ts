/**
 * protocol.ts - handles low level communication with the server
 * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
 */

import tls from 'tls'
import lz4 from 'lz4'

// defined in https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
const CMD_STRING = '+'
const CMD_ZEROSTRING = '!'
const CMD_ERROR = '-'
const CMD_INT = ':'
const CMD_FLOAT = ','
const CMD_ROWSET = '*'
const CMD_ROWSET_CHUNK = '/'
const CMD_JSON = '#'
// const CMD_RAWJSON = '{'
const CMD_NULL = '_'
const CMD_BLOB = '$'
const CMD_COMPRESSED = '%'
// const CMD_PUBSUB = '|'
const CMD_COMMAND = '^'
// const CMD_RECONNECT = '@'
const CMD_ARRAY = '='

//
// utility functions
//

function logThis(id = 'SQLiteCloud', msg: string): void {
  console.log(`!!!!!!!!! ${id}: ${new Date().toISOString()} - ${msg}`)
}

/* Receives the complete buffer and parses it based on dataType at beginning of block */
function parseData(buffer: Buffer): any {
  // buffer is really an array of buffers? eg. chunked response
  const chunksBuffers: Buffer[] | undefined = Array.isArray(buffer) ? (buffer as Buffer[]) : undefined

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

  _version = 0
  _numberOfRows = 0
  _numberOfColumns = 0
  _columnsNames: string[] = []
  _data: any[] = []

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

  /** Return value of item at given row and column */
  getItem(row: number, column: number): any {
    if (row < 0 || row >= this._numberOfRows || column < 0 || column >= this._numberOfColumns) {
      throw new SQLiteCloudError(
        `This rowset has ${this._numberOfColumns} columns by ${this._numberOfRows} rows. Requested column ${column} and row ${row} is invalid.`
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

/* SQLiteCloud class */
export default class SQLiteCloud {
  /* PRIVATE PROPERTIES */
  /* tls client */

  _socket?: tls.TLSSocket

  /** Client name used to log events */
  #clientId = ''
  /* tls options */

  #host?: string

  #port = 9960

  #tlsOptions = {}

  #user?: string
  #password?: string

  /** Commands sent during authentication. The first command is always the auth command. The following commands are custom configurations. */
  #initCommands?: string

  /*
  incoming data could arrive on multiple ondata event. 
  so is necessary to concatenate them
  */

  /* Time before a query call will timeout */
  #queryTimeout = 300000

  /* 
  #debug_sdk 
  */
  #debug_sdk = false

  /* CONSTRUCTOR */
  /*
  SQLiteCloud class constructor receives:
    - config = {
        clientId: string, // optional identifier
        user: string, //required unless connectionString is provided
        password: string, //required unless connectionString is provided
        passwordHashed: boolean, //optional true if password is hashed, default is false
        host: string, //required unless connectionString is provided
        port: number, //required unless connectionString is provided
        connectionString: string, //required unless user, password, host, port are provided
        tlsOptions: any, //optional passed directly to node.TLSSocket, supports all tls.connect options
        queryTimeout: number, //optional number of milliseconds before a query call will timeout, default is 300sec
        database: string, // TODOOO
        dbCreate: boolean, // TODOOO
        dbMemory: boolean, // TODOOO
        sqliteMode: boolean, // TODOOO
        compression: boolean, // TODOOO
        zeroText: boolean, // TODOOO
        nonlinearizable: boolean, // TODOOO
        noBlob: boolean, // TODOOO
        maxData: integer, // TODOOO
        maxRows: integer, // TODOOO
        maxRowset: integer, // TODOOO
        //statement_timeout?: number, // number of milliseconds before a statement in query will time out, default is no timeout
        //application_name?: string, // The name of the application that created this Client instance
        //connectionTimeoutMillis?: number, // number of milliseconds to wait for connection, default is no timeout
        //idle_in_transaction_session_timeout?: number // number of milliseconds before terminating any session with an open idle transaction, default is no timeout
      }
    - debug_sdk
  */
  constructor(
    config: {
      clientId: any
      user: any
      password: any
      host: any
      port: any
      compression: any
      queryTimeout: any
      tlsOptions: any
      connectionString?: any
      passwordHashed?: any
      database?: any
      dbCreate?: any
      dbMemory?: any
      sqliteMode?: any
      zeroText?: any
      nonlinearizable?: any
      noBlob?: any
      maxData?: any
      maxRows?: any
      maxRowset?: any
    },
    debug_sdk = false
  ) {
    this.#debug_sdk = debug_sdk
    this.#clientId = config.clientId
    if (config.connectionString) {
      //TODOO exctract from connectionString tls options
    } else {
      this.#host = config.host
      this.#port = config.port
      this.#tlsOptions = config.tlsOptions ? config.tlsOptions : {}
      this.#user = config.user
      this.#password = config.password
      //start building the initial commands sent after the creation of the tls connection
      this.#initCommands = `AUTH USER ${this.#user} ${config.passwordHashed ? 'HASH' : 'PASSWORD'} ${this.#password};`
      if (config.database) {
        if (config.dbCreate && !config.dbMemory) this.#initCommands += `CREATE DATABASE ${config.database} IF NOT EXISTS;`
        this.#initCommands += `USE DATABASE ${config.database};`
      }
      if (config.sqliteMode) {
        this.#initCommands += 'SET CLIENT KEY SQLITE TO 1;'
      }
      if (config.compression) {
        this.#initCommands += 'SET CLIENT KEY COMPRESSION TO 1;'
      }
      if (config.zeroText) {
        this.#initCommands += 'SET CLIENT KEY ZEROTEXT TO 1;'
      }
      if (config.nonlinearizable) {
        this.#initCommands += 'SET CLIENT KEY NONLINEARIZABLE TO 1;'
      }
      if (config.noBlob) {
        this.#initCommands += 'SET CLIENT KEY NOBLOB TO 1;'
      }
      if (config.maxData) {
        this.#initCommands += `SET CLIENT KEY MAXDATA TO ${maxData};`
      }
      if (config.maxRows) {
        this.#initCommands += `SET CLIENT KEY MAXROWS TO ${maxRows};`
      }
      if (config.maxRowset) {
        this.#initCommands += `SET CLIENT KEY MAXROWSET TO ${maxRowset};`
      }
    }
    //set custom queryTimeout if provided by the user
    if (config.queryTimeout) {
      this.#queryTimeout = config.queryTimeout
    }
  }
  /*
  COMPOSE SCSP PROTOCOL
  */
  #composeScspStrings(str: string | NodeJS.ArrayBufferView | ArrayBuffer | SharedArrayBuffer) {
    const strLen = Buffer.byteLength(str, 'utf-8')
    return `+${strLen} ${str}`
  }
  /*
  check if all bytes have been received
  */
  #receivedAllBytes(buffer: string | string[], lenToRead: number) {
    return buffer.length - buffer.indexOf(' ') - 1 == lenToRead ? true : false
  }
  /*
  connect method is called to open a tls connection 
  right after being authorized sends the auth command 
  and the configurations commands setted by the user
  */
  connect() {
    return new Promise((resolve, reject) => {
      //before connecting check if auth credential have been provided
      if (!this.#user || !this.#password) {
        const authError = new TypeError('The "config.user" or "config.password" argument must be specified')
        authError.code = 'ERR_MISSING_ARGS'
        reject(authError)
      }
      //before connecting check if queryTimeout value is valid
      if (this.#queryTimeout) {
        let timeoutError
        if (typeof this.#queryTimeout !== 'number') {
          timeoutError = new TypeError('The "config.queryTimeout" must be one of type number. Received ' + typeof this.#queryTimeout)
          timeoutError.code = 'ERR_INVALID_ARG_TYPE'
        } else if (this.#queryTimeout < 0) {
          timeoutError = new RangeError('The "config.queryTimeout" must be greater then 0. Received ' + this.#queryTimeout)
          timeoutError.code = 'ERR_INVALID_ARG_RANGE'
        }
        if (timeoutError) reject(timeoutError)
      }
      //try to connect

      const client: tls.TLSSocket = tls.connect(this.#port, this.#host, this.#tlsOptions, async () => {
        if (client.authorized) {
          if (this.#debug_sdk) logThis(this.#clientId, 'connection authorized')
          if (this.#debug_sdk) logThis(this.#clientId, 'sending init commands: ' + this.#initCommands)
          try {
            this._socket = client
            const response = await this.sendCommands(this.#initCommands)
            resolve(response)
          } catch (error) {
            logThis(this.#clientId, 'initCommandsResponse error')
            reject(error)
          }
        } else {
          if (this.#debug_sdk) logThis(this.#clientId, 'connection NOT authorized')
          reject(new Error('Connection NOT authorized', { cause: client.authorizationError }))
        }
      })

      client.on('close', () => {
        if (this.#debug_sdk) logThis(this.#clientId, 'connection closed')
      })

      client.on('end', () => {
        if (this._socket) {
          if (this.#debug_sdk) logThis(this.#clientId, 'end connection')
        }
      })

      client.once('error', (error: any) => {
        if (this.#debug_sdk) logThis(this.#clientId, 'received error')
        if (this.#debug_sdk) console.log(error)
        client.destroy()
        reject(new Error('Connection on error event', { cause: error }))
      })
    })
  }

  async disconnect(): Promise<void> {
    return new Promise(resolve => {
      this._socket?.end(() => {
        if (this.#debug_sdk) logThis(this.#clientId, 'closing connection')
        resolve()
      })
    })
  }

  async disconnectNEW(): Promise<void> {
    if (this._socket) {
      return new Promise(resolve => {
        this._socket?.once('end', resolve)
        this._socket?.end()
      })
    }
  }

  /*
  method send commands to the server creating a Promise that 
  - resolve when all data  have been received and parsed accordingly to SCSP protocol
  - reject when timeout is reached
  */
  sendCommands(commands: string): Promise<SQLiteCloudRowset> {
    //compose commands following SCPC protocol
    commands = this.#composeScspStrings(commands)
    //commands is sent to the server
    let buffer = Buffer.alloc(0) //variable where all received data are concatenated
    //dedicated variable to rowset_chunk data type
    const rowsetChunkArray: Buffer[] = [] //used only in case of rowset_chunk datatype to store all received chunk avoiding buffer copy
    if (this.#debug_sdk) logThis(this.#clientId, 'recevied new command to be sent: ' + commands)
    //define the Promise that waits for the server response
    return new Promise((resolve, reject) => {
      //define what to do if an answer does not arrive within the set timeout
      let readDataTimeout: NodeJS.Timeout
      const readData = (data: string | Uint8Array) => {
        if (this.#debug_sdk) logThis(this.#clientId, 'onData event: ' + data)
        //on first ondata event, dataType is read from data, on subsequent ondata event, is read from buffer that is the concatanations of data received on each ondata event
        const dataType = buffer.length === 0 ? data.subarray(0, 1).toString('utf8') : buffer.subarray(0, 1).toString('utf8')
        buffer = Buffer.concat([buffer, data])
        const hasCommandLen = hasCommandLength(dataType)
        if (this.#debug_sdk) logThis(this.#clientId, 'New data has command LEN? ' + hasCommandLen)
        if (hasCommandLen) {
          let lenToRead
          lenToRead = parseCommandLength(buffer)
          if (this.#debug_sdk) logThis(this.#clientId, 'Reading new data with LEN: ' + lenToRead)
          //in case of compressed data, extract the dataType of compressed data
          if (dataType === CMD_COMPRESSED) {
            //remove LEN
            let compressedBuffer = buffer.subarray(buffer.indexOf(' ') + 1, buffer.length)
            //remove compressed size
            compressedBuffer = compressedBuffer.subarray(compressedBuffer.indexOf(' ') + 1, compressedBuffer.length)
            //remove uncompressed size
            compressedBuffer = compressedBuffer.subarray(compressedBuffer.indexOf(' ') + 1, compressedBuffer.length)
            var compressedDataType = compressedBuffer.subarray(0, 1).toString('utf8')
          }
          if (this.#receivedAllBytes(buffer, lenToRead)) {
            if (dataType !== CMD_ROWSET_CHUNK && compressedDataType !== CMD_ROWSET_CHUNK) {
              this._socket.off('data', readData)
              clearTimeout(readDataTimeout)
              try {
                const parsedData = parseData(buffer)
                resolve(parsedData)
              } catch (error) {
                reject(error)
              }
            } else {
              //check if in case of chunk rowset has been received the ending chunk
              if (data.subarray(data.indexOf(' ') + 1, data.length).toString('utf8') === '0 0 0 ') {
                clearTimeout(readDataTimeout)
                try {
                  const parsedData = parseData(rowsetChunkArray)
                  resolve(parsedData)
                } catch (error) {
                  reject(error)
                }
              } else {
                //when not received the ending chunk ask server for another chunk
                rowsetChunkArray.push(buffer)
                buffer = Buffer.alloc(0)
                this._socket.write(this.#composeScspStrings('OK'))
              }
            }
          }
        } else {
          // it is a command with no explicit len
          // so make sure that the final character is a space
          const lastChr = buffer.subarray(buffer.length - 1, buffer.length).toString('utf8')
          if (this.#debug_sdk) logThis(this.#clientId, 'Reading new data without command LEN')
          if (lastChr == ' ') {
            if (this.#debug_sdk) logThis(this.#clientId, 'Reading complete, endining with space')
            //quando faccio il parsing mi passo il tipo, la lunghezza, e il buffer
            this._socket.off('data', readData)
            clearTimeout(readDataTimeout)
            try {
              const parsedData = parseData(buffer)
              resolve(parsedData)
            } catch (error) {
              reject(error)
            }
          }
        }
      }
      this._socket.write(commands, 'utf8', () => {
        readDataTimeout = setTimeout(() => {
          this._socket.off('data', readData)
          clearTimeout(readDataTimeout)
          reject(new Error('Request timed out', { cause: commands }))
        }, this.#queryTimeout)
        this._socket.on('data', readData)
      })
      this._socket.once('error', (error: any) => {
        if (this.#debug_sdk) logThis(this.#clientId, 'received error')
        if (this.#debug_sdk) console.log(error)
        client.destroy()
        reject(new Error('Connection on error event', { cause: error }))
      })
    })
  }
}

/** Custom error reported by SCSP protocol */
export class SQLiteCloudError extends Error {
  errorCode?: number
  externalErrorCode?: number
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

  // Create an Error object and add the custom properties
  const scspError = new SQLiteCloudError(errorMessage)
  scspError.errorCode = errorCode
  scspError.externalErrorCode = extErrCode
  scspError.offsetCode = offsetCode

  // Throw the custom error
  throw scspError
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
    const lenToRead = parseCommandLength(rowset)
    columnsNames.push(parseData(rowset.subarray(0, rowset.indexOf(' ') + 1 + lenToRead)))
    rowset = rowset.subarray(rowset.indexOf(' ') + 1 + lenToRead, rowset.length)
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
        const lenToRead = parseCommandLength(rowset)
        columnsNames.push(parseData(rowset.subarray(0, rowset.indexOf(' ') + 1 + lenToRead)))
        rowset = rowset.subarray(rowset.indexOf(' ') + 1 + lenToRead, rowset.length)
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
