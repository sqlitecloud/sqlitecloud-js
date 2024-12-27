import { CHINOOK_DATABASE_URL } from "../../../test/shared";
import { WebliteClient } from "../weblite/WebliteClient";

const client = new WebliteClient(CHINOOK_DATABASE_URL)

describe('WebliteClient test suite', () => {
  const DATABASE_NAME = `${Date.now()}.sqlite`
  
  it('should be able to create a client', () => {
    expect(client).toBeDefined()
    expect(client).toBeInstanceOf(WebliteClient)
  })

  it('should be able to create a database', async () => {
    const { data, error } = await client.createDatabase(DATABASE_NAME)
    expect(data).toBeDefined()
    expect(error).toBeNull()
  })

  it('should be able to list databases', async () => {
    const { data, error } = await client.listDatabases()
    expect(data).toBeDefined()
    expect(data.length).toBeGreaterThan(0)
    expect(error).toBeNull()
  })

  it('should be able to download and upload a database', async () => {
    const { data, error } = await client.downloadDatabase(DATABASE_NAME)
    expect(data).toBeDefined()
    expect(error).toBeNull()
    expect(data).toBeInstanceOf(ArrayBuffer)
    const response = await client.uploadDatabase(DATABASE_NAME + '_upload', Buffer.from(data as ArrayBuffer))
    expect(response.data).toBeTruthy()
    expect(response.error).toBeNull()
  })

  it('should be able to delete a database', async () => {
    const deleteResponse = await client.deleteDatabase(DATABASE_NAME)
    const deleteCopyResponse = await client.deleteDatabase(DATABASE_NAME + '_upload')
    expect(deleteResponse.data).toBeDefined()
    expect(deleteResponse.error).toBeNull()
    expect(deleteCopyResponse.data).toBeDefined()
    expect(deleteCopyResponse.error).toBeNull()
  })
})
