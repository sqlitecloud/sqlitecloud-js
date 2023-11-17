/**
 * compare.test.ts - test driver api against sqlite3 equivalents
 */

import { Database } from '../src/index'
import { CHINOOK_DATABASE_FILE, CHINOOK_DATABASE_URL, CHINOOK_FIRST_TRACK, LONG_TIMEOUT, TESTING_SQL } from './shared'
import { getChinookDatabase, getTestingDatabase } from './shared'

// https://github.com/TryGhost/node-sqlite3/wiki/API
import sqlite3 from 'sqlite3'
import { join } from 'path'

const INSERT_SQL = "INSERT INTO people (name, hobby, age) VALUES ('Fantozzi Ugo', 'Competitive unicorn farting', 42); "
const TESTING_DATABASE_FILE = join(__dirname, 'assets/testing.db')

function getChinookDatabaseFile(): sqlite3.Database {
  return new sqlite3.Database(CHINOOK_DATABASE_FILE)
}

function getTestingDatabaseFilename(): string {
  const id = new Date()
    .toISOString()
    .replace(/-|:|T|Z|\./g, '')
    .slice(0, -1)
  return TESTING_DATABASE_FILE.replace('.db', `-${id}.db`)
}

function createTestDatabaseFile(callback?: ((err: Error | null) => void) | undefined): sqlite3.Database {
  const testingFile = new sqlite3.Database(getTestingDatabaseFilename(), callback)
  testingFile.exec(TESTING_SQL)
  return testingFile
}

describe('Database.on', () => {
  it('sqlite3: should emit open event', done => {
    const chinook = new sqlite3.Database(CHINOOK_DATABASE_FILE, error => {
      expect(chinook).toBeDefined()
      expect(error).toBeNull()
      chinook.once('open', () => {
        chinook.close()
        done()
      })
    })
  })

  it('sqlitecloud: should emit open event', done => {
    const chinook = new Database(CHINOOK_DATABASE_URL, error => {
      expect(chinook).toBeDefined()
      expect(error).toBeNull()
      chinook.once('open', () => {
        chinook.close()
        done()
      })
    })
  })

  it('sqlite3: should emit errors', done => {
    const chinookFile = getChinookDatabaseFile()
    chinookFile.on('error', error => {
      expect(error).toBeTruthy()
      chinookFile.close()
      done()
    })
    chinookFile.exec('BOGUS SQL MEISTER;')
  })

  it('sqlitecloud: should emit errors', done => {
    const chinookCloud = getChinookDatabase()
    chinookCloud.once('error', error => {
      expect(error).toBeTruthy()
      chinookCloud.close()
      done()
    })
    chinookCloud.exec('BOGUS SQL MEISTER;')
  })

  it('sqlite3: should emit close event', done => {
    const chinookFile = getChinookDatabaseFile()
    chinookFile.on('close', () => {
      done()
    })
    chinookFile.close()
  })

  it('sqlitecloud: should emit close event', done => {
    const chinookCloud = getChinookDatabase()
    chinookCloud.once('close', () => {
      done()
    })
    chinookCloud.close()
  })

  // end Database.on
})

describe('Database.run', () => {
  it('sqlite3: insert with plain sql', done => {
    const testingFile = createTestDatabaseFile()

    // https://github.com/TryGhost/node-sqlite3/wiki/API#runsql--param---callback
    function onInsert(error: Error, results: any) {
      expect(error).toBeNull()
      expect(results).toBeUndefined()

      // @ts-expect-error
      expect(this.lastID).toBe(21)
      // @ts-expect-error
      expect(this.changes).toBe(1)

      testingFile.close()
      done()
    }

    testingFile.run(INSERT_SQL, onInsert)
  })

  it('sqlitecloud: insert with plain sql', done => {
    const testingCloud = getTestingDatabase()

    // https://github.com/TryGhost/node-sqlite3/wiki/API#runsql--param---callback
    function onInsert(error: Error, results: any) {
      expect(error).toBeNull()
      expect(results).toBeUndefined()

      // @ts-expect-error
      expect(this.lastID).toBe(21)
      // @ts-expect-error
      expect(this.changes).toBe(1)
      // @ts-expect-error
      expect(this.totalChanges).toBe(21)
      // @ts-expect-error
      expect(this.finalized).toBe(1)

      testingCloud.close()
      done()
    }

    testingCloud.run(INSERT_SQL, onInsert)
  })

  // end run
})

