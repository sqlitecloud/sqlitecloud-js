import { DEFAULT_API_PORT, DEFAULT_API_VERSION } from "../../drivers/constants"
import { SQLiteCloudConfig } from "../../drivers/types"

export const parseConnectionString = (connectionString: string) => {
  const url = new URL(connectionString)
  return {
    host: url.hostname,
    port: url.port,
    database: url.pathname.slice(1),
    apiKey: url.searchParams.get('apikey')
  }
}

export const getAPIUrl = (connectionString: string, path: string) => {
  const { host } = parseConnectionString(connectionString)
  return `https://${host}:${DEFAULT_API_PORT}/${DEFAULT_API_VERSION}/${path}`
}

export const getDefaultDatabase = (connectionString: string) => {
  const { database } = parseConnectionString(connectionString)
  return database
}

export const getDbFromConfig = (config: SQLiteCloudConfig) => new URL(config.connectionstring ?? '')?.pathname.split('/').pop() ?? ''
export const formatCommand = (arr: string[]) => arr.reduce((acc, curr) => curr.length > 0 ? (acc + ' ' + curr) : acc, '') + ';'

/**
 * Cleans and validates the SQLite Cloud connection string
 * @param connectionString - The connection string to clean
 * @returns The cleaned connection string
 * @throws Error if connection string is invalid
 * 
 * @example
 * ```ts
 * // Valid connection string
 * cleanConnectionString('sqlitecloud://username:password@host:port/database')
 * 
 * // Removes trailing slash
 * cleanConnectionString('sqlitecloud://username:password@host:port/database/')
 * 
 * // Throws error
 * cleanConnectionString('invalid-connection-string') 
 * ```
 */

export const cleanConnectionString = (connectionString: string) => {
  if (!connectionString.includes('sqlitecloud://')) {
    throw new Error('Invalid connection string')
  }
  if (connectionString.endsWith('/')) {
    return connectionString.slice(0, -1)
  }
  return connectionString
}