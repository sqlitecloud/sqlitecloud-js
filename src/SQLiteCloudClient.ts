import { Database } from './drivers/database'
import { SQLiteCloudError, UploadOptions } from './drivers/types'
import { Fetch, fetchWithAuth } from './drivers/fetch'
import { DEFAULT_HEADERS, DEFAULT_WEBLITE_VERSION, WEBLITE_PORT } from './drivers/constants'
import { PubSub } from './drivers/pubsub-refactor'

interface SQLiteCloudClientConfig {
  connectionString: string
  fetch?: Fetch
}

interface ISQLiteCloudClient {
  pubSub: PubSub
  db: Database
  upload(databaseName: string, file: File | Buffer | Blob | string, opts?: UploadOptions): Promise<Response>
  download(databaseName: string): Promise<ArrayBuffer | Blob>
  delete(databaseName: string): Promise<Response>
  listDatabases(): Promise<any>
}

const parseConnectionString = (connectionString: string) => {
  const url = new URL(connectionString)
  return {
    host: url.hostname,
    port: url.port,
    database: url.pathname.slice(1),
    apiKey: url.searchParams.get('apikey')
  }
}

export class SQLiteCloudClient implements ISQLiteCloudClient {
  // TODO: Add support for custom fetch
  private fetch: Fetch
  private connectionString: string
  private webliteUrl: string
  private _db: Database
  private _pubSub: PubSub

  constructor(config: SQLiteCloudClientConfig | string) {
    let connectionString: string
    if (typeof config === 'string') {
      connectionString = config
    } else {
      connectionString = config.connectionString
    }

    this.connectionString = connectionString
    this._db = new Database(this.connectionString)
    this._pubSub = new PubSub(this.db)
    this.fetch = fetchWithAuth(this.connectionString)

    const { host } = parseConnectionString(this.connectionString)

    this.webliteUrl = `https://${host}:${WEBLITE_PORT}/${DEFAULT_WEBLITE_VERSION}/weblite`
  }

  get pubSub() {
    return this._pubSub
  }

  get db() {
    return this._db
  }

  async upload(databaseName: string, file: File | Buffer | Blob | string, opts: UploadOptions = {}) {
    const url = `${this.webliteUrl}/${databaseName}`
    let body
    if (file instanceof File) {
      body = file
    } else if (file instanceof Buffer) {
      body = file
    } else if (file instanceof Blob) {
      body = file
    } else {
      // string
      body = new Blob([file])
    }

    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Client-Info': DEFAULT_HEADERS['X-Client-Info']
    }

    const method = opts.replace ? 'PATCH' : 'POST'

    const response = await this.fetch(url, { method, body, headers })

    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to upload database: ${response.statusText}`)
    }

    return response
  }

  async download(databaseName: string) {
    const url = `${this.webliteUrl}/${databaseName}`
    const response = await this.fetch(url, { method: 'GET' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to download database: ${response.statusText}`)
    }
    const isNode = typeof window === 'undefined'
    return isNode ? await response.arrayBuffer() : await response.blob()
  }

  async delete(databaseName: string) {
    const url = `${this.webliteUrl}/${databaseName}`
    const response = await this.fetch(url, { method: 'DELETE' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to delete database: ${response.statusText}`)
    }
    return response
  }

  async listDatabases() {
    const url = `${this.webliteUrl}/databases`
    const response = await this.fetch(url, { method: 'GET' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to list databases: ${response.statusText}`)
    }
    return await response.json()
  }
}

export function createClient(config: SQLiteCloudClientConfig | string): SQLiteCloudClient {
  return new SQLiteCloudClient(config)
}
