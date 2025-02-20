/**
 * statement.test.ts - test prepared statements and parameter bindings
 */

import { SQLiteCloudRowset } from '../src'
import { RowCountCallback } from '../src/drivers/types'
import { getChinookDatabase, getTestingDatabase, removeDatabase } from './shared'

describe('Database.prepare', () => {
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
  const statement = chinook.prepare('SELECT * FROM tracks WHERE albumId = ?;')

  statement.bind(3, () => {
    statement.all((error, rows) => {
      expect(error).toBeNull()
      expect(rows).toBeDefined()
      expect(rows).toHaveLength(3)
      expect(rows).toBeInstanceOf(SQLiteCloudRowset)

      chinook.close(error => {
        expect(error).toBeNull()
        done()
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

it('Statement.all like ORMs where parameters are passed as an array of bindings', done => {
  const chinook = getChinookDatabase()
  expect(chinook).toBeDefined()
  const statement = chinook.prepare('SELECT * FROM tracks WHERE albumId = ?;', (err: Error, results: any) => {
    expect(err).toBeNull()
  })

  statement.all([3], (error, rows) => {
    expect(error).toBeNull()
    expect(rows).toBeDefined()
    expect(rows).toHaveLength(3)
    expect(rows).toBeInstanceOf(SQLiteCloudRowset)

    statement.all([4], (error, rows) => {
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

it('Statement.all withtout bindings', done => {
  const chinook = getChinookDatabase()
  expect(chinook).toBeDefined()
  const statement = chinook.prepare('SELECT * FROM tracks WHERE albumId = 3;', (err: Error, results: any) => {
    expect(err).toBeNull()
  })

  statement.all((error, rows) => {
    expect(error).toBeNull()
    expect(rows).toBeDefined()
    expect(rows).toHaveLength(3)
    expect(rows).toBeInstanceOf(SQLiteCloudRowset)

    chinook.close(error => {
      expect(error).toBeNull()
      done()
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

it('Statement.each without bindings', done => {
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

  const statement = chinook.prepare<any>('SELECT * FROM tracks WHERE albumId = 4;')

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

it('Statement.get without bindings', done => {
  const chinook = getChinookDatabase()
  expect(chinook).toBeDefined()
  const statement = chinook.prepare('SELECT * FROM tracks;')

  statement.get((error, rows) => {
    expect(error).toBeNull()
    expect(rows).toBeDefined()

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

it('Statement.run - insert', done => {
  // create simple "people" database that we can write in...
  const database = getTestingDatabase(error => {
    expect(error).toBeNull()

    const statement = database.prepare('INSERT INTO people (name, hobby, age) VALUES (?, ?, ?);')

    // @ts-ignore
    statement.run('John Wayne', 73, 'Horse Riding', (error, results) => {
      // this is an insert statement and the result will indicate number of changes, etc.
      // console.debug(`insert results: `, results)
      // -> insert results:  { lastID: 21, changes: 1, totalChanges: 21, finalized: 1 }

      expect(results.lastID).toBeGreaterThan(1)
      expect(results.changes).toBe(1)

      removeDatabase(database, error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

it("Statement.run - insert with empty space after semicolon shouldn't return null", done => {
  // create simple "people" database that we can write in...
  const database = getTestingDatabase(error => {
    expect(error).toBeNull()

    const statement = database.prepare('INSERT INTO people (name, hobby, age) VALUES (?, ?, ?); ')

    // @ts-ignore
    statement.run('John Wayne', 73, 'Horse Riding', (error, results) => {
      expect(results).not.toBeNull()
      expect(results.lastID).toBeGreaterThan(1)
      expect(results.changes).toBe(1)

      removeDatabase(database, error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

it('Statement.run - update', done => {
  const database = getTestingDatabase(error => {
    expect(error).toBeNull()

    const statement = database.prepare('UPDATE people SET name= ? WHERE id = ?;')

    // @ts-ignore
    statement.run('John Wayne', 1, (error, results) => {
      expect(results.changes).toBe(1)

      removeDatabase(database, error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

it("Statement.run - update with empty space after semicolon shouldn't return null", done => {
  const database = getTestingDatabase(error => {
    expect(error).toBeNull()

    const statement = database.prepare('UPDATE people SET name= ? WHERE id = ?; ')

    // @ts-ignore
    statement.run('John Wayne', 1, (error, results) => {
      expect(results).not.toBeNull()
      expect(results.changes).toBe(1)

      removeDatabase(database, error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

it('Statement.run - delete', done => {
  const database = getTestingDatabase(error => {
    expect(error).toBeNull()

    const statement = database.prepare('DELETE FROM people WHERE id = ?;')

    // @ts-ignore
    statement.run(1, (error, results) => {
      expect(results.changes).toBe(1)

      removeDatabase(database, error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

it("Statement.run - delete with empty space after semicolon shouldn't return null", done => {
  const database = getTestingDatabase(error => {
    expect(error).toBeNull()

    const statement = database.prepare('DELETE FROM people WHERE id = ?; ')

    // @ts-ignore
    statement.run(1, (error, results) => {
      expect(results).not.toBeNull()
      expect(results.changes).toBe(1)

      removeDatabase(database, error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})
