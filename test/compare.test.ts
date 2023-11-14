/**
 * compare.test.ts - test driver api against sqlite3 equivalents
 */

import { SQLiteCloudError, SQLiteCloudConnection, SQLiteCloudRow } from '../src/index'
import { Database, ErrorCallback } from '../src/index'

import { CHINOOK_DATABASE_URL, TESTING_DATABASE_URL, LONG_TIMEOUT } from './connection.test'

// https://github.com/TryGhost/node-sqlite3/wiki/API
import sqlite3 from 'sqlite3'

import * as dotenv from 'dotenv'
dotenv.config()

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { join } from 'path'
import { readFileSync } from 'fs'

const CHINOOK_DATABASE_FILE = join(__dirname, 'assets/chinook.db')

const CHINOOK_FIRST_TRACK = {
  AlbumId: 1,
  Bytes: 11170334,
  Composer: 'Angus Young, Malcolm Young, Brian Johnson',
  GenreId: 1,
  MediaTypeId: 1,
  Milliseconds: 343719,
  Name: 'For Those About To Rock (We Salute You)',
  TrackId: 1,
  UnitPrice: 0.99
}

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

        chinookFile.all(sql, -1, (fileError, fileRows) => {
          expect(fileError).toBeNull()
          expect(fileRows).toHaveLength(0)
          expect(fileRows).toMatchObject(cloudRows as any)

          done()
        })
      })
    })

    // end all
  })

  // end compare
})
