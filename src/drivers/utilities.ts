//
// utilities.ts - utility methods to manipulate SQL statements
//

import { SQLiteCloudConfig, SQLiteCloudError, SQLiteCloudDataTypes, DEFAULT_PORT, DEFAULT_TIMEOUT } from './types'

//
// determining running environment, thanks to browser-or-node
// https://www.npmjs.com/package/browser-or-node
//

export const isBrowser: boolean = typeof window !== 'undefined' && typeof window.document !== 'undefined'
export const isNode: boolean = typeof process !== 'undefined' && process.versions != null && process.versions.node != null

//
// utility methods
//

/** Messages going to the server are sometimes logged when error conditions occour and need to be stripped of user credentials  */
export function anonimizeCommand(message: string): string {
  // hide password in AUTH command if needed
  message = message.replace(/USER \S+/, 'USER ******')
  message = message.replace(/PASSWORD \S+?(?=;)/, 'PASSWORD ******')
  message = message.replace(/HASH \S+?(?=;)/, 'HASH ******')
  return message
}

/** Strip message code in error of user credentials */
export function anonimizeError(error: Error): Error {
  if (error?.message) {
    error.message = anonimizeCommand(error.message)
  }
  return error
}

/** Initialization commands sent to database when connection is established */
export function getInitializationCommands(config: SQLiteCloudConfig): string {
  // first user authentication, then all other commands
  let commands = `AUTH USER ${config.username || ''} ${config.passwordHashed ? 'HASH' : 'PASSWORD'} ${config.password || ''}; `

  if (config.database) {
    if (config.createDatabase && !config.dbMemory) {
      commands += `CREATE DATABASE ${config.database} IF NOT EXISTS; `
    }
    commands += `USE DATABASE ${config.database}; `
  }
  if (config.compression) {
    commands += 'SET CLIENT KEY COMPRESSION TO 1; '
  }
  if (config.nonlinearizable) {
    commands += 'SET CLIENT KEY NONLINEARIZABLE TO 1; '
  }
  if (config.noBlob) {
    commands += 'SET CLIENT KEY NOBLOB TO 1; '
  }
  if (config.maxData) {
    commands += `SET CLIENT KEY MAXDATA TO ${config.maxData}; `
  }
  if (config.maxRows) {
    commands += `SET CLIENT KEY MAXROWS TO ${config.maxRows}; `
  }
  if (config.maxRowset) {
    commands += `SET CLIENT KEY MAXROWSET TO ${config.maxRowset}; `
  }

  return commands
}

