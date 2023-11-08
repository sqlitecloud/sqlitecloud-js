//
// utilities.ts - utility methods to manipulate SQL statements
//

import { SQLiteCloudError } from './protocol'

export type SQLiteTypes = string | number | boolean | Record<string, unknown> | Buffer | undefined | null

/** Takes a generic value and escapes it so it can replace ? as a binding in a prepared SQL statement */
export function escapeSqlParameter(param: SQLiteTypes): string {
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
export function prepareSql(sql: string, ...params: (SQLiteTypes | SQLiteTypes[])[]): string {
  // parameters where passed as an array of parameters?
  if (params?.length === 1 && Array.isArray(params[0])) {
    params = params[0]
  }

  // replace $named parameters passed as an object?
  if (params?.length === 1 && params[0] && typeof params[0] === 'object') {
    const namedParams = params[0] as Record<string, SQLiteTypes>
    for (const [paramKey, param] of Object.entries(namedParams)) {
      if (!paramKey.startsWith('$')) {
        throw new SQLiteCloudError(`Invalid named parameter: ${paramKey}`)
      }
      const escapedParam = escapeSqlParameter(param)
      sql = sql.replace(new RegExp(`\\${paramKey}`, 'g'), escapedParam)
    }
    return sql
  }

  // replace ? parameters passed as args or as an array
  let parameterIndex = 0
  const preparedSql = sql.replace(/\?/g, () => {
    if (parameterIndex >= params.length) {
      throw new SQLiteCloudError('Not enough parameters')
    }
    // replace ? placeholder with a safely escaped parameter
    const sqlParameter = params[parameterIndex++]
    if (sqlParameter) {
      return escapeSqlParameter(sqlParameter as SQLiteTypes)
    }
    return 'NULL'
  })

  return preparedSql
}
