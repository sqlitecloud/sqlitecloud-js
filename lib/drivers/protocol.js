"use strict";
//
// protocol.ts - low level protocol handling for SQLiteCloud transport
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROWSET_CHUNKS_END = exports.CMD_PUBSUB = exports.CMD_ARRAY = exports.CMD_COMMAND = exports.CMD_COMPRESSED = exports.CMD_BLOB = exports.CMD_NULL = exports.CMD_JSON = exports.CMD_ROWSET_CHUNK = exports.CMD_ROWSET = exports.CMD_FLOAT = exports.CMD_INT = exports.CMD_ERROR = exports.CMD_ZEROSTRING = exports.CMD_STRING = void 0;
exports.hasCommandLength = hasCommandLength;
exports.parseCommandLength = parseCommandLength;
exports.decompressBuffer = decompressBuffer;
exports.parseError = parseError;
exports.parseArray = parseArray;
exports.parseRowsetHeader = parseRowsetHeader;
exports.bufferStartsWith = bufferStartsWith;
exports.bufferEndsWith = bufferEndsWith;
exports.parseRowsetChunks = parseRowsetChunks;
exports.popData = popData;
exports.formatCommand = formatCommand;
const types_1 = require("./types");
const rowset_1 = require("./rowset");
// explicitly importing buffer library to allow cross-platform support by replacing it
const buffer_1 = require("buffer");
// https://www.npmjs.com/package/lz4js
const lz4 = require('lz4js');
// The server communicates with clients via commands defined in
// SQLiteCloud Server Protocol (SCSP), see more at:
// https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
exports.CMD_STRING = '+';
exports.CMD_ZEROSTRING = '!';
exports.CMD_ERROR = '-';
exports.CMD_INT = ':';
exports.CMD_FLOAT = ',';
exports.CMD_ROWSET = '*';
exports.CMD_ROWSET_CHUNK = '/';
exports.CMD_JSON = '#';
exports.CMD_NULL = '_';
exports.CMD_BLOB = '$';
exports.CMD_COMPRESSED = '%';
exports.CMD_COMMAND = '^';
exports.CMD_ARRAY = '=';
// const CMD_RAWJSON = '{'
exports.CMD_PUBSUB = '|';
// const CMD_RECONNECT = '@'
// To mark the end of the Rowset, the special string /LEN 0 0 0   is sent (LEN is always 6 in this case)
// https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md#scsp-rowset-chunk
exports.ROWSET_CHUNKS_END = '/6 0 0 0 ';
//
// utility functions
//
/** Analyze first character to check if corresponding data type has LEN */
function hasCommandLength(firstCharacter) {
    return firstCharacter == exports.CMD_INT || firstCharacter == exports.CMD_FLOAT || firstCharacter == exports.CMD_NULL ? false : true;
}
/** Analyze a command with explict LEN and extract it */
function parseCommandLength(data) {
    return parseInt(data.subarray(1, data.indexOf(' ')).toString('utf8'));
}
/** Receive a compressed buffer, decompress with lz4, return buffer and datatype */
function decompressBuffer(buffer) {
    // https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md#scsp-compression
    // jest test/database.test.ts -t "select large result set"
    // starts with %<commandLength> <compressed> <uncompressed>
    const spaceIndex = buffer.indexOf(' ');
    const commandLength = parseInt(buffer.subarray(1, spaceIndex).toString('utf8'));
    let commandBuffer = buffer.subarray(spaceIndex + 1, spaceIndex + 1 + commandLength);
    const remainingBuffer = buffer.subarray(spaceIndex + 1 + commandLength);
    // extract compressed + decompressed  size
    const compressedSize = parseInt(commandBuffer.subarray(0, commandBuffer.indexOf(' ') + 1).toString('utf8'));
    commandBuffer = commandBuffer.subarray(commandBuffer.indexOf(' ') + 1);
    const decompressedSize = parseInt(commandBuffer.subarray(0, commandBuffer.indexOf(' ') + 1).toString('utf8'));
    commandBuffer = commandBuffer.subarray(commandBuffer.indexOf(' ') + 1);
    // extract compressed dataType
    const dataType = commandBuffer.subarray(0, 1).toString('utf8');
    let decompressedBuffer = buffer_1.Buffer.alloc(decompressedSize);
    const compressedBuffer = commandBuffer.subarray(commandBuffer.length - compressedSize);
    // lz4js library is javascript and doesn't have types so we silence the type check
    const decompressionResult = lz4.decompressBlock(compressedBuffer, decompressedBuffer, 0, compressedSize, 0);
    // the entire command is composed of the header (which is not compressed) + the decompressed block
    decompressedBuffer = buffer_1.Buffer.concat([commandBuffer.subarray(0, commandBuffer.length - compressedSize), decompressedBuffer]);
    if (decompressionResult <= 0 || decompressionResult !== decompressedSize) {
        throw new Error(`lz4 decompression error at offset ${decompressionResult}`);
    }
    return { buffer: decompressedBuffer, dataType, remainingBuffer };
}
/** Parse error message or extended error message */
function parseError(buffer, spaceIndex) {
    const errorBuffer = buffer.subarray(spaceIndex + 1);
    const errorString = errorBuffer.toString('utf8');
    const parts = errorString.split(' ');
    let errorCodeStr = parts.shift() || '0'; // Default errorCode is '0' if not present
    let extErrCodeStr = '0'; // Default extended error code
    let offsetCodeStr = '-1'; // Default offset code
    // Split the errorCode by ':' to check for extended error codes
    const errorCodeParts = errorCodeStr.split(':');
    errorCodeStr = errorCodeParts[0];
    if (errorCodeParts.length > 1) {
        extErrCodeStr = errorCodeParts[1];
        if (errorCodeParts.length > 2) {
            offsetCodeStr = errorCodeParts[2];
        }
    }
    // Rest of the error string is the error message
    const errorMessage = parts.join(' ');
    // Parse error codes to integers safely, defaulting to 0 if NaN
    const errorCode = parseInt(errorCodeStr);
    const extErrCode = parseInt(extErrCodeStr);
    const offsetCode = parseInt(offsetCodeStr);
    // create an Error object and add the custom properties
    throw new types_1.SQLiteCloudError(errorMessage, {
        errorCode: errorCode.toString(),
        externalErrorCode: extErrCode.toString(),
        offsetCode
    });
}
/** Parse an array of items (each of which will be parsed by type separately) */
function parseArray(buffer, spaceIndex) {
    const parsedData = [];
    const array = buffer.subarray(spaceIndex + 1, buffer.length);
    const numberOfItems = parseInt(array.subarray(0, spaceIndex - 2).toString('utf8'));
    let arrayItems = array.subarray(array.indexOf(' ') + 1, array.length);
    for (let i = 0; i < numberOfItems; i++) {
        const { data, fwdBuffer: buffer } = popData(arrayItems);
        parsedData.push(data);
        arrayItems = buffer;
    }
    return parsedData;
}
/** Parse header in a rowset or chunk of a chunked rowset */
function parseRowsetHeader(buffer) {
    const index = parseInt(buffer.subarray(0, buffer.indexOf(':') + 1).toString());
    buffer = buffer.subarray(buffer.indexOf(':') + 1);
    // extract rowset header
    const { data, fwdBuffer } = popIntegers(buffer, 3);
    const result = {
        index,
        metadata: {
            version: data[0],
            numberOfRows: data[1],
            numberOfColumns: data[2],
            columns: []
        },
        fwdBuffer
    };
    // console.debug(`parseRowsetHeader`, result)
    return result;
}
/** Extract column names and, optionally, more metadata out of a rowset's header */
function parseRowsetColumnsMetadata(buffer, metadata) {
    function popForward() {
        const { data, fwdBuffer: fwdBuffer } = popData(buffer); // buffer in parent scope
        buffer = fwdBuffer;
        return data;
    }
    for (let i = 0; i < metadata.numberOfColumns; i++) {
        metadata.columns.push({ name: popForward() });
    }
    // extract additional metadata if rowset has version 2
    if (metadata.version == 2) {
        for (let i = 0; i < metadata.numberOfColumns; i++)
            metadata.columns[i].type = popForward();
        for (let i = 0; i < metadata.numberOfColumns; i++)
            metadata.columns[i].database = popForward();
        for (let i = 0; i < metadata.numberOfColumns; i++)
            metadata.columns[i].table = popForward();
        for (let i = 0; i < metadata.numberOfColumns; i++)
            metadata.columns[i].column = popForward(); // original column name
        for (let i = 0; i < metadata.numberOfColumns; i++)
            metadata.columns[i].notNull = popForward();
        for (let i = 0; i < metadata.numberOfColumns; i++)
            metadata.columns[i].primaryKey = popForward();
        for (let i = 0; i < metadata.numberOfColumns; i++)
            metadata.columns[i].autoIncrement = popForward();
    }
    return buffer;
}
/** Parse a regular rowset (no chunks) */
function parseRowset(buffer, spaceIndex) {
    buffer = buffer.subarray(spaceIndex + 1, buffer.length);
    const { metadata, fwdBuffer } = parseRowsetHeader(buffer);
    buffer = parseRowsetColumnsMetadata(fwdBuffer, metadata);
    // decode each rowset item
    const data = [];
    for (let j = 0; j < metadata.numberOfRows * metadata.numberOfColumns; j++) {
        const { data: rowData, fwdBuffer } = popData(buffer);
        data.push(rowData);
        buffer = fwdBuffer;
    }
    console.assert(data && data.length === metadata.numberOfRows * metadata.numberOfColumns, 'SQLiteCloudConnection.parseRowset - invalid rowset data');
    return new rowset_1.SQLiteCloudRowset(metadata, data);
}
function bufferStartsWith(buffer, prefix) {
    return buffer.length >= prefix.length && buffer.subarray(0, prefix.length).toString('utf8') === prefix;
}
function bufferEndsWith(buffer, suffix) {
    return buffer.length >= suffix.length && buffer.subarray(buffer.length - suffix.length, buffer.length).toString('utf8') === suffix;
}
/**
 * Parse a chunk of a chunked rowset command, eg:
 * *LEN 0:VERS NROWS NCOLS DATA
 * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md#scsp-rowset-chunk
 */
