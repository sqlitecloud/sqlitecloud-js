//
// database.ts - database driver api
//

// Trying as much as possible to be a drop-in replacement for SQLite3 API
// https://github.com/TryGhost/node-sqlite3/wiki/API
// https://github.com/TryGhost/node-sqlite3
// https://github.com/TryGhost/node-sqlite3/blob/master/lib/sqlite3.d.ts

import { SQLiteCloudConnection } from './connection'
import { SQLiteCloudRowset, SQLiteCloudRow } from './rowset'
import { SQLiteCloudConfig, SQLiteCloudDataTypes, SQLiteCloudError } from './types'
import { prepareSql, popCallback } from './utilities'
import { Statement } from './statement'

export type ErrorCallback = (error: Error | null) => void
export type ResultsCallback = (error: Error | null, results?: SQLiteCloudRowset | SQLiteCloudRow | SQLiteCloudDataTypes) => void
export type RowsCallback = (error: Error | null, rows?: SQLiteCloudRowset) => void
export type RowCallback = (error: Error | null, row?: SQLiteCloudRow) => void
export type RowCountCallback = (error: Error | null, rowCount?: number) => void

/**
 * Creating a Database object automatically opens a connection to the SQLite database.
 * When the connection is established the Database object emits an open event and calls
 * the optional provided callback. If the connection cannot be established an error event
 * will be emitted and the optional callback is called with the error information.
 */
export class Database {
  /** Create and initialize a database from a full configuration object, or connection string */
  constructor(config: SQLiteCloudConfig | string, _mode?: string | null, callback?: ErrorCallback) {
    this.config = typeof config === 'string' ? { connectionString: config } : config

    // opens first connection to the database automatically
    const connection = new SQLiteCloudConnection(this.config)
    this.connections = [connection]

    const job = new Promise<void>((resolve, reject) => {
      void connection
        .connect()
        .then(() => {
          if (callback) {
            callback.call(this, null)
          }
          this.emitEvent('open')
          resolve()
        })
        .catch(error => {
          reject(error)
          if (callback) {
            callback.call(this, error)
          } else {
            this.emitEvent('error', error)
          }
        })
    }).finally(() => {
      this.pending = this.pending.filter(p => p !== job)
    })
    this.pending.push(job)
  }

  /** Configuration used to open database connections */
  private config: SQLiteCloudConfig

  /** Database connections */
  private connections: SQLiteCloudConnection[]

  /** Pending operations */
  private pending: Promise<any>[] = []

  //
  // private methods
  //

  /** Returns first available connection from connection pool */
  private getConnection(): SQLiteCloudConnection {
    // TODO sqlitecloud-js / implement database connection pool #10
    return this.connections?.[0]
  }

  /** Emits given event with optional arguments */
  private emitEvent(event: string, ...args: any[]): void {
    // TODO sqlitecloud-js / database emit event #16
    if (this.config.verbose) {
      console.log(`Database.emitEvent - '${event}'`, ...args)
    }
  }

  /** Returns a single promise that can be waited on until all current operations are completed */
  private get pendingPromises(): Promise<any[]> {
    if (this.pending?.length > 0) {
      return Promise.all(this.pending)
    }
    return Promise.resolve([])
  }

  //
  // public methods
  //

  /** Enable verbose mode */
  public verbose(): this {
    this.config.verbose = true
    for (const connection of this.connections) {
      connection.verbose()
    }
    return this
  }

  /** Set a configuration option for the database */
  public configure(_option: any, _value: any): this {
    // https://github.com/TryGhost/node-sqlite3/wiki/API#configureoption-value
    return this
  }

  /**
   * Runs the SQL query with the specified parameters and calls the callback afterwards.
   * The callback will contain the results passed back from the server, for example in the
   * case of an update or insert, these would contain the number of rows modified, etc.
   * It does not retrieve any result data. The function returns the Database object for
   * which it was called to allow for function chaining.
   */
  public run(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<ResultsCallback>(params)
    void this.getConnection()
      .sendCommands(prepareSql(sql, ...args))
      .then(results => {
        callback?.call(this, null, results)
      })
      .catch(error => {
        if (callback) {
          callback?.call(this, error)
        } else {
          this.emitEvent('error', error)
        }
      })

    return this
  }

  /**
   * Runs the SQL query with the specified parameters and calls the callback with
   * a subsequent result row. The function returns the Database object to allow for
   * function chaining. The parameters are the same as the Database#run function,
   * with the following differences: The signature of the callback is `function(err, row) {}`.
   * If the result set is empty, the second parameter is undefined, otherwise it is an
   * object containing the values for the first row. The property names correspond to
   * the column names of the result set. It is impossible to access them by column index;
   * the only supported way is by column name.
   */
  public get(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<RowCallback>(params)
    void this.getConnection()
      .sendCommands(prepareSql(sql, ...args))
      .then(results => {
        if (results && results instanceof SQLiteCloudRowset && results.length > 0) {
          callback?.call(this, null, results[0])
        } else {
          callback?.call(this, null)
        }
      })
      .catch(error => {
        if (callback) {
          callback.call(this, error)
        } else {
          this.emitEvent('error', error)
        }
      })

    return this
  }

