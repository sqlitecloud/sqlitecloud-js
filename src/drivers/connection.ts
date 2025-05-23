/**
 * connection.ts - base abstract class for sqlitecloud server connections
 */

import { SQLiteCloudConfig, SQLiteCloudError, ErrorCallback, ResultsCallback, SQLiteCloudCommand, SQLiteCloudDataTypes } from './types'
import { validateConfiguration } from './utilities'
import { OperationsQueue } from './queue'
import { anonimizeCommand, getUpdateResults } from './utilities'

/**
 * Base class for SQLiteCloudConnection handles basics and defines methods.
 * Actual connection management and communication with the server in concrete classes.
 */
export abstract class SQLiteCloudConnection {
  /** Parse and validate provided connectionstring or configuration */
  constructor(config: SQLiteCloudConfig | string, callback?: ErrorCallback) {
    if (typeof config === 'string') {
      this.config = validateConfiguration({ connectionstring: config })
    } else {
      this.config = validateConfiguration(config)
    }

    // connect transport layer to server
    this.connect(callback)
  }

  /** Configuration passed by client or extracted from connection string */
  protected config: SQLiteCloudConfig
  /** Returns the connection's configuration */
  public getConfig(): SQLiteCloudConfig {
    return { ...this.config }
  }

  /** Operations are serialized by waiting an any pending promises */
  protected operations = new OperationsQueue()

  //
  // internal methods (some are implemented in concrete classes using different transport layers)
  //

  /** Connect will establish a tls or websocket transport to the server based on configuration and environment */
  protected connect(callback?: ErrorCallback): this {
    this.operations.enqueue(done => {
      this.connectTransport(this.config, error => {
        if (error) {
          console.error(
            `SQLiteCloudConnection.connect - error connecting ${this.config.host as string}:${this.config.port as number} ${error.toString()}`,
            error
          )
          this.close()
        }
        if (callback) {
          callback.call(this, error || null)
        }
        done(error)
      })
    })
    return this
  }

  /* Opens a connection with the server and sends the initialization commands */
  protected abstract connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this

  /** Send a command, return the rowset/result or throw an error */
  protected abstract transportCommands(commands: string | SQLiteCloudCommand, callback?: ResultsCallback): this

  /** Will log to console if verbose mode is enabled */
  protected log(message: string, ...optionalParams: any[]): void {
    if (this.config.verbose) {
      message = anonimizeCommand(message)
      console.log(`${new Date().toISOString()} ${this.config.clientid as string}: ${message}`, ...optionalParams)
    }
  }

  //
  // public methods (some are abstract and implemented in concrete classes)
  //

  /** Returns true if connection is open */
  public abstract get connected(): boolean

  /** Enable verbose logging for debug purposes */
  public verbose(): void {
    this.config.verbose = true
  }

  /** Will enquee a command to be executed and callback with the resulting rowset/result/error */
  public sendCommands(commands: string | SQLiteCloudCommand, callback?: ResultsCallback): this {
    this.operations.enqueue(done => {
      if (!this.connected) {
        const error = new SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' })
        callback?.call(this, error)
        done(error)
      } else {
        this.transportCommands(commands, (error, result) => {
          callback?.call(this, error, result)
          done(error)
        })
      }
    })

    return this
  }

  /**
   * Sql is a promise based API for executing SQL statements. You can
   * pass a simple string with a SQL statement or a template string
   * using backticks and parameters in ${parameter} format. These parameters
   * will be properly escaped and quoted like when using a prepared statement.
   * @param sql A sql string or a template string in `backticks` format
   *  A SQLiteCloudCommand when the query is defined with question marks and bindings.
   * @returns An array of rows in case of selections or an object with
   * metadata in case of insert, update, delete.
   */
  public async sql(sql: TemplateStringsArray | string | SQLiteCloudCommand, ...values: any[]): Promise<any> {
    let commands = { query: '' } as SQLiteCloudCommand

    // sql is a TemplateStringsArray, the 'raw' property is specific to TemplateStringsArray
    if (Array.isArray(sql) && 'raw' in sql) {
      let query = ''
      sql.forEach((string, i) => {
        // TemplateStringsArray splits the string before each variable
        // used in the template. Add the question mark
        // to the end of the string for the number of used variables.
        query += string + (i < values.length ? '?' : '')
      })
      commands = { query, parameters: values }
    } else if (typeof sql === 'string') {
      commands = { query: sql, parameters: values }
    } else if (typeof sql === 'object') {
      commands = sql as SQLiteCloudCommand
    } else {
      throw new Error('Invalid sql')
    }

    return new Promise((resolve, reject) => {
      this.sendCommands(commands, (error, results) => {
        if (error) {
          reject(error)
        } else {
          // metadata for operations like insert, update, delete?
          const context = getUpdateResults(results)
          resolve(context ? context : results)
        }
      })
    })
  }

  /** Disconnect from server, release transport. */
  public abstract close(): this
}
