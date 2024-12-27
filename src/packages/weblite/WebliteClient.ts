import { SQLiteCloudDataTypes, SQLiteCloudError, UploadOptions } from '../../drivers/types'
import { Fetch, fetchWithAuth } from '../utils/fetch'
import { DEFAULT_HEADERS } from '../../drivers/constants'
import { getAPIUrl, getDefaultDatabase } from '../utils'

// Weblite Client - interact with SQLite Cloud via HTTP
export class WebliteClient {
  protected baseUrl?: string // /weblite url
  protected headers: Record<string, string>
  protected fetch: Fetch
  protected _defaultDatabase?: string

  constructor(
    connectionString: string, // sqlitecloud://xxx.xxx.xxx:port/database?apikey=xxx
    options: {
      fetch?: Fetch,
      headers?: Record<string, string>
    } = {
      headers: {}
    }
  ) {
    this.baseUrl = getAPIUrl(connectionString, 'weblite')
    this.fetch = options?.fetch || fetchWithAuth(connectionString)
    this.headers = { ...DEFAULT_HEADERS, ...options.headers }
    this._defaultDatabase = getDefaultDatabase(connectionString)
  }

  async sql(sql: TemplateStringsArray | string, ...values: SQLiteCloudDataTypes[]) {
    const url = `${this.baseUrl}/sql`

    try {
      let _sql = this._defaultDatabase ? `USE DATABASE ${this._defaultDatabase}; ` : '';

      if (Array.isArray(sql) && 'raw' in sql) { // check raw property?
        sql.forEach((string, i) => {
          // TemplateStringsArray splits the string before each variable
          // used in the template. Add the question mark
          // to the end of the string for the number of used variables.
          _sql += string + (i < values.length ? '?' : '')
        })
      } else if (typeof sql === 'string') {
          _sql = _sql + sql
      } else {
        throw new SQLiteCloudError('Invalid sql')
      }

      const response = await this.fetch(url, { 
        method: 'POST', 
        body: JSON.stringify({ sql: _sql, bind: values }),
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to execute sql: ${response.statusText}`)
      }
      return { error: null, ...(await response.json()) }
    } catch (error) {
      return { data: null, error }
    }
  }

  get defaultDatabase() {
    return this._defaultDatabase
  }
  // Set default database for .sql() calls
  useDatabase(name: string) {
    this._defaultDatabase = name
    return this
  }


  async createDatabase(filename: string) {
    return await this.sql`CREATE DATABASE ${filename}`;
  }

  async uploadDatabase(
    filename: string, 
    database: File | Buffer | Blob | string, 
    opts: UploadOptions = {}
  ) {
      const filenamePath = encodeURIComponent(filename)
      const url = `${this.baseUrl}/${filenamePath}`

      let body: File | Buffer | Blob | string
      if (database instanceof File) {
        body = database
      } else if (database instanceof Buffer) {
        body = database
      } else if (database instanceof Blob) {
        body = database
      } else {
        // string
        body = new Blob([database])
      }
  
      const headers = {
        'Content-Type': 'application/octet-stream',
        ...(opts.headers ?? {}),
        ...this.headers,
        ...DEFAULT_HEADERS,
      }
  
      const method = opts.replace ? 'PATCH' : 'POST'

      try {
        const response = await this.fetch(url, { method, body, headers }) 
        if (!response.ok) {
          throw new SQLiteCloudError(`Failed to upload database: ${response.statusText}`)
        }

        return { error: null, ...(await response.json()) }
      } catch (error) {
        return { data: null, error }
    }
  }

  async downloadDatabase(
    filename: string, 
  ) {
    const filenamePath = encodeURIComponent(filename)
    const url = `${this.baseUrl}/${filenamePath}`
    try {
      const response = await this.fetch(url, { method: 'GET', headers: this.headers })
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to download database: ${response.statusText}`)
      }

      const isNode = typeof window === 'undefined'
      const data = isNode ? await response.arrayBuffer() : await response.blob()
      return { error: null, data }
    } catch (error) {
      return { data: null, error }
    }
  }

  async deleteDatabase(filename: string) {
    const filenamePath = encodeURIComponent(filename)
    const url = `${this.baseUrl}/${filenamePath}`
    try {
      const response = await this.fetch(
        url, 
        { 
          method: 'DELETE', 
          headers: this.headers 
        }
      )
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to delete database: ${response.statusText}`)
      }
      return { error: null, ...(await response.json()) }
    } catch (error) {
      return { data: null, error }
    }
  }

  async listDatabases() {
    const url = `${this.baseUrl}/databases`
    try {
      const response = await this.fetch(url, { method: 'GET', headers: this.headers })
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to list databases: ${response.statusText}`)
      }
      return { error: null, ...(await response.json()) }
    } catch (error) {
      return { data: null, error }
    }
  }
}