function parseRowsetChunks(buffers) {
    let buffer = buffer_1.Buffer.concat(buffers);
    if (!bufferStartsWith(buffer, exports.CMD_ROWSET_CHUNK) || !bufferEndsWith(buffer, exports.ROWSET_CHUNKS_END)) {
        throw new Error('SQLiteCloudConnection.parseRowsetChunks - invalid chunks buffer');
    }
    let metadata = { version: 1, numberOfColumns: 0, numberOfRows: 0, columns: [] };
    const data = [];
    // validate and skip data type
    const dataType = buffer.subarray(0, 1).toString();
    if (dataType !== exports.CMD_ROWSET_CHUNK)
        throw new Error(`parseRowsetChunks - dataType: ${dataType} should be CMD_ROWSET_CHUNK`);
    buffer = buffer.subarray(buffer.indexOf(' ') + 1);
    while (buffer.length > 0 && !bufferStartsWith(buffer, exports.ROWSET_CHUNKS_END)) {
        // chunk header, eg: 0:VERS NROWS NCOLS
        const { index: chunkIndex, metadata: chunkMetadata, fwdBuffer } = parseRowsetHeader(buffer);
        buffer = fwdBuffer;
        // first chunk? extract columns metadata
        if (chunkIndex === 1) {
            metadata = chunkMetadata;
            buffer = parseRowsetColumnsMetadata(buffer, metadata);
        }
        else {
            metadata.numberOfRows += chunkMetadata.numberOfRows;
        }
        // extract single rowset row
        for (let k = 0; k < chunkMetadata.numberOfRows * metadata.numberOfColumns; k++) {
            const { data: itemData, fwdBuffer } = popData(buffer);
            data.push(itemData);
            buffer = fwdBuffer;
        }
    }
    console.assert(data && data.length === metadata.numberOfRows * metadata.numberOfColumns, 'parseRowsetChunks - invalid rowset data');
    const rowset = new rowset_1.SQLiteCloudRowset(metadata, data);
    // console.debug(`parseRowsetChunks - ${rowset.numberOfRows} rows, ${rowset.numberOfColumns} columns`)
    return rowset;
}
/** Pop one or more space separated integers from beginning of buffer, move buffer forward */
function popIntegers(buffer, numberOfIntegers = 1) {
    const data = [];
    for (let i = 0; i < numberOfIntegers; i++) {
        const spaceIndex = buffer.indexOf(' ');
        data[i] = parseInt(buffer.subarray(0, spaceIndex).toString());
        buffer = buffer.subarray(spaceIndex + 1);
    }
    return { data, fwdBuffer: buffer };
}
/** Parse command, extract its data, return the data and the buffer moved to the first byte after the command */
function popData(buffer) {
    function popResults(data) {
        const fwdBuffer = buffer.subarray(commandEnd);
        return { data, fwdBuffer };
    }
    // first character is the data type
    console.assert(buffer && buffer instanceof buffer_1.Buffer);
    let dataType = buffer.subarray(0, 1).toString('utf8');
    if (dataType == exports.CMD_COMPRESSED)
        throw new Error('Compressed data should be decompressed before parsing');
    if (dataType == exports.CMD_ROWSET_CHUNK)
        throw new Error('Chunked data should be parsed by parseRowsetChunks');
    let spaceIndex = buffer.indexOf(' ');
    if (spaceIndex === -1) {
        spaceIndex = buffer.length - 1;
    }
    let commandEnd = -1, commandLength = -1;
    if (dataType === exports.CMD_INT || dataType === exports.CMD_FLOAT || dataType === exports.CMD_NULL) {
        commandEnd = spaceIndex + 1;
    }
    else {
        commandLength = parseInt(buffer.subarray(1, spaceIndex).toString());
        commandEnd = spaceIndex + 1 + commandLength;
    }
    // console.debug(`popData - dataType: ${dataType}, spaceIndex: ${spaceIndex}, commandLength: ${commandLength}, commandEnd: ${commandEnd}`)
    switch (dataType) {
        case exports.CMD_INT:
            return popResults(parseInt(buffer.subarray(1, spaceIndex).toString()));
        case exports.CMD_FLOAT:
            return popResults(parseFloat(buffer.subarray(1, spaceIndex).toString()));
        case exports.CMD_NULL:
            return popResults(null);
        case exports.CMD_STRING:
            return popResults(buffer.subarray(spaceIndex + 1, commandEnd).toString('utf8'));
        case exports.CMD_ZEROSTRING:
            return popResults(buffer.subarray(spaceIndex + 1, commandEnd - 1).toString('utf8'));
        case exports.CMD_COMMAND:
            return popResults(buffer.subarray(spaceIndex + 1, commandEnd).toString('utf8'));
        case exports.CMD_PUBSUB:
            return popResults(buffer.subarray(spaceIndex + 1, commandEnd).toString('utf8'));
        case exports.CMD_JSON:
            return popResults(JSON.parse(buffer.subarray(spaceIndex + 1, commandEnd).toString('utf8')));
        case exports.CMD_BLOB:
            return popResults(buffer.subarray(spaceIndex + 1, commandEnd));
        case exports.CMD_ARRAY:
            return popResults(parseArray(buffer, spaceIndex));
        case exports.CMD_ROWSET:
            return popResults(parseRowset(buffer, spaceIndex));
        case exports.CMD_ERROR:
            parseError(buffer, spaceIndex); // throws custom error
            break;
    }
    const msg = `popData - Data type: ${Number(dataType)} '${dataType}'  is not defined in SCSP, spaceIndex: ${spaceIndex}, commandLength: ${commandLength}, commandEnd: ${commandEnd}`;
    console.error(msg);
    throw new TypeError(msg);
}
/** Format a command to be sent via SCSP protocol */
function formatCommand(command) {
    // core returns null if there's a space after the semi column
    // we want to maintain a compatibility with the standard sqlite3 driver
    command.query = command.query.trim();
    if (command.parameters && command.parameters.length > 0) {
        // by SCSP the string paramenters in the array are zero-terminated
        return serializeCommand([command.query, ...(command.parameters || [])], true);
    }
    return serializeData(command.query, false);
}
function serializeCommand(data, zeroString = false) {
    const n = data.length;
    let serializedData = `${n} `;
    for (let i = 0; i < n; i++) {
        // the first string is the sql and it must be zero-terminated
        const zs = i == 0 || zeroString;
        serializedData += serializeData(data[i], zs);
    }
    const bytesTotal = buffer_1.Buffer.byteLength(serializedData, 'utf-8');
    const header = `${exports.CMD_ARRAY}${bytesTotal} `;
    return header + serializedData;
}
function serializeData(data, zeroString = false) {
    if (typeof data === 'string') {
        let cmd = exports.CMD_STRING;
        if (zeroString) {
            cmd = exports.CMD_ZEROSTRING;
            data += '\0';
        }
        const header = `${cmd}${buffer_1.Buffer.byteLength(data, 'utf-8')} `;
        return header + data;
    }
    if (typeof data === 'number') {
        if (Number.isInteger(data)) {
            return `${exports.CMD_INT}${data} `;
        }
        else {
            return `${exports.CMD_FLOAT}${data} `;
        }
    }
    if (buffer_1.Buffer.isBuffer(data)) {
        const header = `${exports.CMD_BLOB}${data.length} `;
        return header + data.toString('utf-8');
    }
    if (data === null || data === undefined) {
        return `${exports.CMD_NULL} `;
    }
    if (Array.isArray(data)) {
        return serializeCommand(data, zeroString);
    }
    throw new Error(`Unsupported data type for serialization: ${typeof data}`);
}
