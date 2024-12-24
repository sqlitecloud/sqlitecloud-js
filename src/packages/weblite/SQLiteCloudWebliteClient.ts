import { SQLiteCloudError, UploadOptions } from '../../drivers/types'
import { Fetch, fetchWithAuth } from '../utils/fetch'
import { DEFAULT_HEADERS } from '../../drivers/constants'
import { getAPIUrl } from '../utils'

interface SQLiteCloudWeblite {
  upload(databaseName: string, file: File | Buffer | Blob | string, opts: UploadOptions): Promise<Response>
  download(databaseName: string): Promise<ArrayBuffer | Blob>
  delete(databaseName: string): Promise<Response>
  listDatabases(): Promise<any>
  create(databaseName: string): Promise<Response>
}

export class SQLiteCloudWebliteClient implements SQLiteCloudWeblite {
  private webliteUrl: string
  private fetch: Fetch

  constructor(connectionString: string, fetch?: Fetch) {
    this.webliteUrl = getAPIUrl(connectionString, 'weblite')
    this.fetch = fetch || fetchWithAuth(connectionString)
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

  async create(databaseName: string) {
    const response = await fetch(`${this.webliteUrl}/sql?sql=CREATE DATABASE ${databaseName}`, { method: 'POST' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to create database: ${response.statusText}`)
    }
    return response
  }
}

