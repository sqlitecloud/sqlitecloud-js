/**
 * types.ts - shared types and interfaces
 */

import tls from 'tls'

/** Configuration for SQLite cloud connection */
export interface SQLiteCloudConfig {
  /** Connection string in the form of sqlitecloud://user:password@host:port/database?options */
  connectionString?: string

  /** User name is required unless connectionString is provided */
  username?: string
  /** Password is required unless connection string is provided */
  password?: string
  /** True if password is hashed, default is false */
  passwordHashed?: boolean

  /** Host name is required unless connectionString is provided */
  host?: string
  /** Port number for tls socket */
  port?: number
  /** Optional query timeout passed directly to TLS socket */
  timeout?: number
  /** Name of database to open */
  database?: string

  /** Create the database if it doesn't exist? */
  createDatabase?: boolean
  /** Database will be created in memory */
  dbMemory?: boolean
  /** Enable SQLite compatibility mode */
  sqliteMode?: boolean
  /* Enable compression */
  compression?: boolean
  /** Request for immediate responses from the server node without waiting for linerizability guarantees */
  nonlinearizable?: boolean
  /** Server should send BLOB columns */
  noBlob?: boolean
  /** Do not send columns with more than max_data bytes */
  maxData?: number
  /** Server should chunk responses with more than maxRows */
  maxRows?: number
  /** Server should limit total number of rows in a set to maxRowset */
  maxRowset?: number

  /** Custom options and configurations for tls socket, eg: additional certificates */
  tlsOptions?: tls.ConnectionOptions

  /** Optional identifier used for verbose logging */
  clientId?: string
  /** True if connection should enable debug logs */
  verbose?: boolean
}

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

/** Basic types that can be returned by SQLiteCloud APIs */
export type SQLiteCloudDataTypes = string | number | boolean | Record<string | number, unknown> | Buffer | null | undefined

/** Custom error reported by SQLiteCloud drivers */
export class SQLiteCloudError extends Error {
  constructor(message: string, args?: Partial<SQLiteCloudError>) {
    super(message)
    this.name = 'SQLiteCloudError'
    if (args) {
      Object.assign(this, args)
    }
  }

  /** Upstream error that cause this error */
  cause?: Error | string
  /** Error code returned by drivers or server */
  errorCode?: string
  /** Additional error code */
  externalErrorCode?: string
  /** Additional offset code in commands */
  offsetCode?: number
}

export type ErrorCallback = (error: Error | null) => void
export type ResultsCallback<T = any> = (error: Error | null, results?: T) => void
export type RowsCallback<T = Record<string, any>> = (error: Error | null, rows?: T[]) => void
export type RowCallback<T = Record<string, any>> = (error: Error | null, row?: T) => void
export type RowCountCallback = (error: Error | null, rowCount?: number) => void

/**
 * Certain responses include arrays with various types of metadata.
 * The first entry is always an array type from this list. This enum
 * is called SQCLOUD_ARRAY_TYPE in the C API.
 */
export enum SQLiteCloudArrayType {
  ARRAY_TYPE_SQLITE_EXEC = 10, // used in SQLITE_MODE only when a write statement is executed (instead of the OK reply)
  ARRAY_TYPE_DB_STATUS = 11,
  ARRAY_TYPE_METADATA = 12,

  ARRAY_TYPE_VM_STEP = 20, // used in VM_STEP (when SQLITE_DONE is returned)
  ARRAY_TYPE_VM_COMPILE = 21, // used in VM_PREPARE
  ARRAY_TYPE_VM_STEP_ONE = 22, // unused in this version (will be used to step in a server-side rowset)
  ARRAY_TYPE_VM_SQL = 23,
  ARRAY_TYPE_VM_STATUS = 24,
  ARRAY_TYPE_VM_LIST = 25,

