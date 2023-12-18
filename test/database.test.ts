/**
 * database.test.ts - test driver api
 */

import { SQLiteCloudRowset, SQLiteCloudRow, SQLiteCloudError } from '../src/index'
import { getTestingDatabase, getTestingDatabaseAsync, getChinookDatabase, removeDatabase, removeDatabaseAsync, LONG_TIMEOUT } from './shared'
import { RowCountCallback } from '../src/types'
import { finished } from 'stream'

//
// utility methods to setup and destroy temporary test databases
//

describe('Database.run', () => {
  it(
    'simple update',
    done => {
      //      const updateSql = "UPDATE people SET name = 'Charlie Brown' WHERE id = 3; UPDATE people SET name = 'David Bowie' WHERE id = 4; "
      const updateSql = "UPDATE people SET name = 'Charlie Brown' WHERE id = 3; UPDATE people SET name = 'David Bowie' WHERE id = 4; "

      // lambda callback would "hide" this
      function plainCallbackNotALambda(err: Error, results: any) {
        expect(err).toBeNull()
        expect(results).toBeUndefined()

        // Database.run should return number of rows modified and lastID
        // @ts-expect-error
        const context = this as any
        expect(context.lastID).toBe(20)
        expect(context.changes).toBe(1) // should this be 2?
        expect(context.totalChanges).toBe(22)
        expect(context.finalized).toBe(1)

        done()
        removeDatabase(database, error => {
          expect(error).toBeNull()
          done()
        })
      }

      const database = getTestingDatabase()
      database.run(updateSql, plainCallbackNotALambda)
    },
    LONG_TIMEOUT
  )

  it(
    'insert with parameter value',
    done => {
      const insertSql = `INSERT INTO people (name, hobby, age) VALUES ('Fantozzi Ugo', 'Competitive unicorn farting', 42);`

      // lambda callback would "hide" this
      function plainCallbackNotALambdaOne(err: Error, results: any) {
        expect(err).toBeNull()
        expect(results).toBeUndefined()

        // Database.run should return number of rows modified and lastID
        // @ts-expect-error
        const context = this as any
        expect(context.lastID).toBe(21)
        expect(context.changes).toBe(1)
        expect(context.totalChanges).toBe(21)
        expect(context.finalized).toBe(1)

        database.run(insertSql, plainCallbackNotALambdaTwo)
      }

      // lambda callback would "hide" this
      function plainCallbackNotALambdaTwo(err: Error, results: any) {
        expect(err).toBeNull()
        expect(results).toBeUndefined()

        // Database.run should return number of rows modified and lastID
        // @ts-expect-error
        const context = this as any
        expect(context.lastID).toBe(22)
        expect(context.changes).toBe(1)
        expect(context.totalChanges).toBe(22)
        expect(context.finalized).toBe(1)

        done()
        removeDatabase(database, error => {
          expect(error).toBeNull()
          done()
        })
      }

      const database = getTestingDatabase()
      database.run(insertSql, plainCallbackNotALambdaOne)
    },
    LONG_TIMEOUT
  )
})

