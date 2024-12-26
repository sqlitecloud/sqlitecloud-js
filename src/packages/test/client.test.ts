import { CHINOOK_DATABASE_URL } from '../../../test/shared'
import { SQLiteCloudClient } from '../SQLiteCloudClient'

const DEFAULT_TABLE_NAME = 'albums';

const client = new SQLiteCloudClient(CHINOOK_DATABASE_URL)

describe('SQLiteCloudClient test suite', () => {
  it('should be able to create a client', () => {
    expect(client).toBeDefined()
    expect(client).toBeInstanceOf(SQLiteCloudClient)
  })

  it('should throw errors if no valid params are provided', () => {
    expect(() => new SQLiteCloudClient('')).toThrow()
    expect(() => new SQLiteCloudClient({ connectionString: '' })).toThrow()
    expect(() => new SQLiteCloudClient({ connectionString: 'invalid' })).toThrow()
  })

  it('should be able to query the database via HTTP', async () => {
    const { data, error } = await client.sql`SELECT * FROM ${DEFAULT_TABLE_NAME}`;
    expect(data).toBeDefined()
    expect(error).toBeNull()
  })
})
