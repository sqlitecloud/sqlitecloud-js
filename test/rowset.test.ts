/**
 * rowset.test.ts - test rowset container
 */

import { SQLiteCloudRowset } from '../src/index'
import { SQLiteCloudConnection } from '../src/connection'
import { CHINOOK_DATABASE_URL, getChinookConnection, getChinookConfig } from './shared'

describe('rowset', () => {
  it('can be accessed as an array', done => {
    const connection = getChinookConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
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

      connection.close()
      done()
    })
  })

  it('can be sliced like an array', done => {
    const connection = getChinookConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 50;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(50)
      expect(Array.isArray(rowset)).toBeTruthy()
      expect(rowset).toHaveLength(50)

      // slice with correct bounds
      const sliced = rowset.slice(10, 20)
      expect(sliced).toHaveLength(10)
      expect(sliced[0]).toMatchObject(rowset[10])

      // slice with end larger than length
      const largerSlice = rowset.slice(10, 100)
      expect(largerSlice).toHaveLength(40)
      expect(largerSlice[0]).toMatchObject(rowset[10])
      expect(largerSlice[39]).toMatchObject(rowset[49])

      // slice last 3 elements
      const negativeStartSlice = rowset.slice(-3)
      expect(negativeStartSlice).toHaveLength(3)
      expect(negativeStartSlice[0]).toMatchObject(rowset[rowset.length - 3])

      // slice first 3 elements
      const negativeEndSlice = rowset.slice(0, -3)
      expect(negativeEndSlice).toHaveLength(rowset.length - 3)
      expect(negativeEndSlice[0]).toMatchObject(rowset[0])
      expect(negativeEndSlice[negativeEndSlice.length - 1]).toMatchObject(rowset[rowset.length - 4])

      // slice to empty set
      const emptySlice = rowset.slice(20, 10)
      expect(emptySlice).toHaveLength(0)

      connection.close()
      done()
    })
  })

  it('contains basic metadata', done => {
    const connection = getChinookConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
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

      connection.close()
      done()
    })
  })

  it('contains extended metadata', done => {
    // custom connection with sqliteMode enabled
    const connection = new SQLiteCloudConnection(getChinookConfig(CHINOOK_DATABASE_URL + '?sqliteMode=1'))
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
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
      connection.close()
      done()
    })
  })
})
