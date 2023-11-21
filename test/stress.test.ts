/**
 * stress.test.ts - opens lots of connections and queries
 */

import { Database, SQLiteCloudRowset } from '../src'
import { getChinookDatabase, getTestingDatabaseAsync, removeDatabaseAsync, SEQUENCE_TEST_SIZE, SIMULTANEOUS_TEST_SIZE, EXTRA_LONG_TIMEOUT } from './shared'

const WARN_SPEED_MS = 500 // will warn if slower than this
const EXPECT_SPEED_MS = 6 * 1000 // will throw error if slower than this

describe('stress testing', () => {
  it(
    'should do lots of read connections in sequence',
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
            if (connectionMs > WARN_SPEED_MS) {
              console.warn(`${i}x open and close, ${connectionMs.toFixed(0)}ms per connection`)
              expect(connectionMs).toBeLessThan(EXPECT_SPEED_MS)
            }
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
    'should do lots of read and write connections in sequence',
    async () => {
      let i = 1
      try {
        const startTime = Date.now()
        for (let i = 1; i <= SEQUENCE_TEST_SIZE; i++) {
          // note: testing database will auto populate when created and stress raft synchrnization
          const database = await getTestingDatabaseAsync()
          const results = await database.sql`SELECT * FROM people ORDER BY RANDOM() LIMIT 12`
          expect(results).toHaveLength(12)
          await removeDatabaseAsync(database)
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
        if (connectionMs > WARN_SPEED_MS) {
          console.warn(`${SIMULTANEOUS_TEST_SIZE}x open simultaneously, ${connectionMs.toFixed(0)}ms per connection`)
          expect(connectionMs).toBeLessThan(EXPECT_SPEED_MS)
        }
      } catch (error) {
        console.error(`Error opening connection ${connections.length}: ${error}`)
        expect(error).toBeNull()
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should do lots of async database.sql reads in sequence',
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
      if (queryMs > WARN_SPEED_MS) {
        console.warn(`${numQueries}x database.sql selects, ${queryMs.toFixed(0)}ms per query`)
        expect(queryMs).toBeLessThan(EXPECT_SPEED_MS)
      }
    },
    EXTRA_LONG_TIMEOUT
  )

  it('should receive small responses with uncompressed data', async () => {
    const chinook = getChinookDatabase()

    // small response is NOT compressed
    const smallResults = (await chinook.sql`SELECT hex(randomblob(1000)) 'small'`) as SQLiteCloudRowset // 1 KB
    expect(smallResults).toHaveLength(1)
    expect(smallResults.metadata.columns[0].name).toBe('small')
    expect(smallResults[0].small).toHaveLength(2 * 1000) // hex encoded
  })

  it(
    'should receive large responses with uncompressed data',
    async () => {
      const chinook = getChinookDatabase()

      // large response is NOT compressed
      const largeResults = (await chinook.sql`SELECT hex(zeroblob(10000000)) 'columName'`) as SQLiteCloudRowset // 10 MB
      expect(largeResults).toHaveLength(1)
      expect(largeResults.metadata.columns[0].name).toBe('columName')
      const largeResultString = largeResults[0].columName as string
      expect(largeResultString).toHaveLength(2 * 10000000) // 20 MB
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should receive medium responses with compressed data',
    async () => {
      const chinook = getChinookDatabase()

      // enable compression
      const enable = await chinook.sql`SET CLIENT KEY COMPRESSION TO 1;`

      // large response is compressed
      const blobSize = 20 * 1024 // 20 KB
      const largeCompressedResults = (await chinook.sql`SELECT hex(randomblob(${blobSize})) AS 'columnName'`) as SQLiteCloudRowset
      expect(largeCompressedResults).toHaveLength(1)
      expect(largeCompressedResults.metadata.columns[0].name).toBe('columnName')
      expect(largeCompressedResults[0].columnName).toHaveLength(2 * blobSize)
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should receive large responses with compressed data',
    async () => {
      const chinook = getChinookDatabase()

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
    },
    EXTRA_LONG_TIMEOUT
  )
})
