//
// query.ts
//
// A small browser-friendly query helper. It opens a SQLite Cloud connection
// over WebSocket (via the SQLite Cloud Gateway), runs a single SQL statement
// and normalizes the result into `{ rows }`.
//
// The error types are kept local to this file so the example has no backend
// dependencies and can be bundled for the browser as-is.
//

import { Database, SQLiteCloudConfig } from '@sqlitecloud/drivers'

/** Shape of a structured error thrown by `runQuery`. */
export interface QueryError {
  name: string
  status: number
  endpoint: string
  message: string
  body?: unknown
}

/** Error thrown by `runQuery` carrying structured details. */
export class ClientError extends Error {
  details: QueryError

  constructor(message: string, details: QueryError) {
    super(message)
    this.name = 'ClientError'
    this.details = details
  }
}

/** Type guard for {@link ClientError}. */
export function isClientError(error: unknown): error is ClientError {
  return error instanceof ClientError
}

/**
 * Open a WebSocket connection to SQLite Cloud, run a single SQL statement
 * and return the result normalized into `{ rows }`.
 *
 * @param arrayMode when true rows are returned as arrays (via `row.getData()`),
 *                  otherwise as plain objects.
 * @param sql       the SQL statement to execute. May contain `?` placeholders.
 * @param params    positional parameters bound to the statement.
 * @param config    SQLite Cloud connection config. In the browser the driver
 *                  always connects via WebSocket; pass `gatewayurl` to point at
 *                  a specific gateway, or rely on the default derived from the host.
 */
export const runQuery = async (
  arrayMode = false,
  sql: string,
  params: unknown[] = [],
  config: SQLiteCloudConfig
): Promise<{ rows: unknown[] }> => {
  let client: Database | null = null

  try {
    // Wrap the Database connection in a Promise to handle async connection errors.
    // `usewebsocket` is implied in the browser, but we set it explicitly so the
    // same code also works under Node.js / tests.
    client = await new Promise<Database>((resolve, reject) => {
      const db = new Database({ ...config, usewebsocket: true }, error => {
        if (error) {
          console.log('Database connection error:', error)
          reject(error)
        } else {
          resolve(db)
        }
      })
    })

    // Execute the SQL query with the provided parameters.
    const result = await client.sql(sql, ...params)

    let rows: unknown[]
    if (Array.isArray(result)) {
      // Transform rows to arrays if arrayMode is true, otherwise return as objects.
      rows = arrayMode ? result.map((row: any) => row.getData()) : result
    } else if (result instanceof ArrayBuffer) {
      rows = [{ byteLength: result.byteLength }]
    } else {
      // Scalar result (e.g. a write returning lastID/changes or a single value).
      rows = [{ result }]
    }

    return { rows }
  } catch (error: any) {
    if (isClientError(error)) {
      throw error
    }
    const errorMessage = error?.message || 'Failed to execute database query'
    throw new ClientError(`Database query failed: ${errorMessage}`, {
      name: 'DatabaseQueryError',
      status: 500,
      endpoint: 'runQuery',
      message: `Database query failed: ${errorMessage}`,
      body: { sql, params, originalError: error }
    })
  } finally {
    if (client) client.close()
  }
}
