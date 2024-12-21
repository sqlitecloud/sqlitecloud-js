import { SQLiteCloudConnection } from './connection'
import SQLiteCloudTlsConnection from './connection-tls'
import { PubSubCallback } from './types'

interface PubSubOptions {
  tableName: string
  dbName?: string
}


/**
 * Pub/Sub class to receive changes on database tables or to send messages to channels.
 */
export class PubSub {
  constructor(connection: SQLiteCloudConnection) {
    this.connection = connection
    this.connectionPubSub = new SQLiteCloudTlsConnection(connection.getConfig())
  }

  private connection: SQLiteCloudConnection
  private connectionPubSub: SQLiteCloudConnection

  /**
   * Listen to a channel and start to receive messages to the provided callback.
   * @param options Options for the listen operation
   * @param callback Callback to be called when a message is received
   */

  public async listen<T>(options: PubSubOptions, callback: PubSubCallback): Promise<T> {
    if (options.dbName) {
      try {
        await this.connection.sql(`USE DATABASE ${options.dbName};`)
      } catch (error) {
        console.error(error)
      }
    }

    const authCommand: string = await this.connection.sql(`LISTEN TABLE ${options.tableName};`)

    return new Promise((resolve, reject) => {
      this.connectionPubSub.sendCommands(authCommand, (error, results) => {
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
  public async unlisten(entityType: string, entityName: string): Promise<any> {
    const subject = entityType === 'TABLE' ? 'TABLE ' : ''

    return this.connection.sql(`UNLISTEN ${subject}?;`, entityName)
  }

  /**
   * Create a channel to send messages to.
   * @param name Channel name
   * @param failIfExists Raise an error if the channel already exists
   */
  public async createChannel(name: string, failIfExists: boolean = true): Promise<any> {
    let notExistsCommand = ''
    if (!failIfExists) {
      notExistsCommand = ' IF NOT EXISTS'
    }

    return this.connection.sql(`CREATE CHANNEL ?${notExistsCommand};`, name)
  }

  /**
   * Deletes a Pub/Sub channel.
   * @param name Channel name
   */
  public async removeChannel(name: string): Promise<any> {
    return this.connection.sql(`REMOVE CHANNEL ?;`, name)
  }

  /**
   * Send a message to the channel.
   */
  public notifyChannel(channelName: string, message: string): Promise<any> {
    return this.connection.sql`NOTIFY ${channelName} ${message};`
  }

  /**
   * Ask the server to close the connection to the database and
   * to keep only open the Pub/Sub connection.
   * Only interaction with Pub/Sub commands will be allowed.
   */
  public setPubSubOnly(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.connection.sendCommands('PUBSUB ONLY;', (error, results) => {
        if (error) {
          reject(error)
        } else {
          this.connection.close()
          resolve(results)
        }
      })
    })
  }

  /** True if Pub/Sub connection is open. */
  public connected(): boolean {
    return this.connectionPubSub.connected
  }

  /** Close Pub/Sub connection. */
  public close(): void {
    this.connectionPubSub.close()
  }
}
