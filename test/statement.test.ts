/**
 * statement.test.ts - test prepared statements and parameter bindings
 */

import { SQLiteCloudRowset } from '../src'
import { Database } from '../src/database'
import { CHINOOK_DATABASE_URL } from './connection.test'

describe('statement', () => {
  it('prepare without initial bindings', done => {
    const db = new Database(CHINOOK_DATABASE_URL, null, _database => {
      expect(db).toBeDefined()
      const statement = db.prepare('SELECT * FROM tracks WHERE albumId = ?;', (err: Error, results: any) => {
        expect(err).toBeNull()
      })

      statement.all(3, (err: Error, rowset: SQLiteCloudRowset) => {
        expect(err).toBeNull()
        expect(rowset).toBeDefined()
        expect(rowset).toHaveLength(3)
        expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
        expect(rowset).toMatchObject([
          {
            AlbumId: 3,
            Bytes: 3990994,
            Composer: 'F. Baltes, S. Kaufman, U. Dirkscneider & W. Hoffman',
            GenreId: 1,
            MediaTypeId: 2,
            Milliseconds: 230619,
            Name: 'Fast As a Shark',
            TrackId: 3,
            UnitPrice: 0.99
          },
          {
            AlbumId: 3,
            Bytes: 4331779,
            Composer: 'F. Baltes, R.A. Smith-Diesel, S. Kaufman, U. Dirkscneider & W. Hoffman',
            GenreId: 1,
            MediaTypeId: 2,
            Milliseconds: 252051,
            Name: 'Restless and Wild',
            TrackId: 4,
            UnitPrice: 0.99
          },
          {
            AlbumId: 3,
            Bytes: 6290521,
            Composer: 'Deaffy & R.A. Smith-Diesel',
            GenreId: 1,
            MediaTypeId: 2,
            Milliseconds: 375418,
            Name: 'Princess of the Dawn',
            TrackId: 5,
            UnitPrice: 0.99
          }
        ])

        db.close(error => {
          expect(error).toBeNull()
          done()
        })
      })
    })
  })
})
