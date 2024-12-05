//
// protocol.ts - low level protocol handling for SQLiteCloud transport
//

import { SQLiteCloudCommand, SQLiteCloudError, type SQLCloudRowsetMetadata, type SQLiteCloudDataTypes } from './types'
import { SQLiteCloudRowset } from './rowset'

// explicitly importing buffer library to allow cross-platform support by replacing it
import { Buffer } from 'buffer'

// https://www.npmjs.com/package/lz4js
const lz4 = require('lz4js')

// The server communicates with clients via commands defined in
// SQLiteCloud Server Protocol (SCSP), see more at:
// https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md

export const CMD_STRING = '+'
export const CMD_ZEROSTRING = '!'
export const CMD_ERROR = '-'
export const CMD_INT = ':'
export const CMD_FLOAT = ','
export const CMD_ROWSET = '*'
export const CMD_ROWSET_CHUNK = '/'
export const CMD_JSON = '#'
export const CMD_NULL = '_'
export const CMD_BLOB = '$'
export const CMD_COMPRESSED = '%'
export const CMD_COMMAND = '^'
export const CMD_ARRAY = '='
// const CMD_RAWJSON = '{'
export const CMD_PUBSUB = '|'
// const CMD_RECONNECT = '@'

// To mark the end of the Rowset, the special string /LEN 0 0 0   is sent (LEN is always 6 in this case)
// https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md#scsp-rowset-chunk
export const ROWSET_CHUNKS_END = '/6 0 0 0 '

//
// utility functions
//

/** Analyze first character to check if corresponding data type has LEN */
export function hasCommandLength(firstCharacter: string): boolean {
  return firstCharacter == CMD_INT || firstCharacter == CMD_FLOAT || firstCharacter == CMD_NULL ? false : true
}

/** Analyze a command with explict LEN and extract it */
export function parseCommandLength(data: Buffer): number {
  return parseInt(data.subarray(1, data.indexOf(' ')).toString('utf8'))
}

/** Receive a compressed buffer, decompress with lz4, return buffer and datatype */
export function decompressBuffer(buffer: Buffer): { buffer: Buffer; dataType: string; remainingBuffer: Buffer } {
  // https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md#scsp-compression
  // jest test/database.test.ts -t "select large result set"

  // starts with %<commandLength> <compressed> <uncompressed>
  const spaceIndex = buffer.indexOf(' ')
  const commandLength = parseInt(buffer.subarray(1, spaceIndex).toString('utf8'))

  let commandBuffer = buffer.subarray(spaceIndex + 1, spaceIndex + 1 + commandLength)
  const remainingBuffer = buffer.subarray(spaceIndex + 1 + commandLength)

  // extract compressed + decompressed  size
  const compressedSize = parseInt(commandBuffer.subarray(0, commandBuffer.indexOf(' ') + 1).toString('utf8'))
  commandBuffer = commandBuffer.subarray(commandBuffer.indexOf(' ') + 1)
  const decompressedSize = parseInt(commandBuffer.subarray(0, commandBuffer.indexOf(' ') + 1).toString('utf8'))
  commandBuffer = commandBuffer.subarray(commandBuffer.indexOf(' ') + 1)

  // extract compressed dataType
  const dataType = commandBuffer.subarray(0, 1).toString('utf8')
  let decompressedBuffer = Buffer.alloc(decompressedSize)
  const compressedBuffer = commandBuffer.subarray(commandBuffer.length - compressedSize)

  // lz4js library is javascript and doesn't have types so we silence the type check
  // eslint-disable-next-line
  const decompressionResult: number = lz4.decompressBlock(compressedBuffer, decompressedBuffer, 0, compressedSize, 0)
  // the entire command is composed of the header (which is not compressed) + the decompressed block
  decompressedBuffer = Buffer.concat([commandBuffer.subarray(0, commandBuffer.length - compressedSize), decompressedBuffer])

  if (decompressionResult <= 0 || decompressionResult !== decompressedSize) {
    throw new Error(`lz4 decompression error at offset ${decompressionResult}`)
  }

  return { buffer: decompressedBuffer, dataType, remainingBuffer }
}

