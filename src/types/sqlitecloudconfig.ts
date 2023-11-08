/**
 * sqlitecloudconfig.ts - configuration for sqlitecloud connection
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
