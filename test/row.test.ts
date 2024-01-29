/**
 * row.test.ts - test rows in rowset container
 */

import { SQLiteCloudRowset, SQLiteCloudRow } from '../src/index'
import { getChinookConnection } from './shared'

describe('row', () => {
  it('can be accessed as a dictionary', done => {
    const connection = getChinookConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)

      const row = rowset[0]
      expect(row).toBeInstanceOf(SQLiteCloudRow)
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

  it('can be accessed as an array', done => {
    const connection = getChinookConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)

      const row = rowset[0]
      expect(row).toBeInstanceOf(SQLiteCloudRow)

      const rowData = row.getData()
      expect(rowData).toMatchObject([
        1,
        'For Those About To Rock (We Salute You)',
        1,
        1,
        1,
        'Angus Young, Malcolm Young, Brian Johnson',
        343719,
        11170334,
        0.99
      ])

      const rowColumns = rowset.metadata.columns.map((column: any) => column.name)
      expect(rowColumns).toMatchObject(['TrackId', 'Name', 'AlbumId', 'MediaTypeId', 'GenreId', 'Composer', 'Milliseconds', 'Bytes', 'UnitPrice'])

      connection.close()
      done()
    })
  })
})
