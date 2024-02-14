/**
 * statement.test.ts - test prepared statements and parameter bindings
 */

import { SQLiteCloudRowset } from '../src'
import { RowCallback, RowCountCallback, SQLiteCloudError } from '../src/drivers/types'
import { getChinookDatabase } from './shared'

describe('Database.prepare', () => {
  it('without incorrect bindings', done => {
    const chinook = getChinookDatabase()
    expect(chinook).toBeDefined()

    // two bindings, but only one is provided...
    const statement = chinook.prepare('SELECT * FROM tracks WHERE albumId = ? and trackId = ?;', 1, (err: Error, results: any) => {
      expect(err).toBeInstanceOf(SQLiteCloudError)

      chinook.close()
      done()
    })
  })

  it('without initial bindings', done => {
    const chinook = getChinookDatabase()
    expect(chinook).toBeDefined()
    const statement = chinook.prepare('SELECT * FROM tracks WHERE albumId = ?;', (err: Error, results: any) => {
      expect(err).toBeNull()
    })

    statement.all(3, (error, rows) => {
      expect(error).toBeNull()
      expect(rows).toBeDefined()
      expect(rows).toHaveLength(3)
      expect(rows).toBeInstanceOf(SQLiteCloudRowset)
      expect(rows).toMatchObject([
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

      chinook.close(error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

it('Statement.bind', done => {
  const chinook = getChinookDatabase()
  expect(chinook).toBeDefined()
  const statement = chinook.prepare('SELECT * FROM tracks WHERE albumId = ?;', (err: Error, results: any) => {
    expect(err).toBeNull()
  })

  statement.bind(3, (error: Error) => {
    expect(error).toBeNull()

    statement.all((error, rows) => {
      expect(error).toBeNull()
      expect(rows).toBeDefined()
      expect(rows).toHaveLength(3)
      expect(rows).toBeInstanceOf(SQLiteCloudRowset)

      // missing binding
      statement.bind((error: Error) => {
        expect(error).toBeInstanceOf(SQLiteCloudError)

        chinook.close(error => {
          expect(error).toBeNull()
          done()
        })
      })
    })
  })
})

it('Statement.all', done => {
  const chinook = getChinookDatabase()
  expect(chinook).toBeDefined()
  const statement = chinook.prepare('SELECT * FROM tracks WHERE albumId = ?;', (err: Error, results: any) => {
    expect(err).toBeNull()
  })

  statement.all(3, (error, rows) => {
    expect(error).toBeNull()
    expect(rows).toBeDefined()
    expect(rows).toHaveLength(3)
    expect(rows).toBeInstanceOf(SQLiteCloudRowset)

    statement.all(4, (error, rows) => {
      expect(error).toBeNull()
      expect(rows).toBeDefined()
      expect(rows).toHaveLength(8)
      expect(rows).toBeInstanceOf(SQLiteCloudRowset)

      chinook.close(error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

it('Statement.each', done => {
  const chinook = getChinookDatabase()
  expect(chinook).toBeDefined()

  let rowCount = 0

  const rowCallback = (error: Error | null, row: any) => {
    rowCount += 1
    expect(error).toBeNull()
    expect(row).toBeDefined()
    expect(row).toMatchObject({})
  }

  const completeCallback: RowCountCallback = (error, numberOfRows) => {
    expect(error).toBeNull()
    expect(rowCount).toBe(8)
    expect(numberOfRows).toBe(8)
    chinook.close(error => {
      expect(error).toBeNull()
      done()
    })
  }

  const statement = chinook.prepare<any>('SELECT * FROM tracks WHERE albumId = ?;', (err: Error, results: any) => {
    expect(err).toBeNull()
  })

  // album 4 has 8 rows
  statement.each(4, rowCallback, completeCallback)
})

it('Statement.get', done => {
  const chinook = getChinookDatabase()
  expect(chinook).toBeDefined()
  const statement = chinook.prepare('SELECT * FROM tracks WHERE albumId = ?;', (err: Error, results: any) => {
    expect(err).toBeNull()
  })

  statement.get(3, (error, row) => {
    expect(error).toBeNull()
    expect(row).toBeDefined()
    expect(Object.keys(row)).toStrictEqual(['TrackId', 'Name', 'AlbumId', 'MediaTypeId', 'GenreId', 'Composer', 'Milliseconds', 'Bytes', 'UnitPrice'])

    chinook.close(error => {
      expect(error).toBeNull()
      done()
    })
  })
})

it('Statement.run', done => {
  const chinook = getChinookDatabase()
  expect(chinook).toBeDefined()
  const statement = chinook.prepare('SET CLIENT KEY COMPRESSION TO ?; ', (err: Error, results: any) => {
    expect(err).toBeNull()
  })

  statement.run(1, error => {
    expect(error).toBeNull()

    // run again but use same binding this time
    statement.run(error => {
      expect(error).toBeNull()

      chinook.close()
      done()
    })
  })
})
