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
