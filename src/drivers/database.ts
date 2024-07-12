//
// database.ts - database driver api, implements and extends sqlite3
//

// Trying as much as possible to be a drop-in replacement for SQLite3 API
// https://github.com/TryGhost/node-sqlite3/wiki/API
// https://github.com/TryGhost/node-sqlite3
// https://github.com/TryGhost/node-sqlite3/blob/master/lib/sqlite3.d.ts

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { SQLiteCloudConnection } from './connection'
import { SQLiteCloudRowset } from './rowset'
import { SQLiteCloudConfig, SQLiteCloudError, RowCountCallback, SQLiteCloudArrayType } from './types'
import { prepareSql, popCallback } from './utilities'
import { Statement } from './statement'
import { ErrorCallback, ResultsCallback, RowCallback, RowsCallback } from './types'
import EventEmitter from 'eventemitter3'
import { isBrowser } from './utilities'
import { PubSub } from './pubsub'

// Uses eventemitter3 instead of node events for browser compatibility
// https://github.com/primus/eventemitter3

/**
 * Creating a Database object automatically opens a connection to the SQLite database.
 * When the connection is established the Database object emits an open event and calls
 * the optional provided callback. If the connection cannot be established an error event
 * will be emitted and the optional callback is called with the error information.
 */
export class Database extends EventEmitter {
  /** Create and initialize a database from a full configuration object, or connection string */
  constructor(config: SQLiteCloudConfig | string, callback?: ErrorCallback)
  constructor(config: SQLiteCloudConfig | string, mode?: number, callback?: ErrorCallback)
  constructor(config: SQLiteCloudConfig | string, mode?: number | ErrorCallback, callback?: ErrorCallback) {
    super()
    this.config = typeof config === 'string' ? { connectionstring: config } : config

    // mode is optional and so is callback
    // https://github.com/TryGhost/node-sqlite3/wiki/API#new-sqlite3databasefilename--mode--callback
    if (typeof mode === 'function') {
      callback = mode
      mode = undefined
    }

    // mode is ignored for now

    // opens first connection to the database automatically
    this.getConnection((error, _connection) => {
      if (callback) {
        callback.call(this, error)
      }
    })
  }

  /** Configuration used to open database connections */
  private config: SQLiteCloudConfig

  /** Database connections */
  private connections: SQLiteCloudConnection[] = []

  //
  // private methods
  //

  /** Returns first available connection from connection pool */
  private getConnection(callback: ResultsCallback<SQLiteCloudConnection>) {
    // TODO sqlitecloud-js / implement database connection pool #10
    if (this.connections?.length > 0) {
      callback?.call(this, null, this.connections[0])
    } else {
      // connect using websocket if tls is not supported or if explicitly requested
      const useWebsocket = isBrowser || this.config?.usewebsocket || this.config?.gatewayurl
      if (useWebsocket) {
        // socket.io transport works in both node.js and browser environments and connects via SQLite Cloud Gateway
        import('./connection-ws')
          .then(module => {
            this.connections.push(
              new module.default(this.config, error => {
                if (error) {
                  this.handleError(this.connections[0], error, callback)
                } else {
                  console.assert
                  callback?.call(this, null, this.connections[0])
                  this.emitEvent('open')
                }
              })
            )
          })
          .catch(error => {
            this.handleError(null, error, callback)
          })
      } else {
        // tls sockets work only in node.js environments
        import('./connection-tls')
          .then(module => {
            this.connections.push(
              new module.default(this.config, error => {
                if (error) {
                  this.handleError(this.connections[0], error, callback)
                } else {
                  console.assert
                  callback?.call(this, null, this.connections[0])
                  this.emitEvent('open')
                }
              })
            )
          })
          .catch(error => {
            this.handleError(null, error, callback)
          })
      }
    }
  }

