import { Database } from '../drivers/database'
import { Fetch, fetchWithAuth } from './fetch'
import { SQLiteCloudPubSubClient } from './SQLiteCloudPubSubClient'
import { SQLiteCloudWebliteClient } from './SQLiteCloudWebliteClient'
import { SQLiteCloudFileClient } from './SQLiteCloudFileClient'
import { SQLiteCloudCommand } from '../drivers/types'
import { getDefaultDatabase } from './utils'

interface SQLiteCloudClientConfig {
  connectionString: string
  fetch?: Fetch
}



export class SQLiteCloudClient {
  private connectionString: string
  private fetch: Fetch

  constructor(config: SQLiteCloudClientConfig | string) {
    let connectionString: string
    let customFetch: Fetch | undefined

    if (typeof config === 'string') {
      connectionString =  config
    } else {
      connectionString = config.connectionString
      customFetch = config.fetch
    }

    this.connectionString = connectionString
    this.fetch = fetchWithAuth(this.connectionString, customFetch)
    this.defaultDb = getDefaultDatabase(this.connectionString) ?? ''
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
    return new SQLiteCloudPubSubClient(this.db)
  }

  get db() {
    return new Database(this.connectionString)
  }

  get weblite() {
    return new SQLiteCloudWebliteClient(this.connectionString, this.fetch)
  }

  get files() {
    return new SQLiteCloudFileClient(this.connectionString, this.fetch)
  }

  set defaultDb(dbName: string) {
    this.defaultDb = dbName
  }
}

export function createClient(config: SQLiteCloudClientConfig | string): SQLiteCloudClient {
  return new SQLiteCloudClient(config)
}
