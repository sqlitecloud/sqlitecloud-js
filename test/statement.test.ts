/**
 * database.test.ts - test driver api
 */

import { SQLiteCloudError } from '../src/index'
import { Database, ErrorCallback } from '../src/database'
import { testConfig } from './protocol.test'
import * as dotenv from 'dotenv'
dotenv.config()

const LONG_TIMEOUT = 30 * 1000

const testingDatabaseUrl = 'sqlitecloud://admin:uN3ARhdcKQ@rymbzy6am.sqlite.cloud:8860/testing.db?sqliteMode=1'
const chinookDatabaseUrl = 'sqlitecloud://admin:uN3ARhdcKQ@rymbzy6am.sqlite.cloud:8860/chinook.db?sqliteMode=1'
//const chinookDatabaseUrl = 'sqlitecloud://admin:uN3ARhdcKQ@rymbzy6am.sqlite.cloud:8860/chinook.db'

function getTestDatabase(name: string, callback: ErrorCallback): Database {
  let connectionString = name
  switch (name) {
    case 'chinook':
      connectionString = chinookDatabaseUrl
      break
  }

  const db = new Database(testingDatabaseUrl, null, callback)
  db.verbose()
  return db
}

// Function to generate a random name
const generateRandomName = (): string => {
  const firstName = ['John', 'Jane', 'Alex', 'Laura', 'Tom', 'Linda']
  const lastName = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Davis']
  return `${firstName[Math.floor(Math.random() * firstName.length)]} ${lastName[Math.floor(Math.random() * lastName.length)]}`
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe('Statement', () => {
  describe('prepare', () => {
    it('without initial bindings', done => {
      const db = new Database(chinookDatabaseUrl, null, database => {
        expect(db).toBeDefined()
        const statement = db.prepare('SELECT * FROM tracks WHERE albumId = ?;', (err: Error, results: any) => {
          expect(err).toBeNull()
        })

        statement.all(3, (err: Error, rows: any[]) => {
          expect(err).toBeNull()
          expect(rows).toBeDefined()
          expect(rows).toHaveLength(3)
          expect(rows).toMatchObject([
            {
              AlbumId: 3,
              Bytes: 3990994,
              Composer: 'F. Baltes, S. Kaufman, U. Dirkscneider & W. Hoffman',
              GenreId: 1,
              MediaTypeId: 2,
              Milliseconds: 230619,
              Name: 'Fast As a Shark',
              TrackId: 3,
              UnitPrice: 0.99
            },
            {
              AlbumId: 3,
              Bytes: 4331779,
              Composer: 'F. Baltes, R.A. Smith-Diesel, S. Kaufman, U. Dirkscneider & W. Hoffman',
              GenreId: 1,
              MediaTypeId: 2,
              Milliseconds: 252051,
              Name: 'Restless and Wild',
              TrackId: 4,
              UnitPrice: 0.99
            },
            {
              AlbumId: 3,
              Bytes: 6290521,
              Composer: 'Deaffy & R.A. Smith-Diesel',
              GenreId: 1,
              MediaTypeId: 2,
              Milliseconds: 375418,
              Name: 'Princess of the Dawn',
              TrackId: 5,
              UnitPrice: 0.99
            }
          ])

          db.close(error => {
            expect(error).toBeNull()
            done()
          })
        })
      })
    })
  })
})
