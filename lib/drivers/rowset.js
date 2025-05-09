"use strict";
//
// rowset.ts
//
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SQLiteCloudRow_rowset, _SQLiteCloudRow_data, _SQLiteCloudRowset_metadata, _SQLiteCloudRowset_data;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteCloudRowset = exports.SQLiteCloudRow = void 0;
const types_1 = require("./types");
/** A single row in a dataset with values accessible by column name */
class SQLiteCloudRow {
    constructor(rowset, columnsNames, data) {
        // rowset is private
        _SQLiteCloudRow_rowset.set(this, void 0);
        // data is private
        _SQLiteCloudRow_data.set(this, void 0);
        __classPrivateFieldSet(this, _SQLiteCloudRow_rowset, rowset, "f");
        __classPrivateFieldSet(this, _SQLiteCloudRow_data, data, "f");
        for (let i = 0; i < columnsNames.length; i++) {
            this[columnsNames[i]] = data[i];
        }
    }
    /** Returns the rowset that this row belongs to */
    // @ts-expect-error
    getRowset() {
        return __classPrivateFieldGet(this, _SQLiteCloudRow_rowset, "f");
    }
    /** Returns rowset data as a plain array of values */
    // @ts-expect-error
    getData() {
        return __classPrivateFieldGet(this, _SQLiteCloudRow_data, "f");
    }
}
exports.SQLiteCloudRow = SQLiteCloudRow;
_SQLiteCloudRow_rowset = new WeakMap(), _SQLiteCloudRow_data = new WeakMap();
/* A set of rows returned by a query */
class SQLiteCloudRowset extends Array {
    constructor(metadata, data) {
        super(metadata.numberOfRows);
        /** Metadata contains number of rows and columns, column names, types, etc.  */
        _SQLiteCloudRowset_metadata.set(this, void 0);
        /** Actual data organized in rows */
        _SQLiteCloudRowset_data.set(this, void 0);
        // console.assert(data !== undefined && data.length === metadata.numberOfRows * metadata.numberOfColumns, 'Invalid rowset data')
        // console.assert(metadata !== undefined && metadata.columns.length === metadata.numberOfColumns, 'Invalid columns metadata')
        __classPrivateFieldSet(this, _SQLiteCloudRowset_metadata, metadata, "f");
        __classPrivateFieldSet(this, _SQLiteCloudRowset_data, data, "f");
        // adjust missing column names, duplicate column names, etc.
        const columnNames = this.columnsNames;
        for (let i = 0; i < metadata.numberOfColumns; i++) {
            if (!columnNames[i]) {
                columnNames[i] = `column_${i}`;
            }
            let j = 0;
            while (columnNames.findIndex((name, index) => index !== i && name === columnNames[i]) >= 0) {
                columnNames[i] = `${columnNames[i]}_${j}`;
                j++;
            }
        }
        for (let i = 0, start = 0; i < metadata.numberOfRows; i++, start += metadata.numberOfColumns) {
            this[i] = new SQLiteCloudRow(this, columnNames, data.slice(start, start + metadata.numberOfColumns));
        }
    }
    /**
     * Rowset version is 1 for a rowset with simple column names, 2 for extended metadata
     * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
     */
    get version() {
        return __classPrivateFieldGet(this, _SQLiteCloudRowset_metadata, "f").version;
    }
    /** Number of rows in row set */
    get numberOfRows() {
        return __classPrivateFieldGet(this, _SQLiteCloudRowset_metadata, "f").numberOfRows;
    }
    /** Number of columns in row set */
    get numberOfColumns() {
        return __classPrivateFieldGet(this, _SQLiteCloudRowset_metadata, "f").numberOfColumns;
    }
    /** Array of columns names */
    get columnsNames() {
        return __classPrivateFieldGet(this, _SQLiteCloudRowset_metadata, "f").columns.map(column => column.name);
    }
    /** Get rowset metadata */
    get metadata() {
        return __classPrivateFieldGet(this, _SQLiteCloudRowset_metadata, "f");
    }
    /** Return value of item at given row and column */
    getItem(row, column) {
        if (row < 0 || row >= this.numberOfRows || column < 0 || column >= this.numberOfColumns) {
            throw new types_1.SQLiteCloudError(`This rowset has ${this.numberOfColumns} columns by ${this.numberOfRows} rows, requested column ${column} and row ${row} is invalid.`);
        }
        return __classPrivateFieldGet(this, _SQLiteCloudRowset_data, "f")[row * this.numberOfColumns + column];
    }
    /** Returns a subset of rows from this rowset */
    slice(start, end) {
        // validate and apply boundaries
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
        start = start === undefined ? 0 : start < 0 ? this.numberOfRows + start : start;
        start = Math.min(Math.max(start, 0), this.numberOfRows);
        end = end === undefined ? this.numberOfRows : end < 0 ? this.numberOfRows + end : end;
        end = Math.min(Math.max(start, end), this.numberOfRows);
        const slicedMetadata = Object.assign(Object.assign({}, __classPrivateFieldGet(this, _SQLiteCloudRowset_metadata, "f")), { numberOfRows: end - start });
        const slicedData = __classPrivateFieldGet(this, _SQLiteCloudRowset_data, "f").slice(start * this.numberOfColumns, end * this.numberOfColumns);
        console.assert(slicedData && slicedData.length === slicedMetadata.numberOfRows * slicedMetadata.numberOfColumns, 'SQLiteCloudRowset.slice - invalid rowset data');
        return new SQLiteCloudRowset(slicedMetadata, slicedData);
    }
    map(fn) {
        const results = [];
        for (let i = 0; i < this.numberOfRows; i++) {
            const row = this[i];
            results.push(fn(row, i, this));
        }
        return results;
    }
    /** Returns an instance of SQLiteCloudRowset where rows have been filtered via given callback */
    filter(fn) {
        const filteredData = [];
        for (let i = 0; i < this.numberOfRows; i++) {
            const row = this[i];
            if (fn(row, i, this)) {
                filteredData.push(...__classPrivateFieldGet(this, _SQLiteCloudRowset_data, "f").slice(i * this.numberOfColumns, (i + 1) * this.numberOfColumns));
            }
        }
        return new SQLiteCloudRowset(Object.assign(Object.assign({}, __classPrivateFieldGet(this, _SQLiteCloudRowset_metadata, "f")), { numberOfRows: filteredData.length / this.numberOfColumns }), filteredData);
    }
}
exports.SQLiteCloudRowset = SQLiteCloudRowset;
_SQLiteCloudRowset_metadata = new WeakMap(), _SQLiteCloudRowset_data = new WeakMap();