/** Parse error message or extended error message */
export function parseError(buffer: Buffer, spaceIndex: number): never {
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
export function parseArray(buffer: Buffer, spaceIndex: number): SQLiteCloudDataTypes[] {
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
export function parseRowsetHeader(buffer: Buffer): { index: number; metadata: SQLCloudRowsetMetadata; fwdBuffer: Buffer } {
  const index = parseInt(buffer.subarray(0, buffer.indexOf(':') + 1).toString())
  buffer = buffer.subarray(buffer.indexOf(':') + 1)

  // extract rowset header
  const { data, fwdBuffer } = popIntegers(buffer, 3)

  const result = {
    index,
    metadata: {
      version: data[0],
      numberOfRows: data[1],
      numberOfColumns: data[2],
      columns: []
    },
    fwdBuffer
  }

  // console.debug(`parseRowsetHeader`, result)
  return result
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

    for (let i = 0; i < metadata.numberOfColumns; i++) metadata.columns[i].notNull = popForward() as number
    for (let i = 0; i < metadata.numberOfColumns; i++) metadata.columns[i].primaryKey = popForward() as number
    for (let i = 0; i < metadata.numberOfColumns; i++) metadata.columns[i].autoIncrement = popForward() as number
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

export function bufferStartsWith(buffer: Buffer, prefix: string): boolean {
  return buffer.length >= prefix.length && buffer.subarray(0, prefix.length).toString('utf8') === prefix
}

export function bufferEndsWith(buffer: Buffer, suffix: string): boolean {
  return buffer.length >= suffix.length && buffer.subarray(buffer.length - suffix.length, buffer.length).toString('utf8') === suffix
}

/**
 * Parse a chunk of a chunked rowset command, eg:
 * *LEN 0:VERS NROWS NCOLS DATA
 * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md#scsp-rowset-chunk
 */
export function parseRowsetChunks(buffers: Buffer[]): SQLiteCloudRowset {
  let buffer = Buffer.concat(buffers)
  if (!bufferStartsWith(buffer, CMD_ROWSET_CHUNK) || !bufferEndsWith(buffer, ROWSET_CHUNKS_END)) {
    throw new Error('SQLiteCloudConnection.parseRowsetChunks - invalid chunks buffer')
  }

  let metadata: SQLCloudRowsetMetadata = { version: 1, numberOfColumns: 0, numberOfRows: 0, columns: [] }
  const data: any[] = []

  // validate and skip data type
  const dataType = buffer.subarray(0, 1).toString()
  if (dataType !== CMD_ROWSET_CHUNK) throw new Error(`parseRowsetChunks - dataType: ${dataType} should be CMD_ROWSET_CHUNK`)
  buffer = buffer.subarray(buffer.indexOf(' ') + 1)

  while (buffer.length > 0 && !bufferStartsWith(buffer, ROWSET_CHUNKS_END)) {
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

  console.assert(data && data.length === metadata.numberOfRows * metadata.numberOfColumns, 'parseRowsetChunks - invalid rowset data')
  const rowset = new SQLiteCloudRowset(metadata, data)
  // console.debug(`parseRowsetChunks - ${rowset.numberOfRows} rows, ${rowset.numberOfColumns} columns`)
  return rowset
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
export function popData(buffer: Buffer): { data: SQLiteCloudDataTypes | SQLiteCloudRowset; fwdBuffer: Buffer } {
  function popResults(data: any) {
    const fwdBuffer = buffer.subarray(commandEnd)
    return { data, fwdBuffer }
  }

  // first character is the data type
  console.assert(buffer && buffer instanceof Buffer)
  let dataType: string = buffer.subarray(0, 1).toString('utf8')
  if (dataType == CMD_COMPRESSED) throw new Error('Compressed data should be decompressed before parsing')
  if (dataType == CMD_ROWSET_CHUNK) throw new Error('Chunked data should be parsed by parseRowsetChunks')

  let spaceIndex = buffer.indexOf(' ')
  if (spaceIndex === -1) {
    spaceIndex = buffer.length - 1
  }

  let commandEnd = -1,
    commandLength = -1
  if (dataType === CMD_INT || dataType === CMD_FLOAT || dataType === CMD_NULL) {
    commandEnd = spaceIndex + 1
  } else {
    commandLength = parseInt(buffer.subarray(1, spaceIndex).toString())
    commandEnd = spaceIndex + 1 + commandLength
  }

  // console.debug(`popData - dataType: ${dataType}, spaceIndex: ${spaceIndex}, commandLength: ${commandLength}, commandEnd: ${commandEnd}`)
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
    case CMD_PUBSUB:
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

  const msg = `popData - Data type: ${Number(dataType)} '${dataType}'  is not defined in SCSP, spaceIndex: ${spaceIndex}, commandLength: ${commandLength}, commandEnd: ${commandEnd}`
  console.error(msg)
  throw new TypeError(msg)
}

/** Format a command to be sent via SCSP protocol */
export function formatCommand(command: SQLiteCloudCommand): string {
  if (command.parameters && command.parameters.length > 0) {
    // by SCSP the string paramenters in the array are zero-terminated
    return serializeCommand([command.query, ...(command.parameters || [])], true)
  }
  return serializeData(command.query, false)
}

function serializeCommand(data: any[], zeroString: boolean = false): string {
  const n = data.length
  let serializedData = `${n} `

  for (let i = 0; i < n; i++) {
    // the first string is the sql and it must be zero-terminated
    const zs = i == 0 || zeroString
    serializedData += serializeData(data[i], zs)
  }

  const header = `${CMD_ARRAY}${serializedData.length} `
  return header + serializedData
}

function serializeData(data: any, zeroString: boolean = false): string {
  if (typeof data === 'string') {
    let cmd = CMD_STRING
    if (zeroString) {
      cmd = CMD_ZEROSTRING
      data += '\0'
    }

    const header = `${cmd}${Buffer.byteLength(data, 'utf-8')} `
    return header + data
  }

  if (typeof data === 'number') {
    if (Number.isInteger(data)) {
      return `${CMD_INT}${data} `
    } else {
      return `${CMD_FLOAT}${data} `
    }
  }

  if (Buffer.isBuffer(data)) {
    const header = `${CMD_BLOB}${data.length} `
    return header + data.toString('utf-8')
  }

  if (data === null || data === undefined) {
    return `${CMD_NULL} `
  }

  if (Array.isArray(data)) {
    return serializeCommand(data, zeroString)
  }

  throw new Error(`Unsupported data type for serialization: ${typeof data}`)
}
