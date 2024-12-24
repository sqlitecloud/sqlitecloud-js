import { SQLiteCloudConnection } from '../../drivers/connection'
import SQLiteCloudTlsConnection from '../../drivers/connection-tls'
import { Database } from '../../drivers/database'
import { getDbFromConfig } from '../utils'

export type PubSubCallback<T = any> = (error: Error | null, results?: T) => void

export interface ListenOptions {
  tableName: string
  dbName?: string
}

interface SQLiteCloudPubSub {
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
export class SQLiteCloudPubSubClient implements SQLiteCloudPubSub {
  // instantiate in createConnection?
  constructor(queryConnection: Database) {
    this.queryConnection = queryConnection
    this._pubSubConnection = null
    this.defaultDatabaseName = getDbFromConfig(queryConnection.getConfiguration())
  }

  private queryConnection: Database
  private _pubSubConnection: SQLiteCloudConnection | null
  private defaultDatabaseName: string
  /**
   * Listen to a channel and start to receive messages to the provided callback.
   * @param options Options for the listen operation. If tablename and channelName are provided, channelName is used. 
   * If no options are provided, the default database name is used.
   * @param callback Callback to be called when a message is received
   */

  private get pubSubConnection(): SQLiteCloudConnection {
    if (!this._pubSubConnection) {
      this._pubSubConnection = new SQLiteCloudTlsConnection(this.queryConnection.getConfiguration())
    }
    return this._pubSubConnection
  }

  public async listen<T>(options: ListenOptions, callback: PubSubCallback): Promise<T> {
    const _dbName = options.dbName ? options.dbName : this.defaultDatabaseName;
    const authCommand: string = await this.queryConnection.sql`LISTEN ${options.tableName} DATABASE ${_dbName};`

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
   * Stop receive messages from a table or channel.
   * @param entityType One of TABLE or CHANNEL
   * @param entityName Name of the table or the channel
   */
  public unlisten(options: ListenOptions): void {
    this.queryConnection.sql`UNLISTEN ${options.tableName} DATABASE ${options.dbName};`
  }

  public async subscribe(channelName: string, callback: PubSubCallback): Promise<any> {
    const authCommand: string = await this.queryConnection.sql`LISTEN ${channelName};`

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

  public unsubscribe(channelName: string): void {
    this.queryConnection.sql`UNLISTEN ${channelName};`
  }

  /**
   * Create a channel to send messages to.
   * @param name Channel name
   * @param failIfExists Raise an error if the channel already exists
   */
  public async create(channelName: string, failIfExists: boolean = true): Promise<any> {
    // type this output
    return await this.queryConnection.sql(`CREATE CHANNEL ?${failIfExists ? '' : ' IF NOT EXISTS'};`, channelName)
  }

  /**
   * Deletes a Pub/Sub channel.
   * @param name Channel name
   */
  public async delete(channelName: string): Promise<any> {
    // type this output
    return await this.queryConnection.sql(`REMOVE CHANNEL ?;`, channelName)
  }

  /**
   * Send a message to the channel.
   */
  public notify(channelName: string, message: string): Promise<any> {
    // type this output
    return this.queryConnection.sql`NOTIFY ${channelName} ${message};`
  }

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
          this.queryConnection.close()
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
