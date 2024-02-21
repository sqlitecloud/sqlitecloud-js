/**
 * stress.test.ts - opens lots of connections and queries
 */

import { Database, SQLiteCloudRowset } from '../src'
import {
  getChinookDatabase,
  getTestingDatabaseAsync,
  removeDatabaseAsync,
  SEQUENCE_TEST_SIZE,
  SIMULTANEOUS_TEST_SIZE,
  EXTRA_LONG_TIMEOUT,
  WARN_SPEED_MS,
  EXPECT_SPEED_MS
} from './shared'

describe('stress testing', () => {
  it(
    'should do lots of read connections in sequence',
    async () => {
      let connection
      let i = 1
      try {
        const startTime = Date.now()
        for (let i = 1; i <= SEQUENCE_TEST_SIZE; i++) {
          connection = getChinookDatabase()
          const results = await connection.sql`SELECT ${i} as 'connection_id'`
          expect(results[0]['connection_id']).toBe(i)
          connection.close()
          connection = null
          if (i % 25 === 0) {
            const connectionMs = (Date.now() - startTime) / i
            if (connectionMs > WARN_SPEED_MS) {
              console.warn(`${i}x open and close, ${connectionMs.toFixed(0)}ms per connection`)
              expect(connectionMs).toBeLessThan(EXPECT_SPEED_MS)
            }
          }
        }
      } catch (error) {
        console.error(`Error on connection ${i}: ${error}`)
        expect(error).toBeNull()
      } finally {
        connection?.close()
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should do lots of read and write connections in sequence',
    async () => {
      let database
      let i = 1
      try {
        const startTime = Date.now()
        for (let i = 1; i <= SEQUENCE_TEST_SIZE; i++) {
          // note: testing database will auto populate when created and stress raft synchrnization
          database = await getTestingDatabaseAsync()
          const results = await database.sql`SELECT * FROM people ORDER BY RANDOM() LIMIT 12`
          expect(results).toHaveLength(12)
          await removeDatabaseAsync(database)
          database = undefined
          if (i % 25 === 0) {
            const connectionMs = (Date.now() - startTime) / i
            if (connectionMs > WARN_SPEED_MS) {
              console.warn(`${i}x open, read, write and close, ${connectionMs.toFixed(0)}ms per connection`)
              expect(connectionMs).toBeLessThan(EXPECT_SPEED_MS)
            }
          }
        }
      } catch (error) {
        console.error(`Error on connection ${i}: ${error}`)
        expect(error).toBeNull()
      } finally {
        await removeDatabaseAsync(database)
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should do lots of read connections simultaneously',
    async () => {
      const startTime = Date.now()
      const connections: Database[] = []

      try {
        // open connection
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

        // use connection
        for (let i = 0; i < SIMULTANEOUS_TEST_SIZE; i++) {
          const connection = connections[i]
          expect(connection).not.toBeNull()
          const results = await connection.sql`SELECT ${i} as 'connection_id'`
          expect(results[0]['connection_id']).toBe(i)
        }

        const connectionMs = (Date.now() - startTime) / SIMULTANEOUS_TEST_SIZE
        if (connectionMs > WARN_SPEED_MS) {
          console.warn(`${SIMULTANEOUS_TEST_SIZE}x open simultaneously, ${connectionMs.toFixed(0)}ms per connection`)
          expect(connectionMs).toBeLessThan(EXPECT_SPEED_MS)
        }
      } catch (error) {
        console.error(`Error opening connection ${connections.length}: ${error}`)
        expect(error).toBeNull()
      } finally {
        // close connection
        for (let i = 0; i < SIMULTANEOUS_TEST_SIZE; i++) {
          connections[i]?.close()
        }
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should do lots of async database.sql reads in sequence',
    async () => {
      let chinook
      try {
        const numQueries = 20
        const startTime = Date.now()
        chinook = getChinookDatabase()

        const table = 'tracks'
        for (let i = 0; i < SEQUENCE_TEST_SIZE; i++) {
          const results = await chinook.sql`SELECT * FROM ${table} ORDER BY RANDOM() LIMIT 12`
          expect(results).toHaveLength(12)
          expect(Object.keys(results[0])).toEqual(['TrackId', 'Name', 'AlbumId', 'MediaTypeId', 'GenreId', 'Composer', 'Milliseconds', 'Bytes', 'UnitPrice'])
        }

        const queryMs = (Date.now() - startTime) / numQueries
        if (queryMs > WARN_SPEED_MS) {
          console.warn(`${numQueries}x database.sql selects, ${queryMs.toFixed(0)}ms per query`)
          expect(queryMs).toBeLessThan(EXPECT_SPEED_MS)
        }
      } finally {
        chinook?.close()
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it('should receive small responses with uncompressed data', async () => {
    let chinook
    try {
      chinook = getChinookDatabase()
      // small response is NOT compressed
      const smallResults = (await chinook.sql`SELECT hex(randomblob(1000)) 'small'`) as SQLiteCloudRowset // 1 KB
      expect(smallResults).toHaveLength(1)
      expect(smallResults.metadata.columns[0].name).toBe('small')
      expect(smallResults[0].small).toHaveLength(2 * 1000) // hex encoded
    } finally {
      chinook?.close()
    }
  })

  it(
    'should receive large responses with uncompressed data',
    async () => {
      let chinook
      try {
        chinook = getChinookDatabase()

        // large response is NOT compressed
        const largeResults = (await chinook.sql`SELECT hex(zeroblob(10000000)) 'columName'`) as SQLiteCloudRowset // 10 MB
        expect(largeResults).toHaveLength(1)
        expect(largeResults.metadata.columns[0].name).toBe('columName')
        const largeResultString = largeResults[0].columName as string
        expect(largeResultString).toHaveLength(2 * 10000000) // 20 MB
      } finally {
        chinook?.close()
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should receive medium responses with compressed data',
    async () => {
      let chinook
      try {
        chinook = getChinookDatabase()

        // enable compression
        const enable = await chinook.sql`SET CLIENT KEY COMPRESSION TO 1;`

        // large response is compressed
        const blobSize = 20 * 1024 // 20 KB
        const largeCompressedResults = (await chinook.sql`SELECT hex(randomblob(${blobSize})) AS 'columnName'`) as SQLiteCloudRowset
        expect(largeCompressedResults).toHaveLength(1)
        expect(largeCompressedResults.metadata.columns[0].name).toBe('columnName')
        expect(largeCompressedResults[0].columnName).toHaveLength(2 * blobSize)
      } finally {
        chinook?.close()
      }
    },
    EXTRA_LONG_TIMEOUT
  )
  /* TODO RESTORE
  it(
    'should receive large responses with compressed data',
    async () => {
      let chinook
      try {
        chinook = getChinookDatabase(undefined, { timeout: EXTRA_LONG_TIMEOUT })

        // enable compression
        const enable = await chinook.sql`SET CLIENT KEY COMPRESSION TO 1;`

        // large response is compressed
        const blobSize = 10 * 1024 * 1024 // 10 MB
        const largeCompressedResults = (await chinook.sql`SELECT hex(randomblob(${blobSize})) AS 'columnName'`) as SQLiteCloudRowset
        expect(largeCompressedResults).toHaveLength(1)
        expect(largeCompressedResults.metadata.columns[0].name).toBe('columnName')
        expect(largeCompressedResults[0].columnName).toHaveLength(2 * blobSize)

        const postfix = await chinook.sql`SELECT 1`
        expect(postfix).toHaveLength(1)
        expect(postfix[0]['1']).toBe(1)
      } finally {
        chinook?.close()
      }
    },
    EXTRA_LONG_TIMEOUT
  )
  */
})