/** Takes a generic value and escapes it so it can replace ? as a binding in a prepared SQL statement */
export function escapeSqlParameter(param: SQLiteCloudDataTypes): string {
  if (param === null || param === undefined) {
    return 'NULL'
  }

  if (typeof param === 'string') {
    // replace single quote with two single quotes
    param = param.replace(/'/g, "''")
    return `'${param}'`
  }

  if (typeof param === 'number') {
    return param.toString()
  }

  if (typeof param === 'boolean') {
    return param ? '1' : '0'
  }

  // serialize buffer as X'...' hex encoded string
  if (Buffer.isBuffer(param)) {
    return `X'${param.toString('hex')}'`
  }

  if (typeof param === 'object') {
    // serialize json then escape single quotes
    let json = JSON.stringify(param)
    json = json.replace(/'/g, "''")
    return `'${json}'`
  }

  throw new SQLiteCloudError(`Unsupported parameter type: ${typeof param}`)
}

/** Take a sql statement and replaces ? or $named parameters that are properly serialized and escaped. */
export function prepareSql(sql: string, ...params: (SQLiteCloudDataTypes | SQLiteCloudDataTypes[])[]): string {
  // parameters where passed as an array of parameters?
  if (params?.length === 1 && Array.isArray(params[0])) {
    params = params[0]
  }

  // replace ? or ?idx parameters passed as args or as an array
  let parameterIndex = 1
  let preparedSql = sql.replace(/\?(\d+)?/g, (match: string, matchIndex: string) => {
    const index = matchIndex ? parseInt(matchIndex) : parameterIndex
    parameterIndex++

    let sqlParameter: SQLiteCloudDataTypes
    if (params[0] && typeof params[0] === 'object' && !(params[0] instanceof Buffer)) {
      sqlParameter = params[0][index] as SQLiteCloudDataTypes
    }
    if (!sqlParameter) {
      if (index > params.length) {
        throw new SQLiteCloudError('Not enough parameters')
      }
      sqlParameter = params[index - 1] as SQLiteCloudDataTypes
    }

    return sqlParameter !== null && sqlParameter !== undefined ? escapeSqlParameter(sqlParameter) : 'NULL'
  })

  // replace $named or :named parameters passed as an object
  if (params?.length === 1 && params[0] && typeof params[0] === 'object') {
    const namedParams = params[0] as Record<string, SQLiteCloudDataTypes>
    for (const [paramKey, param] of Object.entries(namedParams)) {
      const firstChar = paramKey.charAt(0)
      if (firstChar == '$' || firstChar == ':' || firstChar == '@') {
        const escapedParam = escapeSqlParameter(param)
        preparedSql = preparedSql.replace(new RegExp(`\\${paramKey}`, 'g'), escapedParam)
      }
    }
  }

  return preparedSql
}

/**
 * Many of the methods in our API may contain a callback as their last argument.
 * This method will take the arguments array passed to the method and return an object
 * containing the arguments array with the callbacks removed (if any), and the callback itself.
 * If there are multiple callbacks, the first one is returned as 'callback' and the last one
 * as 'completeCallback'.
 */
export function popCallback<T extends ErrorCallback = ErrorCallback>(
  args: (SQLiteCloudDataTypes | T | ErrorCallback)[]
): { args: SQLiteCloudDataTypes[]; callback?: T | undefined; complete?: ErrorCallback } {
  const remaining = args as SQLiteCloudDataTypes[]
  // at least 1 callback?
  if (args && args.length > 0 && typeof args[args.length - 1] === 'function') {
    // at least 2 callbacks?
    if (args.length > 1 && typeof args[args.length - 2] === 'function') {
      return { args: remaining.slice(0, -2), callback: args[args.length - 2] as T, complete: args[args.length - 1] as T }
    }
    return { args: remaining.slice(0, -1), callback: args[args.length - 1] as T }
  }
  return { args: remaining }
}

//
// configuration validation
//

/** Validate configuration, apply defaults, throw if something is missing or misconfigured */
export function validateConfiguration(config: SQLiteCloudConfig): SQLiteCloudConfig {
  console.assert(config, 'SQLiteCloudConnection.validateConfiguration - missing config')
  if (config.connectionString) {
    config = {
      ...config,
      ...parseConnectionString(config.connectionString),
      connectionString: config.connectionString // keep original connection string
    }
  }

  // apply defaults where needed
  config.port ||= DEFAULT_PORT
  config.timeout = config.timeout && config.timeout > 0 ? config.timeout : DEFAULT_TIMEOUT
  config.clientId ||= 'SQLiteCloud'

  config.verbose = parseBoolean(config.verbose)
  config.noBlob = parseBoolean(config.noBlob)
  config.compression = parseBoolean(config.compression)
  config.createDatabase = parseBoolean(config.createDatabase)
  config.nonlinearizable = parseBoolean(config.nonlinearizable)
  config.insecure = parseBoolean(config.insecure)

  if (!config.username || !config.password || !config.host) {
    console.error('SQLiteCloudConnection.validateConfiguration - missing arguments', config)
    throw new SQLiteCloudError('The user, password and host arguments must be specified.', { errorCode: 'ERR_MISSING_ARGS' })
  }

  if (!config.connectionString) {
    // build connection string from configuration, values are already validated
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    config.connectionString = `sqlitecloud://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`
  }

  return config
}

/** Parse connectionString like sqlitecloud://username:password@host:port/database?option1=xxx&option2=xxx into its components */
export function parseConnectionString(connectionString: string): SQLiteCloudConfig {
  try {
    // The URL constructor throws a TypeError if the URL is not valid.
    // in spite of having the same structure as a regular url
    // protocol://username:password@host:port/database?option1=xxx&option2=xxx)
    // the sqlitecloud: protocol is not recognized by the URL constructor in browsers
    // so we need to replace it with https: to make it work
    const knownProtocolUrl = connectionString.replace('sqlitecloud:', 'https:')
    const url = new URL(knownProtocolUrl)
    const options: { [key: string]: string } = {}

    url.searchParams.forEach((value, key) => {
      options[key] = value
    })

    const config: SQLiteCloudConfig = {
      username: url.username,
      password: url.password,
      host: url.hostname,
      port: url.port ? parseInt(url.port) : undefined,
      ...options
    }

    const database = url.pathname.replace('/', '') // pathname is database name, remove the leading slash
    if (database) {
      config.database = database
    }

    return config
  } catch (error) {
    throw new SQLiteCloudError(`Invalid connection string: ${connectionString}`)
  }
}

/** Returns true if value is 1 or true */
export function parseBoolean(value: string | boolean | null | undefined): boolean {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1'
  }
  return value ? true : false
}
