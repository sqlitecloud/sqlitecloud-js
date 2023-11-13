//
// rowset.ts
//

import { SQLiteCloudError } from './protocol'

/** Metadata information for a set of rows resulting from a query */
export interface SQLCloudRowsetMetadata {
  /** Rowset version 1 has column's name, version 2 has extended metadata */
  version: number
  /** Number of rows */
  numberOfRows: number
  /** Number of columns */
  numberOfColumns: number

  /** Columns' metadata */
  columns: {
    /** Column name in query (may be altered from original name) */
    name: string
    /** Declare column type */
    type?: string
    /** Database name */
    database?: string
    /** Database table */
    table?: string
    /** Original name of the column */
    column?: string
  }[]
}

/* A set of rows returned by a query */
export class SQLiteCloudRowset {
  /* Create a new rowset object */
  constructor(metadata: SQLCloudRowsetMetadata, data: any[]) {
    this._metadata = metadata
    this._data = data
  }

  private _metadata: SQLCloudRowsetMetadata
  private _data: any[] = []

  /**
   * Rowset version is 1 for a rowset with simple column names, 2 for extended metadata
   * @see https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md
   */
  get version(): number {
    return this._metadata.version
  }

  /** Number of rows in row set */
  get numberOfRows(): number {
    return this._metadata.numberOfRows
  }

  /** Number of columns in row set */
  get numberOfColumns(): number {
    return this._metadata.numberOfColumns
  }

  /** Array of columns names */
  get columnsNames(): string[] {
    return this._metadata.columns.map(column => column.name)
  }

  /** Get rowset metadata */
  get metadata(): SQLCloudRowsetMetadata {
    return this._metadata
  }

  /** Return value of item at given row and column */
  getItem(row: number, column: number): any {
    if (row < 0 || row >= this.numberOfRows || column < 0 || column >= this.numberOfColumns) {
      throw new SQLiteCloudError(
        `This rowset has ${this.numberOfColumns} columns by ${this.numberOfRows} rows, requested column ${column} and row ${row} is invalid.`
      )
    }
    return this._data[row * this.numberOfColumns + column]
  }

  /* Dump values for diagnostic purposes */
  dump(): string[] {
    const rows = []
    for (let i = 0; i < this.numberOfRows; i++) {
      let row = '|'
      for (let j = 0; j < this.numberOfColumns; j++) {
        row = ` ${row}${this.getItem(i, j) as string} |`
      }
      rows.push(row)
    }
    return rows
  }

  toArray(fromRow?: number, toRow?: number): any[] {
    const rowsetValues = []
    const columnsNames = this.columnsNames

    fromRow = Math.max(fromRow !== undefined ? fromRow : 0, 0)
    toRow = Math.min(toRow !== undefined ? toRow : this.numberOfRows, this.numberOfRows)

    for (let row = fromRow || 0; row < toRow; row++) {
      const rowValues: { [key: string]: any } = {}
      for (let column = 0; column < this.numberOfColumns; column++) {
        rowValues[columnsNames[column]] = this.getItem(row, column)
      }
      rowsetValues.push(rowValues)
    }

    return rowsetValues
  }
}
