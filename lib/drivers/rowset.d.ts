import { SQLCloudRowsetMetadata, SQLiteCloudDataTypes } from './types';
/** A single row in a dataset with values accessible by column name */
export declare class SQLiteCloudRow {
    #private;
    constructor(rowset: SQLiteCloudRowset, columnsNames: string[], data: SQLiteCloudDataTypes[]);
    /** Returns the rowset that this row belongs to */
    getRowset(): SQLiteCloudRowset;
    /** Returns rowset data as a plain array of values */
    getData(): SQLiteCloudDataTypes[];
    /** Column values are accessed by column name */
    [columnName: string]: SQLiteCloudDataTypes;
}
export declare class SQLiteCloudRowset extends Array<SQLiteCloudRow> {
    #private;
    constructor(metadata: SQLCloudRowsetMetadata, data: any[]);
    /**
     * Rowset version is 1 for a rowset with simple column names, 2 for extended metadata
     * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
     */
    get version(): number;
    /** Number of rows in row set */
    get numberOfRows(): number;
    /** Number of columns in row set */
    get numberOfColumns(): number;
    /** Array of columns names */
    get columnsNames(): string[];
    /** Get rowset metadata */
    get metadata(): SQLCloudRowsetMetadata;
    /** Return value of item at given row and column */
    getItem(row: number, column: number): any;
    /** Returns a subset of rows from this rowset */
    slice(start?: number, end?: number): SQLiteCloudRow[];
    map(fn: (row: SQLiteCloudRow, index: number, rowset: SQLiteCloudRow[]) => any): any[];
    /** Returns an instance of SQLiteCloudRowset where rows have been filtered via given callback */
    filter(fn: (row: SQLiteCloudRow, index: number, rowset: SQLiteCloudRow[]) => boolean): SQLiteCloudRow[];
}