describe('Database.all', () => {
  it(
    'simple select',
    done => {
      const chinook = getChinookDatabase()
      chinook.all('SELECT * FROM tracks', (err: Error, rows: SQLiteCloudRowset) => {
        expect(err).toBeNull()
        expect(rows).toBeDefined()
        expect(rows).toHaveLength(3503)
        expect(rows[0]).toMatchObject({
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

        chinook.close(error => {
          expect(error).toBeNull()
          done()
        })
      })
    },
    LONG_TIMEOUT
  )

  it('select with parameters', done => {
    const chinook = getChinookDatabase()
    chinook.all<SQLiteCloudRow>('SELECT * FROM tracks WHERE composer = ?', 'AC/DC', (error, rows) => {
      expect(error).toBeNull()
      expect(rows).toBeDefined()
      expect(rows).toHaveLength(8)
      expect(rows?.[0]).toMatchObject({
        AlbumId: 4,
        Bytes: 10847611,
        Composer: 'AC/DC',
        GenreId: 1,
        MediaTypeId: 1,
        Milliseconds: 331180,
        Name: 'Go Down',
        TrackId: 15,
        UnitPrice: 0.99
      })

      chinook.close(error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

describe('Database.get', () => {
  it('SELECT * FROM tracks', done => {
    const chinook = getChinookDatabase()
    chinook.get('SELECT * FROM tracks', (err: Error, row?: SQLiteCloudRow) => {
      expect(err).toBeNull()
      expect(row).toBeDefined()
      expect(row).toMatchObject({
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

      chinook.close(error => {
        expect(error).toBeNull()
        done()
      })
    })
  })
})

describe('Database.each', () => {
  it('SELECT * FROM tracks', done => {
    let rowCount = 0

    const rowCallback = (err: Error, row: any) => {
      rowCount += 1
      expect(err).toBeNull()
      expect(row).toBeDefined()
      expect(row).toMatchObject({})
    }

    const completeCallback: RowCountCallback = (error, numberOfRows) => {
      expect(error).toBeNull()
      expect(rowCount).toBe(numberOfRows)
      chinook.close(error => {
        expect(error).toBeNull()
        done()
      })
    }

    const chinook = getChinookDatabase()
    chinook.each<any>('SELECT * FROM tracks', rowCallback, completeCallback)
  })
})

describe('Database.exec', () => {
  it('execute simple statement', done => {
    const chinook = getChinookDatabase()
    chinook.exec('SET CLIENT KEY COMPRESSION TO 1;', error => {
      expect(error).toBeNull()
      chinook.close(error => {
        expect(error).toBeNull()
        done()
      })
    })
  })

  it(
    'execute statement with errors',
    done => {
      // sqlitecloud-js / fix problem with jest tests of sendCommands error conditions #24
      const chinook = getChinookDatabase()
      try {
        chinook.exec('SET BOGUS STATEMENT TO 1;', error => {
          expect(error).toBeDefined()
          expect(error).toBeInstanceOf(SQLiteCloudError)

          const sqliteCloudError = error as SQLiteCloudError
          expect(sqliteCloudError.errorCode).toBe('10002')
          expect(sqliteCloudError.externalErrorCode).toBe('0')
          expect(sqliteCloudError.name).toBe('SQLiteCloudError')
          expect(sqliteCloudError.offsetCode).toBe(-1)
          expect(sqliteCloudError.message.includes('Unable to find command SET BOGUS STATEMENT TO 1;')).toBe(true)

          chinook.close()
          done()
        })
      } catch (error) {
        done(error)
      }
    },
    LONG_TIMEOUT
  )
})

describe('Database.sql (async)', () => {
  it('should select from chinook', async () => {
    let chinook
    try {
      chinook = getChinookDatabase()
      let name = 'Breaking The Rules'
      const results = await chinook.sql`SELECT * FROM tracks WHERE name = ${name}`
      expect(results).toBeDefined()

      const row = results[0]
      expect(row).toBeDefined()
      expect(row).toMatchObject({
        AlbumId: 1,
        Bytes: 8596840,
        Composer: 'Angus Young, Malcolm Young, Brian Johnson',
        GenreId: 1,
        MediaTypeId: 1,
        Milliseconds: 263288,
        Name: 'Breaking The Rules',
        TrackId: 12,
        UnitPrice: 0.99
      })
    } finally {
      chinook?.close()
    }
  })

  it('should work with regular function parameters', async () => {
    let database
    try {
      database = await getTestingDatabase()
      const results = await database.sql('SELECT * FROM people WHERE name = ?', 'Emma Johnson')
      expect(results).toHaveLength(1)
    } finally {
      database?.close()
    }
  })

  it('should select and return multiple rows', async () => {
    let database
    try {
      database = await getTestingDatabase()
      const results = await database.sql('SELECT * FROM people ORDER BY id')
      expect(results).toBeDefined()

      const row = results[0]
      expect(row).toBeDefined()
      expect(row).toMatchObject({
        id: 1,
        name: 'Emma Johnson',
        age: 28,
        hobby: 'Collecting clouds'
      })
    } finally {
      database?.close()
    }
  })

  it('should select and return a single row', async () => {
    let database
    try {
      database = await getTestingDatabaseAsync()
      const results = await database.sql('SELECT * FROM people ORDER BY id LIMIT 1')
      expect(results).toBeDefined()
      const row = results[0]
      expect(row).toBeDefined()
      expect(row).toMatchObject({
        id: 1,
        name: 'Emma Johnson',
        age: 28,
        hobby: 'Collecting clouds'
      })
    } finally {
      await removeDatabaseAsync(database)
    }
  })

  it('should select with template string parameters', async () => {
    let database
    try {
      // trivial example here but let's suppose we have this in a variable...
      let name = 'Ava Jones'

      // prepared statement using familiar print syntax
      database = await getTestingDatabaseAsync()
      let results = await database.sql`SELECT * FROM people WHERE name = ${name}`
      // => returns { id: 5, name: 'Ava Jones', age: 22, hobby: 'Time traveling' }

      expect(results[0]).toMatchObject({
        id: 5,
        name: 'Ava Jones',
        age: 22,
        hobby: 'Time traveling'
      })

      results = await database.sql`SELECT * FROM people WHERE age < 30`
      expect(results).toHaveLength(11)
    } finally {
      await removeDatabaseAsync(database)
    }
  })

  it('should take regular concatenated string as parameters', async () => {
    let database
    try {
      // trivial example here but let's suppose we have this in a variable...
      let name = 'Ava Jones'

      // prepared statement with contacatenated string (shouldn't do this, weak against sql injection)
      database = await getTestingDatabaseAsync()
      let results = await database.sql("SELECT * FROM people WHERE name = '" + name + "'")
      expect(results[0]).toMatchObject({ id: 5, name: 'Ava Jones', age: 22, hobby: 'Time traveling' })

      results = await database.sql('SELECT * FROM people WHERE age < 30')
      expect(results).toHaveLength(11)
    } finally {
      await removeDatabaseAsync(database)
    }
  })

  it('should update and respond with metadata', async () => {
    let database
    try {
      database = await getTestingDatabaseAsync()
      const updateSql = "UPDATE people SET name = 'Charlie Brown' WHERE id = 3; UPDATE people SET name = 'David Bowie' WHERE id = 4; "
      let results = await database.sql(updateSql)
      expect(results).toMatchObject({
        lastID: 20,
        changes: 1,
        totalChanges: 22,
        finalized: 1
      })
    } finally {
      await removeDatabaseAsync(database)
    }
  })

  it('should insert and respond with metadata', async () => {
    let database
    try {
      database = await getTestingDatabaseAsync()
      const insertSql = "INSERT INTO people (name, hobby, age) VALUES ('Barnaby Bumblecrump', 'Rubber Duck Dressing', 42); "
      let results = await database.sql(insertSql)
      expect(results).toMatchObject({
        lastID: 21,
        changes: 1,
        totalChanges: 21,
        finalized: 1
      })
    } finally {
      await removeDatabaseAsync(database)
    }
  })
})
