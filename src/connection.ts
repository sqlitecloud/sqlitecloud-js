/**
 * connection.ts - handles low level communication with sqlitecloud server
 */

import { SQLiteCloudConfig, SQLCloudRowsetMetadata, SQLiteCloudError, SQLiteCloudDataTypes, ErrorCallback, ResultsCallback } from './types'
import { SQLiteCloudRowset } from './rowset'
import { parseConnectionString, parseBoolean } from './utilities'

/** Default timeout value for queries */
export const DEFAULT_TIMEOUT = 300 * 1000

/** Default tls connection port */
export const DEFAULT_PORT = 9960

/**
 * Base class for SQLiteCloudConnection handles basics and defines methods.
 * Actual connection management and communication with the server in concrete classes.
 */
export abstract class SQLiteCloudConnection {
  /** Parse and validate provided connectionString or configuration */
  constructor(config: SQLiteCloudConfig | string, callback?: ErrorCallback) {
    if (typeof config === 'string') {
      this.config = this.validateConfiguration({ connectionString: config })
    } else {
      this.config = this.validateConfiguration(config)
    }
    this.connect(callback)
  }

  /** Configuration passed by client or extracted from connection string */
  protected config: SQLiteCloudConfig

  /** Operations are serialized by waiting an any pending promises */
  protected operations = new OperationsQueue()

  //
  // public properties
  //

  /** True if connection is open */
  public abstract get connected(): boolean

  //
  // private methods
  //

  /** Validate configuration, apply defaults, throw if something is missing or misconfigured */
  protected validateConfiguration(config: SQLiteCloudConfig): SQLiteCloudConfig {
    if (config.connectionString) {
      config = {
        ...config,
        ...parseConnectionString(config.connectionString)
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
    config.sqliteMode = parseBoolean(config.sqliteMode)

    if (!config.username || !config.password || !config.host) {
      throw new SQLiteCloudError('The user, password and host arguments must be specified.', { errorCode: 'ERR_MISSING_ARGS' })
    }

    return config
  }

  /** Will log to console if verbose mode is enabled */
  protected log(message: string, ...optionalParams: any[]): void {
    if (this.config.verbose) {
      message = anonimizeCommand(message)
      console.log(`${new Date().toISOString()} ${this.config.clientId as string}: ${message}`, ...optionalParams)
    }
  }

  /** Initialization commands sent to database when connection is established */
  protected get initializationCommands(): string {
    // first user authentication, then all other commands
    const config = this.config
    let commands = `AUTH USER ${config.username || ''} ${config.passwordHashed ? 'HASH' : 'PASSWORD'} ${config.password || ''}; `

    if (config.database) {
      if (config.createDatabase && !config.dbMemory) {
        commands += `CREATE DATABASE ${config.database} IF NOT EXISTS; `
      }
      commands += `USE DATABASE ${config.database}; `
    }
    if (config.sqliteMode) {
      commands += 'SET CLIENT KEY SQLITE TO 1; '
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

  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  protected abstract connect(callback?: ErrorCallback): this

  /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
  protected abstract processCommands(commands: string, callback?: ResultsCallback): this

  //
  // public methods
  //

  /** Enable verbose logging for debug purposes */
  public verbose(): void {
    this.config.verbose = true
  }

  /** Will enquee a command to be executed and callback with the resulting rowset/result/error */
  public sendCommands(commands: string, callback?: ResultsCallback): this {
    this.operations.enqueue(done => {
      this.processCommands(commands, (error, result) => {
        callback?.call(this, error, result)
        done(error)
      })
    })

    return this
  }

  /** Disconnect from server, release connection. */
  public abstract close(): this
}

//
// OperationsQueue - used to linearize operations on the connection
//

type OperationCallback = (error: Error | null) => void
type Operation = (done: OperationCallback) => void

export class OperationsQueue {
  private queue: Operation[] = []
  private isProcessing = false

  /** Add operations to the queue, process immediately if possible, else wait for previous operations to complete */
  public enqueue(operation: Operation): void {
    this.queue.push(operation)
    if (!this.isProcessing) {
      this.processNext()
    }
  }

  /** Clear the queue */
  public clear(): void {
    this.queue = []
    this.isProcessing = false
  }

  /** Process the next operation in the queue */
  private processNext(): void {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const operation = this.queue.shift()
    operation?.(() => {
      // could receive (error) => { ...
      // if (error) {
      //   console.warn('OperationQueue.processNext - error in operation', error)
      // }

      // process the next operation in the queue
      this.processNext()
    })
  }
}

//
// utility functions
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
