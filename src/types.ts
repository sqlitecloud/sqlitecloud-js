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
export type SQLiteCloudDataTypes = string | number | boolean | Record<string | number, unknown> | null | undefined

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
