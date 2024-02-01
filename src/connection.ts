/**
 * connection.ts - handles low level communication with sqlitecloud server
 */

import { SQLiteCloudConfig, SQLiteCloudError, ErrorCallback, ResultsCallback } from './types'
import { parseConnectionString, parseBoolean, isBrowser } from './utilities'

/** Default timeout value for queries */
export const DEFAULT_TIMEOUT = 300 * 1000
/** Default tls connection port */
export const DEFAULT_PORT = 9960

/**
 * Base class for SQLiteCloudConnection handles basics and defines methods.
 * Actual connection management and communication with the server in concrete classes.
 */
export class SQLiteCloudConnection {
  /** Parse and validate provided connectionString or configuration */
  constructor(config: SQLiteCloudConfig | string, callback?: ErrorCallback) {
    if (typeof config === 'string') {
      this.config = this.validateConfiguration({ connectionString: config })
    } else {
      this.config = this.validateConfiguration(config)
    }

    // connect transport layer to server
    this.connect(callback)
  }

  /** Configuration passed by client or extracted from connection string */
  protected config: SQLiteCloudConfig

  /** Transport used to communicate with server */
  protected transport?: ConnectionTransport

  /** Operations are serialized by waiting an any pending promises */
  protected operations = new OperationsQueue()

  //
  // public properties
  //

  /** True if connection is open */
  public get connected(): boolean {
    return this.transport?.connected || false
  }

  /** Connect will establish a tls or websocket transport to the server based on configuration and environment */
  protected connect(callback?: ErrorCallback): this {
    this.operations.enqueue(done => {
      // connect using websocket if tls is not supported or if explicitly requested
      if (isBrowser || this.config?.useWebsocket || this.config?.gatewayUrl) {
        // socket.io transport works in both node.js and browser environments and connects via SQLite Cloud Gateway
        import('./transport-ws')
          .then(transport => {
            this.transport = new transport.WebSocketTransport()
            this.transport.connect(this.config, error => {
              if (error) {
                console.error(`SQLiteCloudConnection.connect - error while connecting WebSocketTransport: ${error.toString()}`, this.config, error)
                this.close()
              }
              callback?.call(this, error || null)
              done(error)
            })
          })
          .catch(error => {
            done(error)
          })
      } else {
        // tls sockets work only in node.js environments
        import('./transport-tls')
          .then(transport => {
            this.transport = new transport.TlsSocketTransport()
            this.transport.connect(this.config, error => {
              if (error) {
                console.error(`SQLiteCloudConnection.connect - error while connecting TlsSocketTransport: ${error.toString()}`, this.config, error)
                this.close()
              }
              callback?.call(this, error || null)
              done(error)
            })
          })
          .catch(error => {
            done(error)
          })
      }
    })

    return this
  }

  //
  // private methods
  //

  /** Validate configuration, apply defaults, throw if something is missing or misconfigured */
  protected validateConfiguration(config: SQLiteCloudConfig): SQLiteCloudConfig {
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
    config.sqliteMode = parseBoolean(config.sqliteMode)

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

  /** Will log to console if verbose mode is enabled */
  protected log(message: string, ...optionalParams: any[]): void {
    if (this.config.verbose) {
      message = anonimizeCommand(message)
      console.log(`${new Date().toISOString()} ${this.config.clientId as string}: ${message}`, ...optionalParams)
    }
  }

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
      if (this.transport) {
        this.transport.processCommands(commands, (error, result) => {
          callback?.call(this, error, result)
          done(error)
        })
      } else {
        const error = new SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' })
        callback?.call(this, error)
        done(error)
      }
    })

    return this
  }

  /** Disconnect from server, release connection. */
  public close(): this {
    this.operations.clear()
    this.transport?.close()
    this.transport = undefined
    return this
  }
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

//
// ConnectionTransport
//

/** ConnectionTransport implements the underlying transport layer for the connection */
export interface ConnectionTransport {
  /** True if connection is currently open */
  get connected(): boolean
  /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
  connect(config: SQLiteCloudConfig, callback?: ErrorCallback): this
  /** Send a command, return the rowset/result or throw an error */
  processCommands(commands: string, callback?: ResultsCallback): this
  /** Disconnect from server, release transport. */
  close(): this
}
