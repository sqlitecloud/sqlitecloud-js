import { SQLiteCloudConnection } from '../../drivers/connection'
import SQLiteCloudTlsConnection from '../../drivers/connection-tls'
import { SQLiteCloudConfig } from '../../drivers/types'

/**
 * PubSubCallback
 * @param error - The error that occurred.
 * @param results - The results of the operation.
 */
export type PubSubCallback<T = any> = (error: Error | null, results?: T) => void

/**
 * ListenOptions
 * @param tableName - The name of the table to listen to.
 * @param dbName - The name of the database to listen to.
 */
export interface ListenOptions {
  tableName: string
  dbName?: string
}

/**
 * PubSub
 * @param listen - Listen to a channel and start to receive messages to the provided callback.
 * @param unlisten - Stop receive messages from a table or channel.
 * @param subscribe - Subscribe to a channel.
 * @param unsubscribe - Unsubscribe from a channel.
 * @param create - Create a channel.
 * @param delete - Delete a channel.
 * @param notify - Send a message to a channel.
 * @param setPubSubOnly - Set the connection to Pub/Sub only.
 * @param connected - Check if the connection is open.
 * @param close - Close the connection.
 */
export interface PubSub {
  listen<T>(options: ListenOptions, callback: PubSubCallback): Promise<T>
  unlisten(options: ListenOptions): void
  subscribe(channelName: string, callback: PubSubCallback): Promise<any>
  unsubscribe(channelName: string): void
  create(channelName: string, failIfExists: boolean): Promise<any>
  delete(channelName: string): Promise<any>
  notify(channelName: string, message: string): Promise<any>
  setPubSubOnly(): Promise<any>
  connected(): boolean
  close(): void
}

/**
 * Pub/Sub class to receive changes on database tables or to send messages to channels.
 */
export class PubSubClient implements PubSub {
  protected _pubSubConnection: SQLiteCloudConnection | null
  protected defaultDatabaseName: string
  protected config: SQLiteCloudConfig

  constructor(config: SQLiteCloudConfig) {
    this.config = config
    this._pubSubConnection = null
    this.defaultDatabaseName = config?.database ?? ''
  }

  /**
   * Listen to a channel and start to receive messages to the provided callback.
   * @param options Options for the listen operation. If tablename and channelName are provided, channelName is used. 
   * If no options are provided, the default database name is used.
   * @param callback Callback to be called when a message is received
   */

  get pubSubConnection(): SQLiteCloudConnection {
    if (!this._pubSubConnection) {
      this._pubSubConnection = new SQLiteCloudTlsConnection(this.config)
    }
    return this._pubSubConnection
  }

  async listen<T>(options: ListenOptions, callback: PubSubCallback): Promise<T> {
    const _dbName = options.dbName ? options.dbName : this.defaultDatabaseName;
    const authCommand: string = await this.pubSubConnection.sql`LISTEN ${options.tableName} DATABASE ${_dbName};`

    return new Promise((resolve, reject) => {
      this.pubSubConnection.sendCommands(authCommand, (error, results) => {
        if (error) {
          callback.call(this, error, null)
          reject(error)
        } else {
          // skip results from pubSub auth command
          if (results !== 'OK') {
            callback.call(this, null, results)
          }
          resolve(results)
        }
      })
    })
  }

  /**
   * Unlisten to a table.
   * @param options Options for the unlisten operation.
   */
  public unlisten(options: ListenOptions): void {
    this.pubSubConnection.sql`UNLISTEN ${options.tableName} DATABASE ${options.dbName};`
  }

  /**
   * Subscribe (listen) to a channel.
   * @param channelName The name of the channel to subscribe to.
   * @param callback Callback to be called when a message is received.
   */
  public async subscribe(channelName: string, callback: PubSubCallback): Promise<any> {
    const authCommand: string = await this.pubSubConnection.sql`LISTEN ${channelName};`

    return new Promise((resolve, reject) => {
      this.pubSubConnection.sendCommands(authCommand, (error, results) => {
        if (error) {
          callback.call(this, error, null)
          reject(error)
        } else {
          resolve(results)
        }
      })
    })
  }

  /**
   * Unsubscribe (unlisten) from a channel.
   * @param channelName The name of the channel to unsubscribe from.
   */
  public unsubscribe(channelName: string): void {
    this.pubSubConnection.sql`UNLISTEN ${channelName};`
  }

  /**
   * Create a channel to send messages to.
   * @param name Channel name
   * @param failIfExists Raise an error if the channel already exists
   */
  public async create(channelName: string, failIfExists: boolean = true): Promise<any> {
    return await this.pubSubConnection.sql(
      `CREATE CHANNEL ?${failIfExists ? '' : ' IF NOT EXISTS'};`, channelName
    )
  }

  /**
   * Deletes a Pub/Sub channel.
   * @param name Channel name
   */
  public async delete(channelName: string): Promise<any> {
    return await this.pubSubConnection.sql`REMOVE CHANNEL ${channelName};`
  }

  /**
   * Send a message to the channel.
   */
  public notify(channelName: string, message: string): Promise<any> {
    return this.pubSubConnection.sql`NOTIFY ${channelName} ${message};`
  }

  // DOUBLE CHECK THIS

  /**
   * Ask the server to close the connection to the database and
   * to keep only open the Pub/Sub connection.
   * Only interaction with Pub/Sub commands will be allowed.
   */
  public setPubSubOnly(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pubSubConnection.sendCommands('PUBSUB ONLY;', (error, results) => {
        if (error) {
          reject(error)
        } else {
          this.pubSubConnection.close()
          resolve(results)
        }
      })
    })
  }

  /** True if Pub/Sub connection is open. */
  public connected(): boolean {
    return this._pubSubConnection?.connected ?? false
  }

  /** Close Pub/Sub connection. */
  public close(): void {
    this._pubSubConnection?.close()
  }
}
