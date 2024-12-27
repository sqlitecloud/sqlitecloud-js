import { CHINOOK_DATABASE_URL } from '../../../test/shared'
import { SQLiteCloudClient } from '../SQLiteCloudClient'

const DEFAULT_TABLE_NAME = 'albums';



describe('SQLiteCloudClient test suite', () => {
  it('should be able to create a client', () => {
    const client = new SQLiteCloudClient(CHINOOK_DATABASE_URL)
    expect(client).toBeDefined()
    expect(client).toBeInstanceOf(SQLiteCloudClient)
  })

  it('should throw errors if no valid params are provided', () => {
    expect(() => new SQLiteCloudClient('')).toThrow()
    expect(() => new SQLiteCloudClient({ connectionString: '' })).toThrow()
    expect(() => new SQLiteCloudClient({ connectionString: 'invalid' })).toThrow()
  })

  it('should be able to query the database via HTTP', async () => {
    const client = new SQLiteCloudClient(CHINOOK_DATABASE_URL)
    const { data, error } = await client.sql`SELECT * FROM ${DEFAULT_TABLE_NAME}`;
    expect(data).toBeDefined()
    expect(error).toBeNull()
  })

  it('should be able to query via database connection', async () => {
    const client = new SQLiteCloudClient(CHINOOK_DATABASE_URL)
    const { data, error } = await client.db.sql('SELECT * FROM albums')
    expect(data).toBeDefined()
    expect(error).toBeNull()
    client.close()
  })
})