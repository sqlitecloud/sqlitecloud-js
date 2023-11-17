/**
 * stress.test.ts - opens lots of connections and queries
 */

import { Database } from '../src/database'
import { createTestingDatabaseAsync, getChinookDatabase, removeDatabaseAsync } from './database.test'

const EXTRA_LONG_TIMEOUT = 60 * 60 * 1000 // 1 hour

/** Number of times or size of stress (when repeated in sequence) */
const SEQUENCE_TEST_SIZE = 100

/** Concurrency size for multiple connection tests */
const SIMULTANEOUS_TEST_SIZE = 500

describe('stress testing', () => {
  it(
    `should do ${SEQUENCE_TEST_SIZE} read connections in sequence`,
    async () => {
      let i = 1
      try {
        const startTime = Date.now()
        for (let i = 1; i <= SEQUENCE_TEST_SIZE; i++) {
          const connection = getChinookDatabase()
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
    `should do ${SEQUENCE_TEST_SIZE} read and write connections in sequence`,
    async () => {
      let i = 1
      try {
        const startTime = Date.now()
        for (let i = 1; i <= SEQUENCE_TEST_SIZE; i++) {
          // note: testing database will auto populate when created and stress raft synchrnization
          const database = await createTestingDatabaseAsync()
          const results = await database.sql`SELECT * FROM people ORDER BY RANDOM() LIMIT 12`
          expect(results).toHaveLength(12)
          await removeDatabaseAsync(database)
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
    `should do ${SIMULTANEOUS_TEST_SIZE} read connections simultaneously`,
    async () => {
      const startTime = Date.now()
      const connections: Database[] = []

      try {
        for (let i = 0; i < SIMULTANEOUS_TEST_SIZE; i++) {
          connections.push(
            getChinookDatabase(error => {
              if (error) {
                console.error(`Error on connection ${i}: ${error}`)
              }
              expect(error).toBeNull()
            })
          )
        }
        for (let i = 0; i < SIMULTANEOUS_TEST_SIZE; i++) {
          const connection = connections[i]
          expect(connection).not.toBeNull()
          const results = await connection.sql`SELECT ${i} as 'connection_id'`
          expect(results[0]['connection_id']).toBe(i)
        }
        for (let i = 0; i < SIMULTANEOUS_TEST_SIZE; i++) {
          connections[i].close()
        }

        const connectionMs = (Date.now() - startTime) / SIMULTANEOUS_TEST_SIZE
        console.log(`${SIMULTANEOUS_TEST_SIZE}x open simultaneously, ${connectionMs.toFixed(0)}ms per connection`)
        expect(connectionMs).toBeLessThan(2000)
      } catch (error) {
        console.error(`Error opening connection ${connections.length}: ${error}`)
        expect(error).toBeNull()
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    `should do ${SEQUENCE_TEST_SIZE} async database.sql reads in sequence`,
    async () => {
      const numQueries = 20
      const startTime = Date.now()
      const database = getChinookDatabase()
      const table = 'tracks'
      for (let i = 0; i < SEQUENCE_TEST_SIZE; i++) {
        const results = await database.sql`SELECT * FROM ${table} ORDER BY RANDOM() LIMIT 12`
        expect(results).toHaveLength(12)
        expect(Object.keys(results[0])).toEqual(['TrackId', 'Name', 'AlbumId', 'MediaTypeId', 'GenreId', 'Composer', 'Milliseconds', 'Bytes', 'UnitPrice'])
      }

      const queryMs = (Date.now() - startTime) / numQueries
      console.log(`${numQueries}x database.sql selects, ${queryMs.toFixed(0)}ms per query`)
      expect(queryMs).toBeLessThan(2000)
    },
    EXTRA_LONG_TIMEOUT
  )
})
