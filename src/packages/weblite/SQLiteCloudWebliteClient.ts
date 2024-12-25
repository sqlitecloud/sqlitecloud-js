import { SQLiteCloudError, UploadOptions } from '../../drivers/types'
import { Fetch, fetchWithAuth } from '../utils/fetch'
import { DEFAULT_HEADERS } from '../../drivers/constants'
import { getAPIUrl } from '../utils'

interface WebliteResponse {
  data: any,
  error: SQLiteCloudError | null
}
interface SQLiteCloudWeblite {
  upload(dbName: string, file: File | Buffer | Blob | string, opts: UploadOptions): Promise<WebliteResponse>
  download(dbName: string): Promise<WebliteResponse>
  delete(dbName: string): Promise<WebliteResponse>
  listDatabases(): Promise<WebliteResponse>
  create(dbName: string): Promise<WebliteResponse>
}

export class SQLiteCloudWebliteClient implements SQLiteCloudWeblite {
  private webliteUrl: string
  private fetch: Fetch

  constructor(connectionString: string, fetch?: Fetch) {
    this.webliteUrl = getAPIUrl(connectionString, 'weblite')
    this.fetch = fetch || fetchWithAuth(connectionString)
  }

  async upload(
    dbName: string, 
    file: File | Buffer | Blob | string, 
    opts: UploadOptions = {}
  ) {
      const url = `${this.webliteUrl}/${dbName}`
      let body: File | Buffer | Blob | string
      let headers = {}
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
  
      headers = {
        ...(opts.headers ?? {}),
        ...headers,
        ...DEFAULT_HEADERS,
      }
  
      const method = opts.replace ? 'PATCH' : 'POST'
      const response = await this.fetch(url, { method, body, headers })

    if (!response.ok) {
      return { data: null, error: new SQLiteCloudError(`Failed to upload database: ${response.statusText}`) }
    }

    const data = await response.json()

    return { data, error: null }
  }

  async download(dbName: string) {
    const url = `${this.webliteUrl}/${dbName}`
    const response = await this.fetch(url, { method: 'GET' })
    if (!response.ok) {
      return { data: null, error: new SQLiteCloudError(`Failed to download database: ${response.statusText}`) }
    }
    const isNode = typeof window === 'undefined'
    const data = isNode ? await response.arrayBuffer() : await response.blob()
    return { data, error: null }
  }

  async delete(dbName: string) {
    const url = `${this.webliteUrl}/${dbName}`
    const response = await this.fetch(url, { method: 'DELETE' })
    if (!response.ok) {
      return { data: null, error: new SQLiteCloudError(`Failed to delete database: ${response.statusText}`) }
    }
    return { data: null, error: null }
  }

  async listDatabases() {
    const url = `${this.webliteUrl}/databases`
    const response = await this.fetch(url, { method: 'GET' })
    if (!response.ok) {
      return { data: null, error: new SQLiteCloudError(`Failed to list databases: ${response.statusText}`) }
    }
    return { data: await response.json(), error: null }
  }

  async create(dbName: string) {
    const response = await fetch(`${this.webliteUrl}/sql?sql=CREATE DATABASE ${dbName}`, { method: 'POST' })
    if (!response.ok) {
      return { data: null, error: new SQLiteCloudError(`Failed to create database: ${response.statusText}`) }
    }
    return { data: null, error: null }
  }
}

