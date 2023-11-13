//
// rowset.ts
//

import { SQLCloudRowsetMetadata, SQLiteCloudDataTypes, SQLiteCloudError } from './types'

/** A single row in a dataset with values accessible by column name */
export class SQLiteCloudRow {
  constructor(rowset: SQLiteCloudRowset, columnsNames: string[], data: SQLiteCloudDataTypes[]) {
    this.#rowset = rowset
    for (let i = 0; i < columnsNames.length; i++) {
      this[columnsNames[i]] = data[i]
    }
  }

  // @ts-expect-error
  private #rowset: SQLiteCloudRowset

  /** Returns the rowset that this row belongs to */
  // @ts-expect-error
  public getRowset(): SQLiteCloudRowset {
    return this.#rowset
  }

  /** Column values are accessed by column name */
  [columnName: string]: SQLiteCloudDataTypes
}

/* A set of rows returned by a query */
export class SQLiteCloudRowset extends Array<SQLiteCloudRow> {
  constructor(metadata: SQLCloudRowsetMetadata, data: any[]) {
    super(metadata.numberOfRows)
    console.assert(data.length === metadata.numberOfRows * metadata.numberOfColumns, 'Invalid rowset data')
    console.assert(metadata.columns.length === metadata.numberOfColumns, 'Invalid columns metadata')
    console.assert(
      metadata.numberOfRows >= 0 && metadata.numberOfColumns >= 0,
      `Invalid rowset dimensions ${metadata.numberOfRows} x ${metadata.numberOfColumns}`
    )

    this.#metadata = metadata
    this.#data = data

    // adjust missing column names, duplicate column names, etc.
    let columnNames = this.columnsNames
    for (let i = 0; i < metadata.numberOfColumns; i++) {
      if (!columnNames[i]) {
        columnNames[i] = `column_${i}`
      }
      let j = 0
      while (columnNames.findIndex((name, index) => index !== i && name === columnNames[i]) >= 0) {
        columnNames[i] = `${columnNames[i]}_${j}`
        j++
      }
    }

    for (let i = 0, start = 0; i < metadata.numberOfRows; i++, start += metadata.numberOfColumns) {
      this[i] = new SQLiteCloudRow(this, columnNames, data.slice(start, start + metadata.numberOfColumns))
    }
  }

  /** Metadata contains number of rows and columns, column names, types, etc.  */
  #metadata: SQLCloudRowsetMetadata

  /** Actual data organized in rows */
  #data: SQLiteCloudDataTypes[]

  /**
   * Rowset version is 1 for a rowset with simple column names, 2 for extended metadata
   * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
   */
  get version(): number {
    return this.#metadata.version
  }

  /** Number of rows in row set */
  get numberOfRows(): number {
    return this.#metadata.numberOfRows
  }

  /** Number of columns in row set */
  get numberOfColumns(): number {
    return this.#metadata.numberOfColumns
  }

  /** Array of columns names */
  get columnsNames(): string[] {
    return this.#metadata.columns.map(column => column.name)
  }

  /** Get rowset metadata */
  get metadata(): SQLCloudRowsetMetadata {
    return this.#metadata
  }

  /** Return value of item at given row and column */
  getItem(row: number, column: number): any {
    if (row < 0 || row >= this.numberOfRows || column < 0 || column >= this.numberOfColumns) {
      throw new SQLiteCloudError(
        `This rowset has ${this.numberOfColumns} columns by ${this.numberOfRows} rows, requested column ${column} and row ${row} is invalid.`
      )
    }
    return this.#data[row * this.numberOfColumns + column]
  }
}
