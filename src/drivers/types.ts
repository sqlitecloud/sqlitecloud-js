/**
 * types.ts - shared types and interfaces
 */

import tls from 'tls'

/** Default timeout value for queries */
export const DEFAULT_TIMEOUT = 300 * 1000
/** Default tls connection port */
export const DEFAULT_PORT = 9960

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
  /** API key can be provided instead of username and password */
  apiKey?: string

  /** Host name is required unless connectionString is provided, eg: xxx.sqlitecloud.io */
  host?: string
  /** Port number for tls socket */
  port?: number
  /** Connect using plain TCP port, without TLS encryption, NOT RECOMMENDED, TEST ONLY */
  insecure?: boolean

  /** Optional query timeout passed directly to TLS socket */
  timeout?: number
  /** Name of database to open */
  database?: string

  /** Create the database if it doesn't exist? */
  createDatabase?: boolean
  /** Database will be created in memory */
  dbMemory?: boolean
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

  /** True if we should force use of SQLite Cloud Gateway and websocket connections, default: true in browsers, false in node.js */
  useWebsocket?: boolean
  /** Url where we can connect to a SQLite Cloud Gateway that has a socket.io deamon waiting to connect, eg. wss://host:4000 */
  gatewayUrl?: string

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
    /** Column is not nullable? 1 */
    notNull?: number
    /** Column is primary key? 1 */
    primaryKey?: number
    /** Column has autoincrement flag? 1 */
    autoIncrement?: number
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
