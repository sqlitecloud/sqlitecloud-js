import { Fetch } from '../utils/fetch'


export interface SQLiteCloudClientConfig {
  connectionString: string
  global?: {
    fetch?: Fetch
    headers?: Record<string, string>
  }
}

export interface WebliteResponse {
  data: any, // TODO: type this
  error: SQLiteCloudError | null
}
export interface Weblite {
  upload(dbName: string, file: File | Buffer | Blob | string, opts: UploadOptions): Promise<WebliteResponse>
  download(dbName: string): Promise<WebliteResponse>
  delete(dbName: string): Promise<WebliteResponse>
  listDatabases(): Promise<WebliteResponse>
  create(dbName: string): Promise<WebliteResponse>
}


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
  getBucket(bucket: string): Promise<StorageResponse>
  deleteBucket(bucket: string): Promise<StorageResponse>
  listBuckets(): Promise<StorageResponse>
  upload(bucket: string, pathname: string, file: File | Buffer | Blob | string, options: { headers?: Record<string, string> }): Promise<StorageResponse>
  download(bucket: string, pathname: string): Promise<StorageResponse>
  remove(bucket: string, pathName: string): Promise<StorageResponse>
  listBucketContents(bucket: string): Promise<StorageResponse>
}