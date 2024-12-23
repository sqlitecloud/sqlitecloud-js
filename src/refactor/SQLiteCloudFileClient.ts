import { SQLiteCloudError } from "../drivers/types"
import { getAPIUrl } from "./utils"
import { Fetch, fetchWithAuth } from "./fetch"

interface SQLiteCloudFile {
  createBucket(bucket: string, path: string): Promise<Response>
  getBucket(bucket: string): Promise<any>
  deleteBucket(bucket: string): Promise<Response>
  listBuckets(): Promise<any>
  upload(bucket: string, pathname: string, file: File | Buffer | Blob | string, options: { contentType: string }): Promise<Response>
  download(bucket: string, pathname: string): Promise<Blob>
  remove(bucket: string, pathName: string): Promise<Response>
  list(bucket: string): Promise<any>
}

const FILES_DATABASE = 'files.sqlite'

export class SQLiteCloudFileClient implements SQLiteCloudFile {
  private filesUrl: string
  private webliteSQLUrl: string
  private fetch: Fetch

  constructor(connectionString: string, sql?: Fetch) { 
    this.filesUrl = getAPIUrl(connectionString, 'files')
    this.webliteSQLUrl = getAPIUrl(connectionString, 'weblite/sql')
    this.fetch = fetchWithAuth(connectionString, fetch)
  }

  async createBucket(bucket: string) {
    const url = `${this.webliteSQLUrl}?sql=USE DATABASE files; INSERT INTO files (Bucket) VALUES ('${bucket}');`
    const response = await this.fetch(url, { method: 'POST' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to create bucket: ${response.statusText}`)
    }
    return response.json()
  }

  async getBucket(bucket: string) {
    const url = `${this.filesUrl}/${bucket}`
    const response = await this.fetch(url, { method: 'GET' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to get bucket: ${response.statusText}`)
    }

    return response.json()
  }

  async deleteBucket(bucket: string) {
    const url = `${this.filesUrl}/${bucket}`
    const response = await this.fetch(url, { method: 'DELETE' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to delete bucket: ${response.statusText}`)
    }
    return response.json()
  }

  async listBuckets() {
    const encodedUrl = encodeURIComponent(`${this.webliteSQLUrl}?sql=USE DATABASE files.sqlite; SELECT * FROM files`)
    const response = await this.fetch(encodedUrl)
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to list buckets: ${response.statusText}`)
    }
    return response.json()
  }

  async upload(bucket: string, pathname: string, file: File | Buffer | Blob | string, options: { contentType: string }) {
    const url = `${this.filesUrl}/${bucket}/${pathname}`;
    const headers = {
      'Content-Type': options?.contentType || 'application/octet-stream'
    }
    const response = await this.fetch(url, { method: 'POST', body: file, headers })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to upload file: ${response.statusText}`)
    }
    return response.json()
  }

  async download(bucket: string, pathname: string) {
    const url = `${this.filesUrl}/${bucket}/${pathname}`;
    const response = await this.fetch(url, { method: 'GET' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to download file: ${response.statusText}`)
    }
    return response.blob()
  }

  async remove(bucket: string, pathName: string) {
    const url = `${this.filesUrl}/${bucket}/${pathName}`
    const response = await this.fetch(url, { method: 'DELETE' })
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to remove file: ${response.statusText}`)
    }
    return response.json()
  }

  async list(bucket: string) {
    const encodedUrl = encodeURIComponent(`${this.webliteSQLUrl}?sql=USE DATABASE files.sqlite; SELECT * FROM files WHERE bucket = '${bucket}'`)
    const response = await this.fetch(encodedUrl)
    if (!response.ok) {
      throw new SQLiteCloudError(`Failed to list files: ${response.statusText}`)
    }
    return response.json()
  }
}

