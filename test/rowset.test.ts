/**
 * rowset.test.ts - test rowset container
 */

import { SQLiteCloudRowset } from '../src/index'
import { SQLiteCloudConnection } from '../src/protocol'
import { CHINOOK_DATABASE_URL } from './protocol.test'

describe('rowset', () => {
  let connection: SQLiteCloudConnection

  beforeAll(async () => {
    connection = new SQLiteCloudConnection(CHINOOK_DATABASE_URL)
    await connection.sendCommands('SET CLIENT KEY NONLINEARIZABLE TO 1;')
  })

  afterAll(async () => {
    if (connection) {
      await connection.close()
      // @ts-ignore
      connection = undefined
    }
  })

  it('can be accessed as an array', async () => {
    let rowset = (await connection.sendCommands('SELECT * FROM tracks LIMIT 10;')) as SQLiteCloudRowset
    expect(rowset.numberOfColumns).toBe(9)
    expect(rowset.numberOfRows).toBe(10)
    expect(Array.isArray(rowset)).toBeTruthy()
    expect(rowset).toHaveLength(10)

    expect(rowset[0]).toBeDefined()
    expect(rowset[0]).toMatchObject({
      AlbumId: 1,
      Bytes: 11170334,
      Composer: 'Angus Young, Malcolm Young, Brian Johnson',
      GenreId: 1,
      MediaTypeId: 1,
      Milliseconds: 343719,
      Name: 'For Those About To Rock (We Salute You)',
      TrackId: 1,
      UnitPrice: 0.99
    })
  })

  it('contains basic metadata', async () => {
    const rowset = (await connection.sendCommands('SELECT * FROM tracks LIMIT 10;')) as SQLiteCloudRowset
    expect(rowset.metadata.version).toBe(1)
    expect(rowset.metadata.numberOfRows).toBe(10)
    expect(rowset.metadata.numberOfColumns).toBe(9)
    expect(rowset.metadata.columns).toMatchObject([
      { name: 'TrackId' },
      { name: 'Name' },
      { name: 'AlbumId' },
      { name: 'MediaTypeId' },
      { name: 'GenreId' },
      { name: 'Composer' },
      { name: 'Milliseconds' },
      { name: 'Bytes' },
      { name: 'UnitPrice' }
    ])
  })

  it('contains extended metadata', async () => {
    const connection = new SQLiteCloudConnection(CHINOOK_DATABASE_URL + '?sqliteMode=1')
    const rowset = (await connection.sendCommands('SELECT * FROM tracks LIMIT 10;')) as SQLiteCloudRowset
    expect(rowset.metadata.version).toBe(2)
    expect(rowset.metadata.numberOfRows).toBe(10)
    expect(rowset.metadata.numberOfColumns).toBe(9)
    expect(rowset.metadata.columns).toMatchObject([
      { column: 'TrackId', database: 'main', name: 'TrackId', table: 'tracks', type: 'INTEGER' },
      { column: 'Name', database: 'main', name: 'Name', table: 'tracks', type: 'NVARCHAR(200)' },
      { column: 'AlbumId', database: 'main', name: 'AlbumId', table: 'tracks', type: 'INTEGER' },
      { column: 'MediaTypeId', database: 'main', name: 'MediaTypeId', table: 'tracks', type: 'INTEGER' },
      { column: 'GenreId', database: 'main', name: 'GenreId', table: 'tracks', type: 'INTEGER' },
      { column: 'Composer', database: 'main', name: 'Composer', table: 'tracks', type: 'NVARCHAR(220)' },
      { column: 'Milliseconds', database: 'main', name: 'Milliseconds', table: 'tracks', type: 'INTEGER' },
      { column: 'Bytes', database: 'main', name: 'Bytes', table: 'tracks', type: 'INTEGER' },
      { column: 'UnitPrice', database: 'main', name: 'UnitPrice', table: 'tracks', type: 'NUMERIC(10,2)' }
    ])
    await connection.close()
  })
})
