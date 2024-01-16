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

    // console.assert(data !== undefined && data.length === metadata.numberOfRows * metadata.numberOfColumns, 'Invalid rowset data')
    // console.assert(metadata !== undefined && metadata.columns.length === metadata.numberOfColumns, 'Invalid columns metadata')

    this.#metadata = metadata
    this.#data = data

    // adjust missing column names, duplicate column names, etc.
    const columnNames = this.columnsNames
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

  /** Returns a subset of rows from this rowset */
  slice(start?: number, end?: number): SQLiteCloudRow[] {
    // validate and apply boundaries
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
    start = start === undefined ? 0 : start < 0 ? this.numberOfRows + start : start
    start = Math.min(Math.max(start, 0), this.numberOfRows)
    end = end === undefined ? this.numberOfRows : end < 0 ? this.numberOfRows + end : end
    end = Math.min(Math.max(start, end), this.numberOfRows)

    const slicedMetadata = { ...this.#metadata, numberOfRows: end - start }
    const slicedData = this.#data.slice(start * this.numberOfColumns, end * this.numberOfColumns)

    console.assert(
      slicedData && slicedData.length === slicedMetadata.numberOfRows * slicedMetadata.numberOfColumns,
      'SQLiteCloudRowset.slice - invalid rowset data'
    )
    return new SQLiteCloudRowset(slicedMetadata, slicedData)
  }

  map(fn: (row: SQLiteCloudRow, index: number, rowset: SQLiteCloudRow[]) => any): any[] {
    const results: any[] = []
    for (let i = 0; i < this.numberOfRows; i++) {
      const row = this[i]
      results.push(fn(row, i, this))
    }
    return results
  }

  /** Returns an instance of SQLiteCloudRowset where rows have been filtered via given callback */
  filter(fn: (row: SQLiteCloudRow, index: number, rowset: SQLiteCloudRow[]) => boolean): SQLiteCloudRow[] {
    const filteredData: any[] = []
    for (let i = 0; i < this.numberOfRows; i++) {
      const row = this[i]
      if (fn(row, i, this)) {
        filteredData.push(...this.#data.slice(i * this.numberOfColumns, (i + 1) * this.numberOfColumns))
      }
    }
    return new SQLiteCloudRowset({ ...this.#metadata, numberOfRows: filteredData.length / this.numberOfColumns }, filteredData)
  }
}
