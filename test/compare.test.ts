/**
 * compare.test.ts - test driver api against sqlite3 equivalents
 */

import { Database } from '../src/index'
import { CHINOOK_DATABASE_URL, CHINOOK_DATABASE_FILE, CHINOOK_FIRST_TRACK, LONG_TIMEOUT } from './connection.test'
import { PREPARE_TESTING_SQL, createTestDatabase } from './database.test'

// https://github.com/TryGhost/node-sqlite3/wiki/API
import sqlite3 from 'sqlite3'
import { join } from 'path'

const INSERT_SQL = "INSERT INTO people (name, hobby, age) VALUES ('Fantozzi Ugo', 'Competitive unicorn farting', 42); "
const TESTING_DATABASE_FILE = join(__dirname, 'assets/testing.db')

function getTestingDatabaseFile(): sqlite3.Database {
  // create a unique id for this test run based on current time with
  // enough precision to avoid duplicate ids and be human readable
  const id = new Date()
    .toISOString()
    .replace(/-|:|T|Z|\./g, '')
    .slice(0, -1)

  const testingFilename = TESTING_DATABASE_FILE.replace('.db', `-${id}.db`)
  const testingFile = new sqlite3.Database(testingFilename)
  testingFile.exec(PREPARE_TESTING_SQL)
  return testingFile
}

describe('compare.test.ts', () => {
  let chinookCloud: Database
  let chinookFile: sqlite3.Database

  beforeEach(done => {
    chinookCloud = new Database(CHINOOK_DATABASE_URL, error => {
      expect(error).toBeNull()

      // now open the same database with sqlite3
      chinookFile = new sqlite3.Database(CHINOOK_DATABASE_FILE, error => {
        expect(error).toBeNull()
        done(error)
      })
    })
    // chinookCloud.verbose()
  })

  afterEach(() => {
    chinookCloud.close()
    chinookFile.close()
  })

  describe('run', () => {
    it('sqlite3: insert with plain sql', done => {
      const testingFile = getTestingDatabaseFile()

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
      const testingCloud = createTestDatabase()

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

  describe('get', () => {
    it('select all tracks', done => {
      const sql = 'SELECT * FROM tracks ORDER BY trackId;'
      chinookCloud.get<any>(sql, (cloudError, cloudRow) => {
        expect(cloudError).toBeNull()
        expect(cloudRow).toMatchObject(CHINOOK_FIRST_TRACK)

        chinookFile.get<any>(sql, (fileError, fileRow) => {
          expect(fileError).toBeNull()
          expect(fileRow).toMatchObject(CHINOOK_FIRST_TRACK)
          expect(fileRow).toMatchObject(cloudRow)

          done()
        })
      })
    })

    it('select single track', done => {
      const sql = 'SELECT * FROM tracks WHERE trackId = ?;'
      chinookCloud.get<any>(sql, 2, (cloudError, cloudRow) => {
        expect(cloudError).toBeFalsy()
        expect((cloudRow as any)['TrackId']).toBe(2)

        chinookFile.get<any>(sql, 2, (fileError, fileRow) => {
          expect(fileError).toBeNull()
          expect(fileRow).toMatchObject(cloudRow)

          done()
        })
      })
    })

    it('select empty results', done => {
      const sql = 'SELECT * FROM tracks WHERE trackId = ?;'
      chinookCloud.get(sql, -1, (cloudError, cloudRow) => {
        expect(cloudError).toBeFalsy()
        expect(cloudRow).toBeUndefined()

        chinookFile.get(sql, -1, (fileError, fileRow) => {
          expect(fileError).toBeNull()
          expect(fileRow).toBeUndefined()

          done()
        })
      })
    })

    it('select with errors', done => {
      const sql = 'SELECT * FROM missingTable;'
      chinookCloud.get(sql, (cloudError, cloudRows) => {
        expect(cloudError).toBeTruthy()
        expect(cloudRows).toBeFalsy()

        chinookFile.get(sql, (fileError, fileRows) => {
          expect(fileError).toBeTruthy()
          expect(fileRows).toBeFalsy()
          done()
        })
      })
    })

    // end get
  })

  describe('all', () => {
    it('select all tracks', done => {
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

          done()
        })
      })
    })

    it('select single track', done => {
      const sql = 'SELECT * FROM tracks WHERE trackId = ?;'
      chinookCloud.all(sql, 2, (cloudError, cloudRows) => {
        expect(cloudError).toBeFalsy()
        expect(cloudRows).toHaveLength(1)
        expect((cloudRows?.[0] as any)['TrackId']).toBe(2)

        chinookFile.all(sql, 2, (fileError, fileRows) => {
          expect(fileError).toBeNull()
          expect(fileRows).toHaveLength(1)
          expect(fileRows[0]).toMatchObject(cloudRows?.[0] as any)

          done()
        })
      })
    })

    it('select empty results', done => {
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

          done()
        })
      })
    })

    it('sqlitecloud: select with errors', done => {
      const sql = 'SELECT * FROM missingTable;'
      chinookCloud.all(sql, (cloudError, cloudRows) => {
        expect(cloudError).toBeTruthy()
        expect(cloudRows).toBeFalsy()
        done()
      })
    })

    it('sqlite3: select with errors', done => {
      const sql = 'SELECT * FROM missingTable;'
      chinookFile.all(sql, (fileError, fileRows) => {
        expect(fileError).toBeTruthy()
        expect(fileRows).toBeFalsy()
        done()
      })
    })

    // end all
  })

  describe('each', () => {
    it(
      'select all tracks',
      done => {
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

                done()
              }
            )
          }
        )
      },
      LONG_TIMEOUT
    )

    it('select empty results', done => {
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

          done()
        })
      })
    })

    it('select with errors', done => {
      const sql = 'SELECT * FROM missingTable;'
      chinookCloud.each<any>(sql, null, (cloudError, cloudRows) => {
        expect(cloudError).toBeTruthy()
        expect(cloudRows).toBeFalsy()

        chinookFile.each<any>(sql, null, (fileError, fileRows) => {
          expect(fileError).toBeTruthy()
          expect(fileRows).toBeFalsy()
          done()
        })
      })
    })

    // end each
  })

  // end compare
})
