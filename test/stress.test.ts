/**
 * stress.test.ts - opens lots of connections and queries
 */

import { Database } from '../src/database'
import { CHINOOK_DATABASE_URL } from './connection.test'
import { getTestingDatabase } from './database.test'

const EXTRA_LONG_TIMEOUT = 60 * 60 * 1000 // 1 hour

describe('stress testing', () => {
  it(
    'should open lots of simple connections in sequence',
    async () => {
      let numConnectios = 500,
        i = 1
      try {
        const startTime = Date.now()
        for (let i = 1; i <= numConnectios; i++) {
          const connection = new Database(CHINOOK_DATABASE_URL)
          const results = await connection.sql`SELECT ${i} as 'connection_id'`
          expect(results[0]['connection_id']).toBe(i)
          connection.close()
          if (i % 25 === 0) {
            const connectionMs = (Date.now() - startTime) / i
            console.log(`${i}x open and close, ${connectionMs.toFixed(0)}ms per connection`)
            expect(connectionMs).toBeLessThan(2000)
          }
        }
      } catch (error) {
        console.error(`Error on connection ${i}: ${error}`)
        expect(error).toBeNull()
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should open lots of read and write connections in sequence',
    async () => {
      let numConnectios = 20,
        i = 1
      try {
        const startTime = Date.now()
        for (let i = 1; i <= numConnectios; i++) {
          const connection = getTestingDatabase()
          const results = await connection.sql`SELECT * FROM people ORDER BY RANDOM() LIMIT 12`
          expect(results).toHaveLength(12)
          connection.close()
          if (i % 25 === 0) {
            const connectionMs = (Date.now() - startTime) / i
            console.log(`${i}x open, read, write and close, ${connectionMs.toFixed(0)}ms per connection`)
            expect(connectionMs).toBeLessThan(2000)
          }
        }
      } catch (error) {
        console.error(`Error on connection ${i}: ${error}`)
        expect(error).toBeNull()
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should open lots of simple connections simultaneously',
    async () => {
      const startTime = Date.now()
      const numConnections = 500
      const connections: Database[] = []

      try {
        for (let i = 0; i < numConnections; i++) {
          connections.push(
            new Database(CHINOOK_DATABASE_URL, error => {
              if (error) {
                console.error(`Error on connection ${i}: ${error}`)
              }
              expect(error).toBeNull()
            })
          )
        }
        for (let i = 0; i < numConnections; i++) {
          const connection = connections[i]
          expect(connection).not.toBeNull()
          const results = await connection.sql`SELECT ${i} as 'connection_id'`
          expect(results[0]['connection_id']).toBe(i)
        }
        for (let i = 0; i < numConnections; i++) {
          connections[i].close()
        }

        const connectionMs = (Date.now() - startTime) / numConnections
        console.log(`${numConnections}x open simultaneously, ${connectionMs.toFixed(0)}ms per connection`)
        expect(connectionMs).toBeLessThan(2000)
      } catch (error) {
        console.error(`Error opening connection ${connections.length}: ${error}`)
        expect(error).toBeNull()
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should do lots of async database.sql selects in sequence',
    async () => {
      const numQueries = 20
      const startTime = Date.now()
      const database = new Database(CHINOOK_DATABASE_URL)
      const table = 'tracks'
      for (let i = 0; i < numQueries; i++) {
        const results = await database.sql`SELECT * FROM ${table} ORDER BY RANDOM() LIMIT 12`
        expect(results).toHaveLength(12)
        expect(Object.keys(results[0])).toEqual(['id', 'name', 'age', 'hobby'])
      }

      const queryMs = (Date.now() - startTime) / numQueries
      console.log(`${numQueries}x database.sql selects, ${queryMs.toFixed(0)}ms per query`)
      expect(queryMs).toBeLessThan(2000)
    },
    EXTRA_LONG_TIMEOUT
  )
})