  /** Handles an error by closing the connection, calling the callback and/or emitting an error event */
  private handleError(connection: SQLiteCloudConnection | null, error: Error, callback?: ErrorCallback): void {
    // an errored connection is thrown out
    if (connection) {
      this.connections = this.connections.filter(c => c !== connection)
      connection.close()
    }

    if (callback) {
      callback.call(this, error)
    } else {
      this.emitEvent('error', error)
    }
  }

  /**
   * Some queries like inserts or updates processed via run or exec may generate
   * an empty result (eg. no data was selected), but still have some metadata.
   * For example the server may pass the id of the last row that was modified.
   * In this case the callback results should be empty but the context may contain
   * additional information like lastID, etc.
   * @see https://github.com/TryGhost/node-sqlite3/wiki/API#runsql--param---callback
   * @param results Results received from the server
   * @returns A context object if one makes sense, otherwise undefined
   */
  private processContext(results?: any): Record<string, any> | undefined {
    if (results) {
      if (Array.isArray(results) && results.length > 0) {
        switch (results[0]) {
          case SQLiteCloudArrayType.ARRAY_TYPE_SQLITE_EXEC:
            return {
              lastID: results[2], // ROWID (sqlite3_last_insert_rowid)
              changes: results[3], // CHANGES(sqlite3_changes)
              totalChanges: results[4], // TOTAL_CHANGES (sqlite3_total_changes)
              finalized: results[5] // FINALIZED
            }
        }
      }
    }

    return undefined
  }

  /** Emits given event with optional arguments on the next tick so callbacks can complete first */
  private emitEvent(event: string, ...args: any[]): void {
    setTimeout(() => {
      this.emit(event, ...args)
    }, 0)
  }

  //
  // public methods
  //

  /**
   * Returns the configuration with which this database was opened.
   * The configuration is readonly and cannot be changed as there may
   * be multiple connections using the same configuration.
   * @returns {SQLiteCloudConfig} A configuration object
   */
  public getConfiguration(): SQLiteCloudConfig {
    return JSON.parse(JSON.stringify(this.config)) as SQLiteCloudConfig
  }

  /** Enable verbose mode */
  public verbose(): this {
    this.config.verbose = true
    for (const connection of this.connections) {
      connection.verbose()
    }
    return this
  }