  ARRAY_TYPE_BACKUP_INIT = 40, // used in BACKUP_INIT
  ARRAY_TYPE_BACKUP_STEP = 41, // used in backupWrite (VFS)
  ARRAY_TYPE_BACKUP_END = 42, // used in backupClose (VFS)

  ARRAY_TYPE_SQLITE_STATUS = 50 // used in sqlite_status
}

/** SQLite Datatypes*/
export enum SQLiteManagerType {
  NULL,
  INTEGER,
  REAL,
  TEXT,
  BLOB
}

/** SQLite Default clause */
export enum SQLiteManagerDefault {
  NULL,
  CURRENT_TIME,
  CURRENT_DATE,
  CURRENT_TIMESTAMP
}

/** SQLite Collate clause */
export enum SQLiteManagerCollate {
  BINARY,
  NOCASE,
  RTRIM
}

/** SQLite column foreign key options */
export enum SQLiteManagerForeignKeyOptions {
  NONE,
  DEFERRABLE,
  DEFERRABLE_INITIALLY_DEFERRED,
  DEFERRABLE_INITIALLY_IMMEDIATE,
  NOT_DEFERRABLE,
  NOT_DEFERRABLE_INITIALLY_DEFERRED,
  NOT_DEFERRABLE_INITIALLY_IMMEDIATE
}

/** SQLite ON DELETE and ON UPDATE Actions */
export enum SQLiteManagerForeignKeyOn {
  NO_ACTION,
  RESTRICT,
  SET_NULL,
  SET_DEFAULT,
  CASCADE
}

/** SQLite foreign key */
export class SQLiteManagerForeignKey {
  enabled = false
  table = ''
  column = ''
  options: SQLiteManagerForeignKeyOptions = SQLiteManagerForeignKeyOptions.NONE
  onDelete: SQLiteManagerForeignKeyOn = SQLiteManagerForeignKeyOn.NO_ACTION
  onUpdate: SQLiteManagerForeignKeyOn = SQLiteManagerForeignKeyOn.NO_ACTION
  match = ''

  constructor(
    enabled: boolean,
    table: string,
    column: string,
    options?: SQLiteManagerForeignKeyOptions,
    onDelete?: SQLiteManagerForeignKeyOn,
    onUpdate?: SQLiteManagerForeignKeyOn,
    match?: string
  ) {
    if (enabled) {
      this.enable(table, column, options, onDelete, onUpdate, match)
    } else {
      this.disable()
    }
  }

  /** By disabling foreign key you delete references */
  disable(): void {
    this.enabled = false
    this.table = ''
    this.column = ''
    this.options = SQLiteManagerForeignKeyOptions.NONE
    this.onDelete = SQLiteManagerForeignKeyOn.NO_ACTION
    this.onUpdate = SQLiteManagerForeignKeyOn.NO_ACTION
    this.match = ''
  }

  enable(
    table: string,
    column: string,
    options?: SQLiteManagerForeignKeyOptions,
    onDelete?: SQLiteManagerForeignKeyOn,
    onUpdate?: SQLiteManagerForeignKeyOn,
    match?: string
  ): void {
    this.enabled = true
    this.table = table
    this.column = column

    if (options) {
      this.options = options
    }

    if (onDelete) {
      this.onDelete = onDelete
    }

    if (onUpdate) {
      this.onUpdate = onUpdate
    }

    if (match) {
      this.match = match
    }
  }
}

/** SQLite column constraints */
export interface SQLiteManagerConstraints {
  PRIMARY_KEY?: boolean
  AUTOINCREMENT?: boolean
  NOT_NULL?: boolean
  UNIQUE?: boolean
  Check?: string

  /** You can leave it undefined or pass: SQLiteManagerDefault.NULL, SQLiteManagerDefault.CURRENT_TIME, etc. */
  Default?: SQLiteManagerDefault | string

  /** You can leave it undefined or pass: SQLiteManagerCollate.BINARY, SQLiteManagerCollate.NOCASE, etc. */
  Collate?: SQLiteManagerCollate | string

