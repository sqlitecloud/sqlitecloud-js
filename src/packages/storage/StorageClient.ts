import { DEFAULT_HEADERS } from "../../drivers/constants"
import { SQLiteCloudError } from "../../drivers/types"
import { getAPIUrl } from "../utils"
import { Fetch, fetchWithAuth } from "../utils/fetch"

// TODO: add consistent return types


/**
 * StorageResponse
 * @param data - The data returned from the operation.
 * @param error - The error that occurred.
 */
interface StorageResponse {
  data: any
  error: any
}

/**
 * Storage
 * @param createBucket - Create a bucket.
 * @param getBucket - Get a bucket.
 * @param deleteBucket - Delete a bucket.
 * @param listBuckets - List all buckets.
 * @param upload - Upload a file.
 * @param download - Download a file.
 * @param remove - Remove a file.
 * @param list - List all files in a bucket.
 */
interface Storage {
  createBucket(bucket: string): Promise<StorageResponse>
  getBucket(bucket: string): Promise<StorageResponse>
  deleteBucket(bucket: string): Promise<StorageResponse>
  listBuckets(): Promise<StorageResponse>
  upload(bucket: string, pathname: string, file: File | Buffer | Blob | string, options: { headers?: Record<string, string> }): Promise<StorageResponse>
  download(bucket: string, pathname: string): Promise<StorageResponse>
  remove(bucket: string, pathName: string): Promise<StorageResponse>
  list(bucket: string): Promise<StorageResponse>
}
export class StorageClient implements Storage {
  protected filesUrl: string
  protected webliteSQLUrl: string
  protected headers: Record<string, string>
  protected fetch: Fetch

  constructor(
    connectionString: string, 
    options: { 
      customFetch?: Fetch, 
      headers?: Record<string, string> 
    } = {}) { 
    this.filesUrl = getAPIUrl(connectionString, 'files')
    this.webliteSQLUrl = getAPIUrl(connectionString, 'weblite/sql')
    this.fetch = options.customFetch || fetchWithAuth(connectionString)
    this.headers = options.headers ? { ...DEFAULT_HEADERS, ...options.headers } : { ...DEFAULT_HEADERS }
  }

  async createBucket(bucket: string) {
    const sql = `USE DATABASE files; INSERT INTO files (Bucket) VALUES ('${bucket}');`

    try {
      const response = await this.fetch(this.webliteSQLUrl, { 
        method: 'POST', 
        body: JSON.stringify({ sql }), 
        headers: this.headers 
      })

      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to create bucket: ${response.statusText}`)
      }

      return { data: await response.json(), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async getBucket(bucket: string) {
    const url = `${this.filesUrl}/${bucket}`
    const response = await this.fetch(url, { method: 'GET', headers: this.headers })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to get bucket: ${response.statusText}`)
    }

    return { data: await response.json(), error: null }
  }

  async deleteBucket(bucket: string) {
    const url = `${this.filesUrl}/${bucket}`
    try {
      const response = await this.fetch(url, { method: 'DELETE', headers: this.headers })
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to delete bucket: ${response.statusText}`)
      }
      return { data: await response.json(), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async listBuckets() {
    const sql = `USE DATABASE files.sqlite; SELECT * FROM files;`
    try {
      const response = await this.fetch(this.webliteSQLUrl, { 
        method: 'POST', 
        body: JSON.stringify({ sql }), 
        headers: this.headers 
      })
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to list buckets: ${response.statusText}`)
      }
      return { data: await response.json(), error: null }
    } catch (error) {
      return { 
        data: null, 
        error
      }
    }
  }

  async upload(bucket: string, pathname: string, file: File | Buffer | Blob | string, options: { headers?: Record<string, string> }) {
    const url = `${this.filesUrl}/${bucket}/${pathname}`;
    let _headers: Record<string, string> = {}
    if (file instanceof File) {
      _headers['Content-Type'] = file.type
    } else if (file instanceof Blob) {
      _headers['Content-Type'] = file.type
    } else if (file instanceof Buffer) {
      _headers['Content-Type'] = 'application/octet-stream'
    } else if (typeof file === 'string') {
      _headers['Content-Type'] = 'text/plain'
    } else {
      _headers['Content-Type'] = 'application/json'
    }
    const headers = {
      ..._headers,
      ...options.headers,
      ...this.headers
    }
    try {
      const response = await this.fetch(url, { method: 'POST', body: file, headers })
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to upload file: ${response.statusText}`)
      }
      return { data: await response.json(), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async download(bucket: string, pathname: string) {
    const url = `${this.filesUrl}/${bucket}/${pathname}`;
    try {
      const response = await this.fetch(url, { method: 'GET' })
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to download file: ${response.statusText}`)
      }
      let responseType = (response.headers.get('Content-Type') ?? 'text/plain').split(';')[0].trim()
      let data: any
      // TODO: add appropriate headers based on response type in Gateway
      if (responseType === 'application/json') {
        data = await response.json()
      } else if (responseType === 'application/octet-stream') {
        data = await response.blob()
      } else if (responseType === 'multipart/form-data') {
        data = await response.formData()
      } else {
        // default to text
        data = await response.text()
      }
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async remove(bucket: string, pathName: string) {
    const url = `${this.filesUrl}/${bucket}/${pathName}`
    try {
      const response = await this.fetch(url, { method: 'DELETE' })
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to remove file: ${response.statusText}`)
      }
      return { data: response.json(), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async list(bucket: string) {
    const sql = `USE DATABASE files.sqlite; SELECT * FROM files WHERE bucket = '${bucket}'`
    try {
      const response = await this.fetch(this.webliteSQLUrl, { 
        method: 'POST', 
        body: JSON.stringify({ sql }), 
        headers: this.headers 
      })
      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to list files: ${response.statusText}`)
      }
      return { data: await response.json(), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}