  /** Set a configuration option for the database */
  public configure(_option: string, _value: any): this {
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
  public run<T>(sql: string, callback?: ResultsCallback<T>): this
  public run<T>(sql: string, params: any, callback?: ResultsCallback<T>): this
  public run(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<ResultsCallback>(params)
    const preparedSql = args?.length > 0 ? prepareSql(sql, ...args) : sql
    this.getConnection((error, connection) => {
      if (error || !connection) {
        this.handleError(null, error as Error, callback)
      } else {
        connection.sendCommands(preparedSql, (error, results) => {
          if (error) {
            this.handleError(connection, error, callback)
          } else {
            // context may include id of last row inserted, total changes, etc...
            const context = this.processContext(results)
            callback?.call(context || this, null, context ? context : results)
          }
        })
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
  public get<T>(sql: string, callback?: RowCallback<T>): this
  public get<T>(sql: string, params: any, callback?: RowCallback<T>): this
  public get(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<RowCallback>(params)
    const preparedSql = args?.length > 0 ? prepareSql(sql, ...args) : sql
    this.getConnection((error, connection) => {
      if (error || !connection) {
        this.handleError(null, error as Error, callback)
      } else {
        connection.sendCommands(preparedSql, (error, results) => {
          if (error) {
            this.handleError(connection, error, callback)
          } else {
            if (results && results instanceof SQLiteCloudRowset && results.length > 0) {
              callback?.call(this, null, results[0])
            } else {
              callback?.call(this, null)
            }
          }
        })
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
  public all<T>(sql: string, callback?: RowsCallback<T>): this
  public all<T>(sql: string, params: any, callback?: RowsCallback<T>): this
  public all(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<RowsCallback>(params)
    const preparedSql = args?.length > 0 ? prepareSql(sql, ...args) : sql
    this.getConnection((error, connection) => {
      if (error || !connection) {
        this.handleError(null, error as Error, callback)
      } else {
        connection.sendCommands(preparedSql, (error, results) => {
          if (error) {
            this.handleError(connection, error, callback)
          } else {
            if (results && results instanceof SQLiteCloudRowset) {
              callback?.call(this, null, results)
            } else {
              callback?.call(this, null)
            }
          }
        })
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
  public each<T>(sql: string, callback?: RowCallback<T>, complete?: RowCountCallback): this
  public each<T>(sql: string, params: any, callback?: RowCallback<T>, complete?: RowCountCallback): this
  public each(sql: string, ...params: any[]): this {
    // extract optional parameters and one or two callbacks
    const { args, callback, complete } = popCallback<RowCallback>(params)

    const preparedSql = args?.length > 0 ? prepareSql(sql, ...args) : sql
    this.getConnection((error, connection) => {
      if (error || !connection) {
        this.handleError(null, error as Error, callback)
      } else {
        connection.sendCommands(preparedSql, (error, rowset) => {
          if (error) {
            this.handleError(connection, error, callback)
          } else {
            if (rowset && rowset instanceof SQLiteCloudRowset) {
              if (callback) {
                for (const row of rowset) {
                  callback.call(this, null, row)
                }
              }
              if (complete) {
                ;(complete as RowCountCallback).call(this, null, rowset.numberOfRows)
              }
            } else {
              callback?.call(this, new SQLiteCloudError('Invalid rowset'))
            }
          }
        })
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
  public prepare<T = any>(sql: string, ...params: any[]): Statement<T> {
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
    this.getConnection((error, connection) => {
      if (error || !connection) {
        this.handleError(null, error as Error, callback)
      } else {
        connection.sendCommands(sql, (error, results) => {
          if (error) {
            this.handleError(connection, error, callback)
          } else {
            const context = this.processContext(results)
            callback?.call(context ? context : this, null)
          }
        })
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
    this.emitEvent('close')
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
  public loadExtension(_path: string, callback?: ErrorCallback): this {
    // TODO sqlitecloud-js / implement database loadExtension #17
    if (callback) {
      callback.call(this, new Error('Database.loadExtension - Not implemented'))
    } else {
      this.emitEvent('error', new Error('Database.loadExtension - Not implemented'))
    }
    return this
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

  /**
   * Sql is a promise based API for executing SQL statements. You can
   * pass a simple string with a SQL statement or a template string
   * using backticks and parameters in ${parameter} format. These parameters
   * will be properly escaped and quoted like when using a prepared statement.
   * @param sql A sql string or a template string in `backticks` format
   * @returns An array of rows in case of selections or an object with
   * metadata in case of insert, update, delete.
   */

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
          preparedSql = prepareSql(sql, ...values)
        } else {
          preparedSql = sql
        }
      } else {
        throw new Error('Invalid sql')
      }
    }

    return new Promise((resolve, reject) => {
      this.getConnection((error, connection) => {
        if (error || !connection) {
          reject(error)
        } else {
          connection.sendCommands(preparedSql, (error, results) => {
            if (error) {
              reject(error)
            } else {
              // metadata for operations like insert, update, delete?
              const context = this.processContext(results)
              resolve(context ? context : results)
            }
          })
        }
      })
    })
  }

  /**
   * PubSub class provides a Pub/Sub real-time updates and notifications system to
   * allow multiple applications to communicate with each other asynchronously.
   * It allows applications to subscribe to tables and receive notifications whenever
   * data changes in the database table. It also enables sending messages to anyone
   * subscribed to a specific channel.
   * @returns {PubSub} A PubSub object
   */
  public async getPubSub(): Promise<PubSub> {
    return new Promise((resolve, reject) => {
      this.getConnection((error, connection) => {
        if (error || !connection) {
          reject(error)
        } else {
          resolve(new PubSub(connection))
        }
      })
    })
  }
}
