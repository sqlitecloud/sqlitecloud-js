import { SQLiteCloudCommand, type SQLCloudRowsetMetadata, type SQLiteCloudDataTypes } from './types';
import { SQLiteCloudRowset } from './rowset';
import { Buffer } from 'buffer';
export declare const CMD_STRING = "+";
export declare const CMD_ZEROSTRING = "!";
export declare const CMD_ERROR = "-";
export declare const CMD_INT = ":";
export declare const CMD_FLOAT = ",";
export declare const CMD_ROWSET = "*";
export declare const CMD_ROWSET_CHUNK = "/";
export declare const CMD_JSON = "#";
export declare const CMD_NULL = "_";
export declare const CMD_BLOB = "$";
export declare const CMD_COMPRESSED = "%";
export declare const CMD_COMMAND = "^";
export declare const CMD_ARRAY = "=";
export declare const CMD_PUBSUB = "|";
export declare const ROWSET_CHUNKS_END = "/6 0 0 0 ";
/** Analyze first character to check if corresponding data type has LEN */
export declare function hasCommandLength(firstCharacter: string): boolean;
/** Analyze a command with explict LEN and extract it */
export declare function parseCommandLength(data: Buffer): number;
/** Receive a compressed buffer, decompress with lz4, return buffer and datatype */
export declare function decompressBuffer(buffer: Buffer): {
    buffer: Buffer;
    dataType: string;
    remainingBuffer: Buffer;
};
/** Parse error message or extended error message */
export declare function parseError(buffer: Buffer, spaceIndex: number): never;
/** Parse an array of items (each of which will be parsed by type separately) */
export declare function parseArray(buffer: Buffer, spaceIndex: number): SQLiteCloudDataTypes[];
/** Parse header in a rowset or chunk of a chunked rowset */
export declare function parseRowsetHeader(buffer: Buffer): {
    index: number;
    metadata: SQLCloudRowsetMetadata;
    fwdBuffer: Buffer;
};
export declare function bufferStartsWith(buffer: Buffer, prefix: string): boolean;
export declare function bufferEndsWith(buffer: Buffer, suffix: string): boolean;
/**
 * Parse a chunk of a chunked rowset command, eg:
 * *LEN 0:VERS NROWS NCOLS DATA
 * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md#scsp-rowset-chunk
 */
export declare function parseRowsetChunks(buffers: Buffer[]): SQLiteCloudRowset;
/** Parse command, extract its data, return the data and the buffer moved to the first byte after the command */
export declare function popData(buffer: Buffer): {
    data: SQLiteCloudDataTypes | SQLiteCloudRowset;
    fwdBuffer: Buffer;
};
/** Format a command to be sent via SCSP protocol */
export declare function formatCommand(command: SQLiteCloudCommand): string;
