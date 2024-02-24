/**
 * connection.ts - base abstract class for sqlitecloud server connections
 */

import { SQLiteCloudConfig, SQLiteCloudError, ErrorCallback, ResultsCallback } from './types'
import { validateConfiguration } from './utilities'
import { OperationsQueue } from './queue'
import { anonimizeCommand } from './utilities'

/**
 * Base class for SQLiteCloudConnection handles basics and defines methods.
 * Actual connection management and communication with the server in concrete classes.
 */
export abstract class SQLiteCloudConnection {
  /** Parse and validate provided connectionString or configuration */
  constructor(config: SQLiteCloudConfig | string, callback?: ErrorCallback) {
    if (typeof config === 'string') {
      this.config = validateConfiguration({ connectionString: config })
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
  protected abstract transportCommands(commands: string, callback?: ResultsCallback): this

  /** Will log to console if verbose mode is enabled */
  protected log(message: string, ...optionalParams: any[]): void {
    if (this.config.verbose) {
      message = anonimizeCommand(message)
      console.log(`${new Date().toISOString()} ${this.config.clientId as string}: ${message}`, ...optionalParams)
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
  public sendCommands(commands: string, callback?: ResultsCallback): this {
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

  /** Disconnect from server, release transport. */
  public abstract close(): this
}
