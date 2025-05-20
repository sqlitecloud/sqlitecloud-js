"use strict";
/**
 * types.ts - shared types and interfaces
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteCloudArrayType = exports.SQLiteCloudError = exports.SAFE_INTEGER_MODE = exports.DEFAULT_PORT = exports.DEFAULT_TIMEOUT = void 0;
/** Default timeout value for queries */
exports.DEFAULT_TIMEOUT = 300 * 1000;
/** Default tls connection port */
exports.DEFAULT_PORT = 8860;
/**
 * Support to SQLite 64bit integer
 *
 * number - (default) always return Number type (max: 2^53 - 1)
 *   Precision is lost when selecting greater numbers from SQLite
 * bigint - always return BigInt type (max: 2^63 - 1) for all numbers from SQLite
 *  (inlcuding `lastID` from WRITE statements)
 * mixed - use BigInt and Number types depending on the value size
 */
exports.SAFE_INTEGER_MODE = (_a = process.env['SAFE_INTEGER_MODE']) === null || _a === void 0 ? void 0 : _a.toLowerCase();
if (exports.SAFE_INTEGER_MODE == 'bigint') {
    console.debug('BigInt mode: Using Number for all INTEGER values from SQLite, including meta information from WRITE statements.');
}
if (exports.SAFE_INTEGER_MODE == 'mixed') {
    console.debug('Mixed mode: Using BigInt for INTEGER values from SQLite (including meta information from WRITE statements) bigger then 2^53, Number otherwise.');
}
/** Custom error reported by SQLiteCloud drivers */
class SQLiteCloudError extends Error {
    constructor(message, args) {
        super(message);
        this.name = 'SQLiteCloudError';
        if (args) {
            Object.assign(this, args);
        }
    }
}
exports.SQLiteCloudError = SQLiteCloudError;
/**
 * Certain responses include arrays with various types of metadata.
 * The first entry is always an array type from this list. This enum
 * is called SQCLOUD_ARRAY_TYPE in the C API.
 */
var SQLiteCloudArrayType;
(function (SQLiteCloudArrayType) {
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_SQLITE_EXEC"] = 10] = "ARRAY_TYPE_SQLITE_EXEC";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_DB_STATUS"] = 11] = "ARRAY_TYPE_DB_STATUS";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_METADATA"] = 12] = "ARRAY_TYPE_METADATA";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_VM_STEP"] = 20] = "ARRAY_TYPE_VM_STEP";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_VM_COMPILE"] = 21] = "ARRAY_TYPE_VM_COMPILE";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_VM_STEP_ONE"] = 22] = "ARRAY_TYPE_VM_STEP_ONE";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_VM_SQL"] = 23] = "ARRAY_TYPE_VM_SQL";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_VM_STATUS"] = 24] = "ARRAY_TYPE_VM_STATUS";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_VM_LIST"] = 25] = "ARRAY_TYPE_VM_LIST";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_BACKUP_INIT"] = 40] = "ARRAY_TYPE_BACKUP_INIT";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_BACKUP_STEP"] = 41] = "ARRAY_TYPE_BACKUP_STEP";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_BACKUP_END"] = 42] = "ARRAY_TYPE_BACKUP_END";
    SQLiteCloudArrayType[SQLiteCloudArrayType["ARRAY_TYPE_SQLITE_STATUS"] = 50] = "ARRAY_TYPE_SQLITE_STATUS"; // used in sqlite_status
})(SQLiteCloudArrayType || (exports.SQLiteCloudArrayType = SQLiteCloudArrayType = {}));