  /**
   * Runs the SQL query with the specified parameters and calls the callback
   * with all result rows afterwards. The function returns the Database object to
   * allow for function chaining. The parameters are the same as the Database#run
   * function, with the following differences: The signature of the callback is
   * function(err, rows) {}. rows is an array. If the result set is empty, it will
   * be an empty array, otherwise it will have an object for each result row which
   * in turn contains the values of that row, like the Database#get function.
   * Note that it first retrieves all result rows and stores them in memory.
   * For queries that have potentially large result sets, use the Database#each
   * function to retrieve all rows or Database#prepare followed by multiple Statement#get
   * calls to retrieve a previously unknown amount of rows.
   */
  public all(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<RowsCallback>(params)
    void this.getConnection()
      .sendCommands(args?.length > 0 ? prepareSql(sql, ...args) : sql)
      .then(rowset => {
        if (rowset && rowset instanceof SQLiteCloudRowset) {
          callback?.call(this, null, rowset)
        } else {
          callback?.call(this, null)
        }
      })
      .catch(error => {
        if (callback) {
          callback.call(this, error)
        } else {
          this.emitEvent('error', error)
        }
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
    const { args, callback, complete } = popCallback<RowCallback>(params)

    void this.getConnection()
      .sendCommands(args?.length > 0 ? prepareSql(sql, ...args) : sql)
      .then(rowset => {
        if (rowset && rowset instanceof SQLiteCloudRowset) {
          if (callback) {
            for (const row of rowset as SQLiteCloudRowset) {
              callback.call(this, null, row)
            }
          }
          if (complete) {
            ;(complete as RowCountCallback).call(this, null, rowset.numberOfRows)
          }
        } else callback?.call(this, new SQLiteCloudError('Invalid rowset'))
      })
      .catch(error => {
        if (callback) {
          callback.call(this, error)
        } else {
          this.emitEvent('error', error)
        }
      })

    return this
  }

  /**
   * Prepares the SQL statement and optionally binds the specified parameters and
   * calls the callback when done. The function returns a Statement object.
   * When preparing was successful, the first and only argument to the callback
   * is null, otherwise it is the error object. When bind parameters are supplied,
   * they are bound to the prepared statement before calling the callback.
   */
  public prepare(sql: string, ...params: any[]): Statement {
    const { args, callback } = popCallback(params)
    return new Statement(this, sql, ...args, callback)
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
        if (callback) {
          callback.call(this, error)
        } else {
          this.emitEvent('error', error)
        }
      })

    return this
  }

  /**
   * If the optional callback is provided, this function will be called when the
   * database was closed successfully or when an error occurred. The first argument
   * is an error object. When it is null, closing succeeded. If no callback is provided
   * and an error occurred, an error event with the error object as the only parameter
   * will be emitted on the database object. If closing succeeded, a close event with no
   * parameters is emitted, regardless of whether a callback was provided or not.
   */
  public close(callback?: ErrorCallback): void {
    if (this.connections?.length > 0) {
      for (const connection of this.connections) {
        connection.close()
      }
    }
    callback?.call(this, null)
  }

  /**
   * Loads a compiled SQLite extension into the database connection object.
   * @param path Filename of the extension to load.
   * @param callback  If provided, this function will be called when the extension
   * was loaded successfully or when an error occurred. The first argument is an
   * error object. When it is null, loading succeeded. If no callback is provided
   * and an error occurred, an error event with the error object as the only parameter
   * will be emitted on the database object.
   */
  public loadExtension(_path: string, callback?: ErrorCallback) {
    // TODO sqlitecloud-js / implement database loadExtension #17
    if (callback) {
      callback.call(this, new Error('Database.loadExtension - Not implemented'))
    } else {
      this.emitEvent('error', new Error('Database.loadExtension - Not implemented'))
    }
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

  //
  // extended APIs
  //

  public async sql(sql: TemplateStringsArray | string, ...values: any[]): Promise<any> {
    let preparedSql = ''

    // sql is a TemplateStringsArray, the 'raw' property is specific to TemplateStringsArray
    if (Array.isArray(sql) && 'raw' in sql) {
      sql.forEach((string, i) => {
        preparedSql += string + (i < values.length ? '?' : '')
      })
      preparedSql = prepareSql(preparedSql, ...values)
    } else {
      if (typeof sql === 'string') {
        if (values?.length > 0) {
          preparedSql = prepareSql(preparedSql, ...values)
        } else {
          preparedSql = sql
        }
      } else {
        throw new Error('Invalid sql')
      }
    }

    // wait for pending operations to complete
    await this.pendingPromises

    // execute prepared statement or regular statement
    return await this.getConnection().sendCommands(preparedSql)
  }
}
