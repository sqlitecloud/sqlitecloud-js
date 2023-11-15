/**
 * database.test.ts - test driver api
 */

import { SQLiteCloudRowset, SQLiteCloudRow, SQLiteCloudError } from '../src/index'
import { Database } from '../src/database'
import { CHINOOK_DATABASE_URL, TESTING_DATABASE_URL, LONG_TIMEOUT } from './connection.test'

import * as dotenv from 'dotenv'
dotenv.config()

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { join } from 'path'
import { readFileSync } from 'fs'
import { RowCountCallback } from '../src/types'
export const PREPARE_TESTING_SQL = readFileSync(join(__dirname, 'assets/testing.sql'), 'utf8')

export function getTestingDatabase(): Database {
  const database = new Database(TESTING_DATABASE_URL + '?sqliteMode=1')
  database.exec(PREPARE_TESTING_SQL)
  return database
}

describe('Database', () => {
  let database: Database

  beforeEach(done => {
    try {
      const db = new Database(TESTING_DATABASE_URL + '?sqliteMode=1')
      db.exec(PREPARE_TESTING_SQL, error => {
        expect(error).toBeNull()
        database = db
        done()
      })
    } catch (error) {
      console.error(error)
      throw error
    }
  })

  afterEach(() => {
    if (database) {
      database.close()
    }
    // @ts-expect-error
    database = undefined
  })

  describe('run', () => {
    it('simple update', done => {
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

        database.close(error => {
          expect(error).toBeNull()
          done()
        })
      }

      database.run(updateSql, plainCallbackNotALambda)
    })

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

          database.close(error => {
            expect(error).toBeNull()
            done()
          })
        }

        database.run(insertSql, plainCallbackNotALambdaOne)
      },
      LONG_TIMEOUT
    )
  })

  describe('all', () => {
    it(
      'simple select',
      done => {
        const db = new Database(CHINOOK_DATABASE_URL)
        db.all('SELECT * FROM tracks', (err: Error, rows: SQLiteCloudRowset) => {
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

          db.close(error => {
            expect(error).toBeNull()
            done()
          })
        })
      },
      LONG_TIMEOUT
    )

    it('select with parameters', done => {
      const db = new Database(CHINOOK_DATABASE_URL)
      db.all<SQLiteCloudRow>('SELECT * FROM tracks WHERE composer = ?', 'AC/DC', (error, rows) => {
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

        db.close(error => {
          expect(error).toBeNull()
          done()
        })
      })
    })
  })

  describe('get', () => {
    it('SELECT * FROM tracks', done => {
      const db = new Database(CHINOOK_DATABASE_URL)
      db.get('SELECT * FROM tracks', (err: Error, row?: SQLiteCloudRow) => {
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

        db.close(error => {
          expect(error).toBeNull()
          done()
        })
      })
    })
  })

  describe('each', () => {
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
        db.close(error => {
          expect(error).toBeNull()
          done()
        })
      }

      const db = new Database(CHINOOK_DATABASE_URL)
      db.each<any>('SELECT * FROM tracks', rowCallback, completeCallback)
    })
  })

  describe('exec', () => {
    it('execute simple statement', done => {
      const db = new Database(CHINOOK_DATABASE_URL)
      db.exec('SET CLIENT KEY COMPRESSION TO 1;', error => {
        expect(error).toBeNull()
        db.close(error => {
          expect(error).toBeNull()
          done()
        })
      })
    })

    it('execute statement with errors', done => {
      // sqlitecloud-js / fix problem with jest tests of sendCommands error conditions #24
      const chinook = new Database(CHINOOK_DATABASE_URL)
      try {
        chinook.exec('SET BOGUS STATEMENT TO 1;', error => {
          try {
            expect(error).toBeInstanceOf(SQLiteCloudError)
            expect(error).toMatchObject({
              errorCode: '10002',
              externalErrorCode: '0',
              name: 'SQLiteCloudError',
              offsetCode: -1,
              message: 'Unable to find command SET BOGUS STATEMENT TO 1;'
            })

            chinook.close()
            done()
          } catch (error) {
            done(error)
          }
        })
      } catch (error) {
        done(error)
      }
    })
  })

  describe('sql (async)', () => {
    it('simple select', async () => {
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
    })

    it('select with template string', async () => {
      // trivial example here but let's suppose we have this in a variable...
      let name = 'Ava Jones'

      // prepared statement using familiar print syntax
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
    })

    it('regular concatenated string', async () => {
      // trivial example here but let's suppose we have this in a variable...
      let name = 'Ava Jones'

      // prepared statement with contacatenated string (shouldn't do this, weak against sql injection)
      let results = await database.sql("SELECT * FROM people WHERE name = '" + name + "'")
      expect(results[0]).toMatchObject({ id: 5, name: 'Ava Jones', age: 22, hobby: 'Time traveling' })

      results = await database.sql('SELECT * FROM people WHERE age < 30')
      expect(results).toHaveLength(11)
    })
  })

  describe('stress testing', () => {
    it(
      '20x sql async with random selects',
      async () => {
        const numQueries = 20
        const startTime = Date.now()
        // database.verbose()
        const table = 'people'
        for (let i = 0; i < numQueries; i++) {
          const results = await database.sql`SELECT * FROM ${table} ORDER BY RANDOM() LIMIT 12`
          expect(results).toHaveLength(12)
          expect(Object.keys(results[0])).toEqual(['id', 'name', 'age', 'hobby'])
        }

        const queryMs = (Date.now() - startTime) / numQueries
        console.log(`${numQueries}x template selects, ${queryMs.toFixed(0)}ms per query`)
        expect(queryMs).toBeLessThan(2000)
      },
      LONG_TIMEOUT
    )
  })
})
