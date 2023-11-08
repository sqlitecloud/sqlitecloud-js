/**
 * database.test.ts - test driver api
 */

import { Database } from '../src/database'
import { testConfig } from './protocol.test'
import * as dotenv from 'dotenv'
dotenv.config()

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe('Database', () => {
  describe('all', () => {
    it('select * from tracks', done => {
      const db = new Database(testConfig, null, () => {
        db.all('select * from tracks', (err: Error, rows: any[]) => {
          expect(err).toBeNull()
          expect(rows).toBeDefined()
          expect(rows).toHaveLength(3503)
          expect(rows[0]).toMatchObject({
            AlbumId: NaN,
            Bytes: 1117033,
            Composer: 'Angus Young, Malcolm Young, Brian Johnson',
            GenreId: NaN,
            MediaTypeId: NaN,
            Milliseconds: 34371,
            Name: 'For Those About To Rock (We Salute You)',
            TrackId: NaN,
            UnitPrice: 0.9
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
    it('select * from tracks', done => {
      const db = new Database(testConfig, null, () => {
        db.get('select * from tracks', (err: Error, row: any) => {
          expect(err).toBeNull()
          expect(row).toBeDefined()
          expect(row).toMatchObject({
            AlbumId: NaN,
            Bytes: 1117033,
            Composer: 'Angus Young, Malcolm Young, Brian Johnson',
            GenreId: NaN,
            MediaTypeId: NaN,
            Milliseconds: 34371,
            Name: 'For Those About To Rock (We Salute You)',
            TrackId: NaN,
            UnitPrice: 0.9
          })

          db.close(error => {
            expect(error).toBeNull()
            done()
          })
        })
      })
    })
  })
})
