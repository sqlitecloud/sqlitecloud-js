import { expect } from '@jest/globals'
import { StorageClient } from '../storage/StorageClient'
import { CHINOOK_DATABASE_URL } from '../../../test/shared'


const storage = new StorageClient(CHINOOK_DATABASE_URL)

describe('StorageClient', () => {
  it('should be able to create a bucket', async () => {
    expect(storage).toBeDefined()

    const bucket = await storage.createBucket('test-bucket')

    expect(bucket).toBeDefined()
  })
})