  /** You should pass: new SQLiteManagerForeignKey(), or you can leave it undefined */
  ForeignKey?: SQLiteManagerForeignKey
}

/** SQLite column interface */
export interface SQLiteManagerColumn {
  /** Column name */
  name: string

  /** Data type */
  type: SQLiteManagerType

  /** Constraints */
  constraints?: SQLiteManagerConstraints
}

/** SQLite table interface */
export interface SQLiteManagerTable {
  /** Name of the table */
  name: string

  /** Columns */
  columns?: SQLiteManagerColumn[]
}

export const keywords = [
  'ABORT',
  'ACTION',
  'ADD',
  'AFTER',
  'ALL',
  'ALTER',
  'ALWAYS',
  'ANALYZE',
  'AND',
  'AS',
  'ASC',
  'ATTACH',
  'AUTOINCREMENT',
  'BEFORE',
  'BEGIN',
  'BETWEEN',
  'BY',
  'CASCADE',
  'CASE',
  'CAST',
  'CHECK',
  'COLLATE',
  'COLUMN',
  'COMMIT',
  'CONFLICT',
  'CONSTRAINT',
  'CREATE',
  'CROSS',
  'CURRENT',
  'CURRENT_DATE',
  'CURRENT_TIME',
  'CURRENT_TIMESTAMP',
  'DATABASE',
  'DEFAULT',
  'DEFERRABLE',
  'DEFERRED',
  'DELETE',
  'DESC',
  'DETACH',
  'DISTINCT',
  'DO',
  'DROP',
  'EACH',
  'ELSE',
  'END',
  'ESCAPE',
  'EXCEPT',
  'EXCLUDE',
  'EXCLUSIVE',
  'EXISTS',
  'EXPLAIN',
  'FAIL',
  'FILTER',
  'FIRST',
  'FOLLOWING',
  'FOR',
  'FOREIGN',
  'FROM',
  'FULL',
  'GENERATED',
  'GLOB',
  'GROUP',
  'GROUPS',
  'HAVING',
  'IF',
  'IGNORE',
  'IMMEDIATE',
  'IN',
  'INDEX',
  'INDEXED',
  'INITIALLY',
  'INNER',
  'INSERT',
  'INSTEAD',
  'INTERSECT',
  'INTO',
  'IS',
  'ISNULL',
  'JOIN',
  'KEY',
  'LAST',
  'LEFT',
  'LIKE',
  'LIMIT',
  'MATCH',
  'MATERIALIZED',
  'NATURAL',
  'NO',
  'NOT',
  'NOTHING',
  'NOTNULL',
  'NULL',
  'NULLS',
  'OF',
  'OFFSET',
  'ON',
  'OR',
  'ORDER',
  'OTHERS',
  'OUTER',
  'OVER',
  'PARTITION',
  'PLAN',
  'PRAGMA',
  'PRECEDING',
  'PRIMARY',
  'QUERY',
  'RAISE',
  'RANGE',
  'RECURSIVE',
  'REFERENCES',
  'REGEXP',
  'REINDEX',
  'RELEASE',
  'RENAME',
  'REPLACE',
  'RESTRICT',
  'RETURNING',
  'RIGHT',
  'ROLLBACK',
  'ROW',
  'ROWS',
  'SAVEPOINT',
  'SELECT',
  'SET',
  'TABLE',
  'TEMP',
  'TEMPORARY',
  'THEN',
  'TIES',
  'TO',
  'TRANSACTION',
  'TRIGGER',
  'UNBOUNDED',
  'UNION',
  'UNIQUE',
  'UPDATE',
  'USING',
  'VACUUM',
  'VALUES',
  'VIEW',
  'VIRTUAL',
  'WHEN',
  'WHERE',
  'WINDOW',
  'WITH',
  'WITHOUT'
]
