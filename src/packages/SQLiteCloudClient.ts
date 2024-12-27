import { Database } from '../drivers/database'
import { Fetch, fetchWithAuth } from './utils/fetch'
import { PubSubClient } from './_pubsub/PubSubClient'
import { WebliteClient } from './weblite/WebliteClient'
import { SQLiteCloudDataTypes, SQLiteCloudError } from '../drivers/types'
import { cleanConnectionString } from './utils'
import { SQLiteCloudClientConfig } from './types'
import { DEFAULT_HEADERS } from '../drivers/constants'

const validateConfig = (config: SQLiteCloudClientConfig | string) => {
  if (!(config)) throw new SQLiteCloudError('No configuration provided')
  if (typeof config === 'string') {
    if (!config.includes('sqlitecloud://')) throw new SQLiteCloudError('Invalid connection string')
  }

  if (typeof config === 'object') {
    if (!config.connectionString) throw new SQLiteCloudError('No connection string provided')
    if (!config.connectionString.includes('sqlitecloud://')) throw new SQLiteCloudError('Invalid connection string')
  }
}

export class SQLiteCloudClient {
  protected connectionString: string
  protected fetch: Fetch
  protected _globalHeaders: Record<string, string>
  protected _db: Database | null
  protected _pubSub: PubSubClient | null
  protected _weblite: WebliteClient | null

  constructor(config: SQLiteCloudClientConfig | string) {
    try {
      validateConfig(config)
      let connectionString: string
      let customFetch: Fetch | undefined
      let globalHeaders: Record<string, string> = {}

      if (typeof config === 'string') {
        connectionString = cleanConnectionString(config)
        globalHeaders = DEFAULT_HEADERS
      } else {
        connectionString = config.connectionString
        customFetch = config.global?.fetch
        globalHeaders = config.global?.headers ? { ...DEFAULT_HEADERS, ...config.global.headers } : DEFAULT_HEADERS
      }

      this.connectionString = connectionString
      this.fetch = fetchWithAuth(this.connectionString, customFetch)
      this._globalHeaders = globalHeaders
      this._db = null
      this._pubSub = null
      this._weblite = null

    } catch (error) {
      throw new SQLiteCloudError('failed to initialize SQLiteCloudClient')
    }
  }
  // Defaults to HTTP API
  async sql(sql: TemplateStringsArray | string, ...values: SQLiteCloudDataTypes[]) {
    return await this.weblite.sql(sql, ...values)
  }

  get db() {
    if (!this._db) {
      this._db = new Database(this.connectionString)
    }
    return this._db
  }

  get weblite() {
    if (!this._weblite) {
      this._weblite = new WebliteClient(this.connectionString, { 
        fetch: this.fetch, 
        headers: this._globalHeaders 
      })
    }
    return this._weblite
  }

  get pubSub() {
    if (!this._pubSub) {
      this._pubSub = new PubSubClient(
        this.db
      )
    }
    return this._pubSub
  }

  close() {
    if (this._db) this._db.close()
    if (this._pubSub) this._pubSub.close()
  }
}

export function createClient(config: SQLiteCloudClientConfig | string): SQLiteCloudClient {
  return new SQLiteCloudClient(config)
}
