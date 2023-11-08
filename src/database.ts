//
// database.ts - database driver api
//

// Trying as much as possible to be a drop-in replacement for SQLite3 API
// https://github.com/TryGhost/node-sqlite3/wiki/API
// https://github.com/TryGhost/node-sqlite3
// https://github.com/TryGhost/node-sqlite3/blob/master/lib/sqlite3.d.ts

import { SQLiteCloudConnection } from './protocol'
import { SQLiteCloudConfig } from './types/sqlitecloudconfig'

export type ErrorCallback = (error: Error | null) => void
export type RowsCallback = (error: Error | null, rows?: { [column: string]: any }[]) => void
export type RowCallback = (error: Error | null, row?: { [column: string]: any }) => void
export type RowCountCallback = (error: Error | null, rowCount?: number) => void

export class RunResult {
  //
}

export class Statement {
  //
}

export class Database {
  /** Create and initialize a database from a full configuration object, or connection string */
  constructor(config: SQLiteCloudConfig | string, mode?: string | null, callback?: (this: Database) => void) {
    this._config = typeof config === 'string' ? { connectionString: config } : config

    // opens first connection to the database automatically
    const connection = new SQLiteCloudConnection(this._config)
    this._connections = [connection]
    void connection.connect().then(() => {
      callback?.call(this)
    })
  }

  /** Configuration used to open database connections */
  private _config: SQLiteCloudConfig

  /** Database connections */
  private _connections: SQLiteCloudConnection[]

  //
  // private methods
  //

  /** Returns first available connection from connection pool */
  private getConnection(): SQLiteCloudConnection {
    // TODO sqlitecloud-js / implement database connection pool #10
    return this._connections?.[0]
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private prepareSql(sql: string, ...params: any[]): string {
    // TODO sqlitecloud-js / implement prepared statements #11
    return sql
  }

  //
  // public methods
  //

  public get(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<RowCallback>(params)
    void this.getConnection()
      .sendCommands(this.prepareSql(sql, ...args))
      .then(rowset => {
        const rows = rowset.toArray(0, 1)
        callback?.call(this, null, rows[0])
      })
      .catch(error => {
        callback?.call(this, error)
        console.error(error)
      })

    return this
  }

  public all(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<RowsCallback>(params)
    void this.getConnection()
      .sendCommands(this.prepareSql(sql, ...args))
      .then(rowset => {
        const rows = rowset.toArray()
        callback?.call(this, null, rows)
      })
      .catch(error => {
        callback?.call(this, error)
        console.error(error)
      })

    return this
  }

  /**
   * Runs the SQL query with the specified parameters and calls the callback once for each result row.
   * The function returns the Database object to allow for function chaining. The parameters are the
   * same as the Database#run function, with the following differences: The signature of the callback
   * is function(err, row) {}. If the result set succeeds but is empty, the callback is never called.
   * In all other cases, the callback is called once for every retrieved row. The order of calls correspond
   * exactly to the order of rows in the result set. After all row callbacks were called, the completion
   * callback will be called if present. The first argument is an error object, and the second argument
   * is the number of retrieved rows. If you specify only one function, it will be treated as row callback,
   * if you specify two, the first (== second to last) function will be the row callback, the last function
   * will be the completion callback. If you know that a query only returns a very limited number of rows,
   * it might be more convenient to use Database#all to retrieve all rows at once. There is currently no
   * way to abort execution.
   */
  public each(sql: string, ...params: any[]): this {
    // extract optional parameters and one or two callbacks
    let args = params
    let rowCallback: RowCallback
    let completeCallback: RowCountCallback
    if (params?.length > 0 && typeof params[params.length - 1] === 'function') {
      if (params?.length > 1 && typeof params[params.length - 2] === 'function') {
        rowCallback = params[params.length - 2]
        completeCallback = params[params.length - 1]
        args = params.slice(0, -2)
      } else {
        rowCallback = params[params.length - 1]
        args = params.slice(0, -1)
      }
    }

    void this.getConnection()
      .sendCommands(this.prepareSql(sql, ...args))
      .then(rowset => {
        if (rowCallback) {
          const rows = rowset.toArray()
          for (const row of rows) {
            rowCallback.call(this, null, row)
          }
        }
        completeCallback?.call(this, null, rowset.numberOfRows)
      })
      .catch(error => {
        rowCallback?.call(this, error)
      })

    return this
  }

  /**
   * Runs all SQL queries in the supplied string. No result rows are retrieved.
   * The function returns the Database object to allow for function chaining.
   * If a query fails, no subsequent statements will be executed (wrap it in a
   * transaction if you want all or none to be executed). When all statements
   * have been executed successfully, or when an error occurs, the callback
   * function is called, with the first parameter being either null or an error
   * object. When no callback is provided and an error occurs, an error event
   * will be emitted on the database object.
   */
  public exec(sql: string, callback?: ErrorCallback): this {
    void this.getConnection()
      .sendCommands(sql)
      .then(() => {
        callback?.call(this, null)
      })
      .catch(error => {
        callback?.call(this, error)
      })
    return this
  }

  /** Close database connections then callback */
  public close(callback?: ErrorCallback): void {
    const closingPromises = this._connections.map(connection =>
      connection.close().then(() => {
        this._connections = this._connections.filter(c => c !== connection)
      })
    )
    Promise.all(closingPromises)
      .then(() => {
        // all connections closed
        callback?.call(this, null)
      })
      .catch(error => {
        // emit error event
        callback?.call(this, error)
      })
  }

  /**
   * Allows the user to interrupt long-running queries. Wrapper around
   * sqlite3_interrupt and causes other data-fetching functions to be
   * passed an err with code = sqlite3.INTERRUPT. The database must be
   * open to use this function.
   */
  public interrupt(): void {
    // TODO sqlitecloud-js / implement database interrupt #13
  }
}

//
// utility methods
//

/**
 * Many of the methods in our API may contain a callback as their last argument.
 * This method will take the arguments array passed to the method and return an object
 * containing the arguments array with the callback removed (if any), and the callback itself.
 */
function popCallback<T extends (err: Error | null) => void = (err: Error | null) => void>(args: any[]): { args: any[]; callback?: T | undefined } {
  if (args && args.length > 0 && typeof args[args.length - 1] === 'function') {
    return { args: args.slice(0, -1), callback: args[args.length - 1] as T }
  }
  return { args }
}