describe('Database.get', () => {
  it('select all tracks', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM tracks ORDER BY trackId;'
    chinookCloud.get<any>(sql, (cloudError, cloudRow) => {
      expect(cloudError).toBeNull()
      expect(cloudRow).toMatchObject(CHINOOK_FIRST_TRACK)

      chinookFile.get<any>(sql, (fileError, fileRow) => {
        expect(fileError).toBeNull()
        expect(fileRow).toMatchObject(CHINOOK_FIRST_TRACK)
        expect(fileRow).toMatchObject(cloudRow)

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  it('select single track', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM tracks WHERE trackId = ?;'
    chinookCloud.get<any>(sql, 2, (cloudError, cloudRow) => {
      expect(cloudError).toBeFalsy()
      expect((cloudRow as any)['TrackId']).toBe(2)

      chinookFile.get<any>(sql, 2, (fileError, fileRow) => {
        expect(fileError).toBeNull()
        expect(fileRow).toMatchObject(cloudRow)

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  it('select empty results', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM tracks WHERE trackId = ?;'
    chinookCloud.get(sql, -1, (cloudError, cloudRow) => {
      expect(cloudError).toBeFalsy()
      expect(cloudRow).toBeUndefined()

      chinookFile.get(sql, -1, (fileError, fileRow) => {
        expect(fileError).toBeNull()
        expect(fileRow).toBeUndefined()

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  it('select with errors', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM missingTable;'
    chinookCloud.get(sql, (cloudError, cloudRows) => {
      expect(cloudError).toBeTruthy()
      expect(cloudRows).toBeFalsy()

      chinookFile.get(sql, (fileError, fileRows) => {
        expect(fileError).toBeTruthy()
        expect(fileRows).toBeFalsy()

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  // end get
})

describe('Database.all', () => {
  it('select all tracks', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM tracks ORDER BY trackId;'
    chinookCloud.all(sql, (cloudError, cloudRows) => {
      expect(cloudError).toBeNull()
      expect(cloudRows).toHaveLength(3503)
      expect(cloudRows?.[0]).toMatchObject(CHINOOK_FIRST_TRACK)

      chinookFile.all(sql, (fileError, fileRows) => {
        expect(fileError).toBeNull()
        expect(fileRows).toHaveLength(3503)
        expect(fileRows[0]).toMatchObject(CHINOOK_FIRST_TRACK)
        expect(fileRows[0]).toMatchObject(cloudRows?.[0] as any)

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  it('select single track', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM tracks WHERE trackId = ?;'
    chinookCloud.all(sql, 2, (cloudError, cloudRows) => {
      expect(cloudError).toBeFalsy()
      expect(cloudRows).toHaveLength(1)
      expect((cloudRows?.[0] as any)['TrackId']).toBe(2)

      chinookFile.all(sql, 2, (fileError, fileRows) => {
        expect(fileError).toBeNull()
        expect(fileRows).toHaveLength(1)
        expect(fileRows[0]).toMatchObject(cloudRows?.[0] as any)

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  it('select empty results', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM tracks WHERE trackId = ?;'
    chinookCloud.all(sql, -1, (cloudError, cloudRows) => {
      expect(cloudError).toBeFalsy()
      expect(cloudRows).toHaveLength(0)
      expect(Array.isArray(cloudRows)).toBeTruthy() // returns empty array [] not null

      chinookFile.all(sql, -1, (fileError, fileRows) => {
        expect(fileError).toBeNull()
        expect(fileRows).toHaveLength(0)
        expect(fileRows).toMatchObject(cloudRows as any)
        expect(Array.isArray(fileRows)).toBeTruthy()

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  it('sqlitecloud: select with errors', done => {
    const chinookCloud = getChinookDatabase()
    const sql = 'SELECT * FROM missingTable;'
    chinookCloud.all(sql, (cloudError, cloudRows) => {
      expect(cloudError).toBeTruthy()
      expect(cloudRows).toBeFalsy()

      chinookCloud.close()
      done()
    })
  })

  it('sqlite3: select with errors', done => {
    const chinookFile = getChinookDatabaseFile()
    const sql = 'SELECT * FROM missingTable;'
    chinookFile.all(sql, (fileError, fileRows) => {
      expect(fileError).toBeTruthy()
      expect(fileRows).toBeFalsy()

      chinookFile.close()
      done()
    })
  })

  // end all
})

describe('Database.each', () => {
  it(
    'select all tracks',
    done => {
      const chinookCloud = getChinookDatabase()
      const chinookFile = getChinookDatabaseFile()

      let cloudCallbacks = 0
      let fileCallbacks = 0

      const sql = 'SELECT * FROM tracks ORDER BY trackId;'
      chinookCloud.each<any>(
        sql,
        (error, row) => {
          expect(error).toBeNull()
          expect(row.TrackId).toBe(++cloudCallbacks)
        },
        (cloudError, cloudRowCount) => {
          expect(cloudError).toBeNull()
          expect(cloudRowCount).toBe(3503)
          expect(cloudCallbacks).toBe(3503)

          chinookFile.each<any>(
            sql,
            (error, row) => {
              expect(error).toBeNull()
              expect(row.TrackId).toBe(++fileCallbacks)
            },
            (fileError, fileRowCount) => {
              expect(fileError).toBeNull()
              expect(fileRowCount).toBe(3503)
              expect(fileCallbacks).toBe(3503)

              chinookCloud.close()
              chinookFile.close()
              done()
            }
          )
        }
      )
    },
    LONG_TIMEOUT
  )

  it('select empty results', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM tracks WHERE trackId = ?;'
    chinookCloud.all(sql, -1, (cloudError, cloudRows) => {
      expect(cloudError).toBeFalsy()
      expect(cloudRows).toHaveLength(0)
      expect(Array.isArray(cloudRows)).toBeTruthy() // returns empty array [] not null

      chinookFile.all(sql, -1, (fileError, fileRows) => {
        expect(fileError).toBeNull()
        expect(fileRows).toHaveLength(0)
        expect(fileRows).toMatchObject(cloudRows as any)
        expect(Array.isArray(fileRows)).toBeTruthy()

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  it('select with errors', done => {
    const chinookCloud = getChinookDatabase()
    const chinookFile = getChinookDatabaseFile()

    const sql = 'SELECT * FROM missingTable;'
    chinookCloud.each<any>(sql, null, (cloudError, cloudRows) => {
      expect(cloudError).toBeTruthy()
      expect(cloudRows).toBeFalsy()

      chinookFile.each<any>(sql, null, (fileError, fileRows) => {
        expect(fileError).toBeTruthy()
        expect(fileRows).toBeFalsy()

        chinookCloud.close()
        chinookFile.close()
        done()
      })
    })
  })

  // end each
})
