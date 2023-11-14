/**
 * compare.test.ts - test driver api against sqlite3 equivalents
 */

import { Database } from '../src/index'
import { CHINOOK_DATABASE_URL, CHINOOK_DATABASE_FILE, CHINOOK_FIRST_TRACK } from './connection.test'

// https://github.com/TryGhost/node-sqlite3/wiki/API
import sqlite3 from 'sqlite3'

describe('compare', () => {
  let chinookCloud: Database
  let chinookFile: sqlite3.Database

  beforeAll(done => {
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

  afterAll(() => {
    chinookCloud.close()
    chinookFile.close()
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

    // TODO sqlitecloud-js / fix problem with jest tests of sendCommands error conditions #24

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

  // end compare
})
