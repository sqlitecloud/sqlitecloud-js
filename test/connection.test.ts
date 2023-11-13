/**
 * connection.test.ts - test low level communication protocol
 */

import { SQLiteCloudConfig, SQLiteCloudError } from '../src/index'
import { SQLiteCloudConnection } from '../src/connection'
import { parseConnectionString } from '../src/utilities'

import * as dotenv from 'dotenv'
dotenv.config()

export const CHINOOK_DATABASE_URL = process.env.CHINOOK_DATABASE_URL as string
export const TESTING_DATABASE_URL = process.env.TESTING_DATABASE_URL as string

export const LONG_TIMEOUT = 100 * 1000 // 100 seconds

export function getChinoookConfig(): SQLiteCloudConfig {
  return parseConnectionString(CHINOOK_DATABASE_URL)
}
export function getTestingConfig(): SQLiteCloudConfig {
  return parseConnectionString(TESTING_DATABASE_URL)
}

describe('connection', () => {
  let connection: SQLiteCloudConnection

  beforeEach(async () => {
    expect(CHINOOK_DATABASE_URL).toBeDefined()
    expect(TESTING_DATABASE_URL).toBeDefined()

    if (!connection) {
      try {
        connection = new SQLiteCloudConnection(CHINOOK_DATABASE_URL + '?nonlinearizable=1')
        expect(connection).toBeDefined()
        // connecting.verbose()
      } catch (error) {
        console.error(error)
        throw error
      }
    }
  })

  afterEach(async () => {
    if (connection) {
      await connection.close()
      // @ts-ignore
      connection = undefined
    }
  })

  describe('connect', () => {
    it('should connect', () => {
      // ...in beforeEach
    })

    it('should connect with config object string', async () => {
      const configObj = parseConnectionString(CHINOOK_DATABASE_URL)
      const connection = new SQLiteCloudConnection(configObj)

      expect(connection).toBeDefined()
      await connection.connect()
      expect(connection.connected).toBe(true)
      await connection.close()
      expect(connection.connected).toBe(false)
    })

    it('should connect with connection string', async () => {
      const conn = new SQLiteCloudConnection(CHINOOK_DATABASE_URL)

      expect(conn).toBeDefined()
      await conn.connect()
      expect(conn.connected).toBe(true)
      await conn.close()
      expect(conn.connected).toBe(false)
    })

    it('should throw when connection string lacks credentials', async () => {
      try {
        // use valid connection string but without credentials
        const testingConfig = getTestingConfig()
        delete testingConfig.username
        delete testingConfig.password

        const connection = new SQLiteCloudConnection(testingConfig)
        expect(connection).toBeDefined()
        await connection.connect()
        // fail the test if the error is not thrown
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)
        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('The user, password and host arguments must be specified.')
        expect(sqliteCloudError.errorCode).toBe('ERR_MISSING_ARGS')
        expect(sqliteCloudError.externalErrorCode).toBeUndefined()
        expect(sqliteCloudError.offsetCode).toBeUndefined()
      }
    })
  })

  describe('send test commands', () => {
    it('should test integer', async () => {
      const rowset = await connection.sendCommands('TEST INTEGER')
      expect(rowset).toBe(123456)
    })

    it('should test null', async () => {
      const rowset = await connection.sendCommands('TEST NULL')
      expect(rowset).toBeNull()
    })

    it('should test float', async () => {
      const rowset = await connection.sendCommands('TEST FLOAT')
      expect(rowset).toBe(3.1415926)
    })

    it('should test string', async () => {
      const rowset = await connection.sendCommands('TEST STRING')
      expect(rowset).toBe('Hello World, this is a test string.')
    })

    it('should test zero string', async () => {
      const rowset = await connection.sendCommands('TEST ZERO_STRING')
      expect(rowset).toBe('Hello World, this is a zero-terminated test string.')
    })

    it('should test string0', async () => {
      const rowset = await connection.sendCommands('TEST STRING0')
      expect(rowset).toBe('')
    })

    it('should test command', async () => {
      const rowset = await connection.sendCommands('TEST COMMAND')
      expect(rowset).toBe('PING')
    })

    it('should test json', async () => {
      const rowset = await connection.sendCommands('TEST JSON')
      expect(rowset).toEqual({
        'msg-from': { class: 'soldier', name: 'Wixilav' },
        'msg-to': { class: 'supreme-commander', name: '[Redacted]' },
        'msg-type': ['0xdeadbeef', 'irc log'],
        'msg-log': [
          'soldier: Boss there is a slight problem with the piece offering to humans',
          'supreme-commander: Explain yourself soldier!',
          "soldier: Well they don't seem to move anymore...",
          'supreme-commander: Oh snap, I came here to see them twerk!'
        ]
      })
    })

    it('should test blob', async () => {
      const rowset = await connection.sendCommands('TEST BLOB')
      expect(typeof rowset).toBe('object')
      expect(rowset).toBeInstanceOf(Buffer)
      const bufferrowset = rowset as any as Buffer
      expect(bufferrowset.length).toBe(1000)
    })

    it('should test blob0', async () => {
      const rowset = await connection.sendCommands('TEST BLOB0')
      expect(typeof rowset).toBe('object')
      expect(rowset).toBeInstanceOf(Buffer)
      const bufferrowset = rowset as any as Buffer
      expect(bufferrowset.length).toBe(0)
    })
    /*
    it('should test error', async () => {
      try {
        connection.verbose()
        await connection.sendCommands('TEST ERROR')
        // Fail the test if the error is not thrown
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)

        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('This is a test error message with a devil error code.')
        expect(sqliteCloudError.errorCode).toBe('66666')
        expect(sqliteCloudError.externalErrorCode).toBe('0')
        expect(sqliteCloudError.offsetCode).toBe(-1)
      }
      console.log('test finished')
    })

    it('should test exterror', async () => {
      try {
        connection.verbose()
        await connection.sendCommands('TEST EXTERROR')
        // Fail the test if the error is not thrown
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)

        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('This is a test error message with an extcode and a devil error code.')
        expect(sqliteCloudError.errorCode).toBe('66666')
        expect(sqliteCloudError.externalErrorCode).toBe('333')
        expect(sqliteCloudError.offsetCode).toBe(-1)
      }
    })
*/
    it('should test array', async () => {
      const rowset = await connection.sendCommands('TEST ARRAY')
      expect(Array.isArray(rowset)).toBe(true)

      const arrayrowset = rowset as any as Array<any>
      expect(arrayrowset.length).toBe(5)
      expect(arrayrowset[0]).toBe('Hello World')
      expect(arrayrowset[1]).toBe(123456)
      expect(arrayrowset[2]).toBe(3.1415)
      expect(arrayrowset[3]).toBeNull()
    })

    it('should test rowset', async () => {
      const rowset = await connection.sendCommands('TEST ROWSET')
      expect(rowset.numberOfRows).toBe(41)
      expect(rowset.numberOfColumns).toBe(2)
      expect(rowset.version == 1 || rowset.version == 2).toBeTruthy()
      expect(rowset.columnsNames).toEqual(['key', 'value'])
    })

    it(
      'should test chunked rowset',
      async () => {
        const rowset = await connection.sendCommands('TEST ROWSET_CHUNK')
        expect(rowset.numberOfRows).toBe(147)
        expect(rowset.numberOfColumns).toBe(1)
        expect(rowset.columnsNames).toEqual(['key'])
      },
      30 * 1000 // long timeout
    )
  })

  describe('send select commands', () => {
    it('should select long formatted string', async () => {
      const rowset = await connection.sendCommands("USE DATABASE :memory:; select printf('%.*c', 1000, 'x') AS DDD")
      expect(rowset.numberOfColumns).toBe(1)
      expect(rowset.numberOfRows).toBe(1)
      expect(rowset.version == 1 || rowset.version == 2).toBeTruthy()

      const stringrowset = rowset.getItem(0, 0) as string
      expect(stringrowset.startsWith('xxxxxxxxxxxxx')).toBeTruthy()
      expect(stringrowset).toHaveLength(1000)
    })

    it('should select database', async () => {
      const rowset = await connection.sendCommands('USE DATABASE chinook.db;')
      expect(rowset.numberOfColumns).toBeUndefined()
      expect(rowset.numberOfRows).toBeUndefined()
      expect(rowset.version).toBeUndefined()
    })

    it('should select * from tracks limit 10 (no chunks)', async () => {
      let rowset = await connection.sendCommands('SELECT * FROM tracks LIMIT 10;')
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(10)
    })

    it('should select * from tracks (with chunks)', async () => {
      let rowset = await connection.sendCommands('SELECT * FROM tracks;')
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(3503)
    })

    it('should select * from albums', async () => {
      let rowset = await connection.sendCommands('SELECT * FROM albums;')
      expect(rowset.numberOfColumns).toBe(3)
      expect(rowset.numberOfRows).toBe(347)
      expect(rowset.version == 1 || rowset.version == 2).toBeTruthy()
    })
  })

  describe('connection stress testing', () => {
    it(
      '20x test string',
      async () => {
        const numQueries = 20
        const startTime = Date.now()
        // connection.verbose()
        for (let i = 0; i < numQueries; i++) {
          let result = await connection.sendCommands('TEST STRING')
          expect(result).toBe('Hello World, this is a test string.')
        }
        const queryMs = (Date.now() - startTime) / numQueries
        console.log(`${numQueries}x test string, ${queryMs.toFixed(0)}ms per query`)
        expect(queryMs).toBeLessThan(2000)
      },
      LONG_TIMEOUT
    )

    it(
      '20x individual selects',
      async () => {
        const numQueries = 20
        const startTime = Date.now()
        for (let i = 0; i < numQueries; i++) {
          let rowset = await connection.sendCommands('SELECT * FROM albums ORDER BY RANDOM() LIMIT 4;')
          expect(rowset.numberOfColumns).toBe(3)
          expect(rowset.numberOfRows).toBe(4)
        }
        const queryMs = (Date.now() - startTime) / numQueries
        console.log(`${numQueries}x individual selects, ${queryMs.toFixed(0)}ms per query`)
        expect(queryMs).toBeLessThan(2000)
      },
      LONG_TIMEOUT
    )

    it(
      '20x batched selects',
      async () => {
        const numQueries = 20
        const startTime = Date.now()
        for (let i = 0; i < numQueries; i++) {
          let rowset = await connection.sendCommands(
            'SELECT * FROM albums ORDER BY RANDOM() LIMIT 16; SELECT * FROM albums ORDER BY RANDOM() LIMIT 12; SELECT * FROM albums ORDER BY RANDOM() LIMIT 8; SELECT * FROM albums ORDER BY RANDOM() LIMIT 4;'
          )
          // server only returns the last rowset?
          expect(rowset.numberOfColumns).toBe(3)
          expect(rowset.numberOfRows).toBe(4)
        }
        const queryMs = (Date.now() - startTime) / numQueries
        console.log(`${numQueries}x batched selects, ${queryMs.toFixed(0)}ms per query`)
        expect(queryMs).toBeLessThan(2000)
      },
      LONG_TIMEOUT
    )
  })
})
