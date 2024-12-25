import { Database } from '../drivers/database'
import { Fetch, fetchWithAuth } from './utils/fetch'
import { PubSubClient } from './pubsub/PubSubClient'
import { WebliteClient } from './weblite/SQLiteCloudWebliteClient'
import { StorageClient } from './storage/StorageClient'
import { SQLiteCloudCommand, SQLiteCloudError } from '../drivers/types'
import { cleanConnectionString, getDefaultDatabase } from './utils'

interface SQLiteCloudClientConfig {
  connectionString: string
  fetch?: Fetch
}

export class SQLiteCloudClient {
  protected connectionString: string
  protected fetch: Fetch
  protected _db: Database

  constructor(config: SQLiteCloudClientConfig | string) {
    try {
      if (!config) {
        throw new SQLiteCloudError('Invalid connection string or config')
      }
      let connectionString: string
      let customFetch: Fetch | undefined
  
      if (typeof config === 'string') {
        connectionString = cleanConnectionString(config)
      } else {
        connectionString = config.connectionString
        customFetch = config.fetch
      }
  
      this.connectionString = connectionString
      this.fetch = fetchWithAuth(this.connectionString, customFetch)
      this.defaultDb = getDefaultDatabase(this.connectionString) ?? ''
      this._db = new Database(this.connectionString)
    } catch (error) {
      throw new SQLiteCloudError('failed to initialize SQLiteCloudClient')
    }
  }

  async sql(sql: TemplateStringsArray | string | SQLiteCloudCommand, ...values: any[]) {
    this.db.exec(`USE DATABASE ${this.defaultDb}`)
    try {
      const result = await this.db.sql(sql, ...values)
      return { data: result, error: null }
    } catch (error) {
      return { error, data: null }
    }
  }

  get pubSub() {
    return new PubSubClient(this.db.getConfiguration())
  }

  get db() {
    return this._db
  }

  get weblite() {
    return new WebliteClient(this.connectionString, { customFetch: this.fetch })
  }

  get files() {
      return new StorageClient(this.connectionString, { customFetch: this.fetch })
  }

  get functions() {
    // return new SQLiteCloudFunctionsClient(this.connectionString, this.fetch)
    return null
  }

  set defaultDb(dbName: string) {
    this.defaultDb = dbName
  }
}

export function createClient(config: SQLiteCloudClientConfig | string): SQLiteCloudClient {
  return new SQLiteCloudClient(config)
}
