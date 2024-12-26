import { expect } from '@jest/globals'
import { StorageClient } from '../_storage/StorageClient'
import { CHINOOK_DATABASE_URL } from '../../../test/shared'

const TEST_BUCKET_NAME = 'test_bucket'

const storage = new StorageClient(CHINOOK_DATABASE_URL,
  {
    headers: {
      'Content-Type': 'application/json'
    }
  }
)

describe('StorageClient', () => {
  it('should be able to create a bucket', async () => {
    expect(storage).toBeDefined()
    const getBucketResponse = await storage.getBucket(TEST_BUCKET_NAME)
    console.log(getBucketResponse)

    const { data, error } = await storage.createBucket(TEST_BUCKET_NAME)
    console.log(data, error)
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should get a bucket', async () => {
    expect(storage).toBeDefined()

    const { data, error } = await storage.getBucket(TEST_BUCKET_NAME)
    console.log(data)
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  
})
