import { Database } from '../drivers/database'
import { Fetch, fetchWithAuth } from './utils/fetch'
import { PubSubClient } from './pubsub/PubSubClient'
import { WebliteClient } from './weblite/WebliteClient'
import { StorageClient } from './storage/StorageClient'
import { SQLiteCloudCommand, SQLiteCloudError } from '../drivers/types'
import { cleanConnectionString, getDefaultDatabase } from './utils'
import { FunctionsClient } from './_functions/FunctionsClient'
import { SQLiteCloudClientConfig } from './types'

export class SQLiteCloudClient {
  protected connectionString: string
  protected fetch: Fetch
  protected globalHeaders: Record<string, string>
  protected _defaultDb: string
  protected _db: Database

  constructor(config: SQLiteCloudClientConfig | string) {
    try {
      if (!config) {
        throw new SQLiteCloudError('Invalid connection string or config')
      }
      let connectionString: string
      let customFetch: Fetch | undefined
      let globalHeaders: Record<string, string> = {}
  
      if (typeof config === 'string') {
        connectionString = cleanConnectionString(config)
        globalHeaders = {}
      } else {
        connectionString = config.connectionString
        customFetch = config.global?.fetch
        globalHeaders = config.global?.headers ?? {}
      }

      this.connectionString = connectionString
      this.fetch = fetchWithAuth(this.connectionString, customFetch)
      this.globalHeaders = globalHeaders
      this._defaultDb = getDefaultDatabase(this.connectionString) ?? ''
      this._db = new Database(this.connectionString)

    } catch (error) {
      throw new SQLiteCloudError('failed to initialize SQLiteCloudClient')
    }
  }

  async sql(sql: TemplateStringsArray | string | SQLiteCloudCommand, ...values: any[]) {
    this.db.exec(`USE DATABASE ${this._defaultDb}`)
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
    return new WebliteClient(this.connectionString, { 
      customFetch: this.fetch, 
      headers: this.globalHeaders 
    })
  }

  get files() {
      return new StorageClient(this.connectionString, { 
        customFetch: this.fetch, 
        headers: this.globalHeaders 
      })
  }

  get functions() {
    return new FunctionsClient(this.connectionString, { 
      customFetch: this.fetch, 
      headers: this.globalHeaders 
    })
  }

  set defaultDb(dbName: string) {
    this._defaultDb = dbName
  }

  get defaultDb() {
    return this._defaultDb
  }
}

export function createClient(config: SQLiteCloudClientConfig | string): SQLiteCloudClient {
  return new SQLiteCloudClient(config)
}
