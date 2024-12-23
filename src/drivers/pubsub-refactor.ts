import { SQLiteCloudConnection } from './connection'
import SQLiteCloudTlsConnection from './connection-tls'
import { Database } from './database'
import { PubSubRefactorCallback, SQLiteCloudConfig } from './types'

export interface PubSubOptions {
  tableName?: string
  channelName?: string
  dbName?: string
}

export enum PUBSUB_ENTITY_TYPE {
  TABLE = 'TABLE',
  CHANNEL = 'CHANNEL'
}

const entityTypeModifiers = {
  [PUBSUB_ENTITY_TYPE.TABLE]: 'TABLE',
  [PUBSUB_ENTITY_TYPE.CHANNEL]: ''
}
const getDbFromConfig = (config: SQLiteCloudConfig) => new URL(config.connectionstring ?? '')?.pathname.split('/').pop() ?? ''
const formatCommand = (arr: string[]) => arr.reduce((acc, curr) => curr.length > 0 ? (acc + ' ' + curr) : acc, '') + ';'

/**
 * Pub/Sub class to receive changes on database tables or to send messages to channels.
 */
export class PubSub {
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

  public async listen<T>(options: PubSubOptions, callback: PubSubRefactorCallback): Promise<T> {
    const _dbName = options.dbName ? options.dbName : this.defaultDatabaseName;
    const [entityType, entityName] = options.channelName 
      ? [PUBSUB_ENTITY_TYPE.CHANNEL, options.channelName] : [PUBSUB_ENTITY_TYPE.TABLE, options.tableName]
    if (!entityName) {
      throw new Error('Must provide a channelName or tableName')
    }
    const pubSubEntityTypeModifier = entityTypeModifiers[entityType]


    const authCommand: string = await this.queryConnection.sql(formatCommand(['LISTEN', pubSubEntityTypeModifier, entityName, 'DATABASE', _dbName]))

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
  public unlisten(options: PubSubOptions): Promise<any> {
    // type this output
    const [entityType, entityName] = options.channelName ? [PUBSUB_ENTITY_TYPE.CHANNEL, options.channelName] : [PUBSUB_ENTITY_TYPE.TABLE, options.tableName]
    const entityTypeModifier = entityTypeModifiers[entityType]

    return this.queryConnection.sql(`UNLISTEN ${entityTypeModifier} ?;`, entityName)
  }

  /**
   * Create a channel to send messages to.
   * @param name Channel name
   * @param failIfExists Raise an error if the channel already exists
   */
  public async createChannel(name: string, failIfExists: boolean = true): Promise<any> {
    // type this output
    return await this.queryConnection.sql(`CREATE CHANNEL ?${failIfExists ? '' : ' IF NOT EXISTS'};`, name)
  }

  /**
   * Deletes a Pub/Sub channel.
   * @param name Channel name
   */
  public async removeChannel(name: string): Promise<any> {
    // type this output
    return await this.queryConnection.sql(`REMOVE CHANNEL ?;`, name)
  }

  /**
   * Send a message to the channel.
   */
  public notifyChannel(channelName: string, message: string): Promise<any> {
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
