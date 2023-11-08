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

  describe('each', () => {
    it('select * from tracks', done => {
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

      const db = new Database(testConfig, null, () => {
        db.each('select * from tracks', rowCallback, completeCallback)
      })
    })
  })

  describe('exec', () => {
    it('execute set client key statement', done => {
      const db = new Database(testConfig, null, () => {
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
      const db = new Database(testConfig, null, () => {
        db.exec('SET BOGUS STATEMENT TO 1;', error => {
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
})
