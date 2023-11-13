//
// utilities.ts - utility methods to manipulate SQL statements
//

import { SQLiteCloudConfig, SQLiteCloudError, SQLiteCloudDataTypes } from './types'

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

    return sqlParameter ? escapeSqlParameter(sqlParameter) : 'NULL'
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
  args: SQLiteCloudDataTypes[]
): { args: SQLiteCloudDataTypes[]; callback?: T | undefined; complete?: ErrorCallback } {
  // at least 1 callback?
  if (args && args.length > 0 && typeof args[args.length - 1] === 'function') {
    // at least 2 callbacks?
    if (args.length > 1 && typeof args[args.length - 2] === 'function') {
      return { args: args.slice(0, -2), callback: args[args.length - 2] as T, complete: args[args.length - 1] as T }
    }
    return { args: args.slice(0, -1), callback: args[args.length - 1] as T }
  }
  return { args }
}

/** Parse connectionString like sqlitecloud://usernam:password@host:port/database?option1=xxx&option2=xxx into its components */
export function parseConnectionString(connectionString: string): SQLiteCloudConfig {
  try {
    // The URL constructor throws a TypeError if the URL is not valid.
    const url = new URL(connectionString)
    const database = url.pathname.replace('/', '') // pathname is database name, remove the leading slash
    const options: { [key: string]: string } = {}

    url.searchParams.forEach((value, key) => {
      options[key] = value
    })

    return {
      username: url.username,
      password: url.password,
      host: url.hostname,
      port: url.port ? parseInt(url.port) : undefined,
      database,
      ...options
    }
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
