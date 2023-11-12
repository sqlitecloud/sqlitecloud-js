/**
 * database.test.ts - test driver api
 */

import { SQLiteCloudError, SQLiteCloudConnection } from '../src/index'
import { Database, ErrorCallback } from '../src/database'
import { CHINOOK_DATABASE_URL, TESTING_DATABASE_URL } from './protocol.test'
import * as dotenv from 'dotenv'
dotenv.config()

const LONG_TIMEOUT = 30 * 1000

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { join } from 'path'
import { readFileSync } from 'fs'
const PREPARE_TESTING_SQL = readFileSync(join(__dirname, 'assets/testing.sql'), 'utf8')

describe('Database', () => {
  let database: Database

  beforeEach(done => {
    try {
      const db = new Database(TESTING_DATABASE_URL + '?sqliteMode=1', null, () => {
        db.exec(PREPARE_TESTING_SQL, error => {
          expect(error).toBeNull()
          database = db
          done()
        })
      })
    } catch (error) {
      console.error(error)
      throw error
    }
  })

  afterEach(async () => {
    if (database) {
      await database.close()
      // @ts-ignore
      database = undefined
    }
  })

  describe('run', () => {
    it('simple update', done => {
      const updateSql = "UPDATE people SET name = 'Charlie Brown' WHERE id = 3; UPDATE people SET name = 'David Bowie' WHERE id = 4; "

      database.run(updateSql, (err: Error, results: any) => {
        expect(err).toBeNull()
        // TODO sqlitecloud-js // Database.run should return number of rows modified and lastId #15

        database.close(error => {
          expect(error).toBeNull()
          done()
        })
      })
    })

    it(
      'insert with parameter value',
      done => {
        const insertSql = `INSERT INTO people (name, hobby, age) VALUES ('Fantozzi Ugo', 'Competitive pranking', 42);`

        database.run(insertSql, (err: Error, results: any) => {
          expect(err).toBeNull()
          // TODO sqlitecloud-js // Database.run should return number of rows modified and lastId #15

          database.close(error => {
            expect(error).toBeNull()
            done()
          })
        })
      },
      LONG_TIMEOUT
    )
  })

  describe('all', () => {
    it(
      'SELECT * FROM tracks',
      done => {
        const db = new Database(CHINOOK_DATABASE_URL, null, () => {
          db.all('SELECT * FROM tracks', (err: Error, rows: any[]) => {
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
        })
      },
      LONG_TIMEOUT
    )

    it('SELECT * FROM tracks WHERE composer = ?', done => {
      const db = new Database(CHINOOK_DATABASE_URL, null, () => {
        db.all('SELECT * FROM tracks WHERE composer = ?', 'AC/DC', (err: Error, rows: any[]) => {
          expect(err).toBeNull()
          expect(rows).toBeDefined()
          expect(rows).toHaveLength(8)
          expect(rows[0]).toMatchObject({
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
  })

  describe('get', () => {
    it('SELECT * FROM tracks', done => {
      const db = new Database(CHINOOK_DATABASE_URL, null, () => {
        db.get('SELECT * FROM tracks', (err: Error, row: any) => {
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

      const completeCallback = (error: Error, numberOfRows: number) => {
        expect(error).toBeNull()
        expect(rowCount).toBe(numberOfRows)
        db.close(error => {
          expect(error).toBeNull()
          done()
        })
      }

      const db = new Database(CHINOOK_DATABASE_URL, null, () => {
        db.each('SELECT * FROM tracks', rowCallback, completeCallback)
      })
    })
  })

  describe('exec', () => {
    it('execute simple statement', done => {
      const db = new Database(CHINOOK_DATABASE_URL, null, () => {
        db.exec('SET CLIENT KEY COMPRESSION TO 1;', error => {
          expect(error).toBeNull()

          db.close(error => {
            expect(error).toBeNull()
            done()
          })
        })
      })
    })

    it('execute statement with errors', done => {
      const db = new Database(CHINOOK_DATABASE_URL, null, () => {
        db.exec('SET BOGUS STATEMENT TO 1;', error => {
          expect(error).toBeInstanceOf(SQLiteCloudError)
          expect(error).toMatchObject({
            errorCode: '10002',
            externalErrorCode: '0',
            name: 'SQLiteCloudError',
            offsetCode: -1,
            message: 'Unable to find command SET BOGUS STATEMENT TO 1;'
          })

          db.close(error => {
            expect(error).toBeNull()
            done()
          })
        })
      })
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

      // create a connection to the database
      const db = new Database(TESTING_DATABASE_URL)

      // prepared statement using familiar print syntax
      let results = await db.sql`SELECT * FROM people WHERE name = ${name}`
      // => returns { id: 5, name: 'Ava Jones', age: 22, hobby: 'Time traveling' }

      expect(results[0]).toMatchObject({
        id: 5,
        name: 'Ava Jones',
        age: 22,
        hobby: 'Time traveling'
      })

      results = await db.sql`SELECT * FROM people WHERE age < 30`
      expect(results).toHaveLength(11)
    })

    it('template string with single quote', async () => {
      // a name with a single quote messes with sql statements if just concatenate or replace ? with a string
      // statement shoud be escaped to SELECT * FROM people WHERE name = 'Eva' OR name = 'Tony''s Pizza' OR age < 30
      const name = "Tony's Pizza"
      const results = await database.sql`SELECT * FROM people WHERE name = 'Eva' OR name = ${name} OR age < 30`
      expect(results).toHaveLength(11)
    })

    it('template string with multiple queries', async () => {
      for (let i = 0; i < 2; i++) {
        const results = await database.sql`SELECT * FROM people ORDER BY RANDOM() LIMIT 12`
        expect(results).toHaveLength(12)
      }
    })
  })
})
