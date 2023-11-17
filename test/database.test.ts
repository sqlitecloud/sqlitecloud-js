/**
 * database.test.ts - test driver api
 */

import { SQLiteCloudRowset, SQLiteCloudRow, SQLiteCloudError } from '../src/index'
import { Database } from '../src/database'
import { CHINOOK_DATABASE_URL, TESTING_DATABASE_URL, LONG_TIMEOUT, getTestingConfig } from './connection.test'

import * as dotenv from 'dotenv'
dotenv.config()

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { join } from 'path'
import { readFileSync } from 'fs'
import { ResultsCallback, RowCountCallback } from '../src/types'
export const PREPARE_TESTING_SQL = readFileSync(join(__dirname, 'assets/testing.sql'), 'utf8')

//
// utility methods to setup and destroy temporary test databases
//

export function createTestDatabase(callback?: ResultsCallback): Database {
  const testingConfig = getTestingConfig()
  testingConfig.sqliteMode = true
  const database = new Database(testingConfig)
  database.exec(PREPARE_TESTING_SQL, callback)
  return database
}

export function removeDatabase(database: Database, callback?: ResultsCallback) {
  const databaseName = database.getConfiguration().database
  console.assert(databaseName)
  database.exec(`UNUSE DATABASE; REMOVE DATABASE ${databaseName};`, error => {
    if (!error) {
      database.close()
    }
    if (callback) {
      callback(error)
    }
  })
}

export async function createTestingDatabaseAsync(): Promise<Database> {
  const testingConfig = getTestingConfig()
  testingConfig.sqliteMode = true
  const database = new Database(testingConfig)
  await database.sql(PREPARE_TESTING_SQL)
  return database
}

export async function removeDatabaseAsync(database: Database) {
  const databaseName = database.getConfiguration().database
  if (databaseName) {
    await database.sql`UNUSE DATABASE; REMOVE DATABASE ${databaseName};`
  }
  database.close()
}

/** Returns a chinook.db connection, caller is responsible for closing the database */
export function getChinookDatabase(callback?: ResultsCallback): Database {
  return new Database(CHINOOK_DATABASE_URL, callback)
}

describe('Database.run', () => {
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

      removeDatabase(database, error => {
        expect(error).toBeNull()
        done()
      })
    }

    const database = createTestDatabase()
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

        removeDatabase(database, error => {
          expect(error).toBeNull()
          done()
        })
      }

      const database = createTestDatabase()
      database.run(insertSql, plainCallbackNotALambdaOne)
    },
    LONG_TIMEOUT
  )
})

describe('Database.all', () => {
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

  it('execute statement with errors', done => {
    // sqlitecloud-js / fix problem with jest tests of sendCommands error conditions #24
    const chinook = getChinookDatabase()
    try {
      chinook.exec('SET BOGUS STATEMENT TO 1;', error => {
        expect(error).toBeInstanceOf(SQLiteCloudError)
        expect(error).toMatchObject({
          errorCode: '10002',
          externalErrorCode: '0',
          name: 'SQLiteCloudError',
          offsetCode: -1,
          message: 'Unable to find command SET BOGUS STATEMENT TO 1;.'
        })

        chinook.close()
        done()
      })
    } catch (error) {
      done(error)
    }
  })
})

describe('Database.sql (async)', () => {
  it('should select from chinook', async () => {
    const chinook = getChinookDatabase()
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

    chinook.close()
  })

  it('should select and return multiple rows', async () => {
    const database = await createTestDatabase()
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

    database.close()
  })

  it('should select and return a single row', async () => {
    const database = await createTestingDatabaseAsync()
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
    await removeDatabaseAsync(database)
  })

  it('should select with template string parameters', async () => {
    // trivial example here but let's suppose we have this in a variable...
    let name = 'Ava Jones'

    // prepared statement using familiar print syntax
    const database = await createTestingDatabaseAsync()
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
    await removeDatabaseAsync(database)
  })

  it('should take regular concatenated string as parameters', async () => {
    // trivial example here but let's suppose we have this in a variable...
    let name = 'Ava Jones'

    // prepared statement with contacatenated string (shouldn't do this, weak against sql injection)
    const database = await createTestingDatabaseAsync()
    let results = await database.sql("SELECT * FROM people WHERE name = '" + name + "'")
    expect(results[0]).toMatchObject({ id: 5, name: 'Ava Jones', age: 22, hobby: 'Time traveling' })

    results = await database.sql('SELECT * FROM people WHERE age < 30')
    expect(results).toHaveLength(11)
    await removeDatabaseAsync(database)
  })

  it('should update and respond with metadata', async () => {
    const database = await createTestingDatabaseAsync()
    const updateSql = "UPDATE people SET name = 'Charlie Brown' WHERE id = 3; UPDATE people SET name = 'David Bowie' WHERE id = 4; "
    let results = await database.sql(updateSql)
    expect(results).toMatchObject({
      lastID: 20,
      changes: 1,
      totalChanges: 22,
      finalized: 1
    })
    await removeDatabaseAsync(database)
  })

  it('should insert and respond with metadata', async () => {
    const database = await createTestingDatabaseAsync()
    const insertSql = "INSERT INTO people (name, hobby, age) VALUES ('Barnaby Bumblecrump', 'Rubber Duck Dressing', 42); "
    let results = await database.sql(insertSql)
    expect(results).toMatchObject({
      lastID: 21,
      changes: 1,
      totalChanges: 21,
      finalized: 1
    })
    await removeDatabaseAsync(database)
  })
})
