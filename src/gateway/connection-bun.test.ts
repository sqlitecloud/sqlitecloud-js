//
// gateway.test.ts - bun tests for
//

// MUST RUN USING BUN TEST RUNNER, EG:
// bun test ./src/gateway/gateway.test.ts --watch

import { SQLiteCloudError } from '../drivers/types'
import { SQLiteCloudBunConnection } from './connection-bun'

const CHINOOK_DATABASE_URL = process.env['CHINOOK_DATABASE_URL'] as string
console.assert(CHINOOK_DATABASE_URL, 'CHINOOK_DATABASE_URL is required')

import { expect, test, describe, beforeEach, afterEach } from 'bun:test'

async function getConnection(): Promise<SQLiteCloudBunConnection> {
  return new Promise((resolve, reject) => {
    const connection = new SQLiteCloudBunConnection(CHINOOK_DATABASE_URL, error => {
      if (error) {
        reject(error)
      }
      resolve(connection)
    })
  })
}

async function sendCommands(connection: SQLiteCloudBunConnection, command: string): Promise<any> {
  return new Promise((resolve, reject) => {
    connection.sendCommands(command, (error, result) => {
      if (error) {
        reject(error)
      }
      resolve(result)
    })
  })
}

describe('SQLiteCloudBunConnection', () => {
  // test different ways to connect
  describe('connecting', () => {
    test('can connect using bun socket', async done => {
      const connection = new SQLiteCloudBunConnection(CHINOOK_DATABASE_URL, error => {
        if (error) {
          console.error('Error connecting to database', error)
        }
        done(error)
      })
    })
  })

  // test command exercise different data types
  describe('test commands', () => {
    let chinookConnection: SQLiteCloudBunConnection

    beforeEach(async () => {
      chinookConnection = await getConnection()
    })

    afterEach(() => {
      if (chinookConnection) {
        chinookConnection.close()
      }
    })

    test('should test null', async () => {
      const results = await sendCommands(chinookConnection, 'TEST NULL')
      expect(results).toBeNull()
    })

    test('should test integer', async () => {
      const results = await sendCommands(chinookConnection, 'TEST INTEGER')
      expect(results).toBe(123456)
    })

    test('should test float', async () => {
      const results = await sendCommands(chinookConnection, 'TEST FLOAT')
      expect(results).toBe(3.1415926)
    })

    test('should test string', async () => {
      const results = await sendCommands(chinookConnection, 'TEST STRING')
      expect(results).toBe('Hello World, this is a test string.')
    })

    test('should test zero string', async () => {
      const results = await sendCommands(chinookConnection, 'TEST ZERO_STRING')
      expect(results).toBe('Hello World, this is a zero-terminated test string.')
    })

    test('should test string0', async () => {
      const results = await sendCommands(chinookConnection, 'TEST STRING0')
      expect(results).toBe('')
    })

    test('should test command', async () => {
      const results = await sendCommands(chinookConnection, 'TEST COMMAND')
      expect(results).toBe('PING')
    })

    test('should test json', async () => {
      const results = await sendCommands(chinookConnection, 'TEST JSON')
      expect(results).toEqual({
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

    test('should test blob', async () => {
      const results = await sendCommands(chinookConnection, 'TEST BLOB')
      expect(typeof results).toBe('object')
      expect(results).toBeInstanceOf(Buffer)
      const bufferrowset = results as Buffer
      expect(bufferrowset.length).toBe(1000)
    })

    test('should test blob0', async () => {
      const results = await sendCommands(chinookConnection, 'TEST BLOB0')
      expect(typeof results).toBe('object')
      expect(results).toBeInstanceOf(Buffer)
      const bufferrowset = results as Buffer
      expect(bufferrowset.length).toBe(0)
    })

    test('should test error', async done => {
      chinookConnection.sendCommands('TEST ERROR', (error, results) => {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)

        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('This is a test error message with a devil error code.')
        expect(sqliteCloudError.errorCode).toBe('66666')
        expect(sqliteCloudError.externalErrorCode).toBe('0')
        expect(sqliteCloudError.offsetCode).toBe(-1)

        done()
      })
    })

    test('should test exterror', async done => {
      chinookConnection.sendCommands('TEST EXTERROR', (error, results) => {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)

        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('This is a test error message with an extcode and a devil error code.')
        expect(sqliteCloudError.errorCode).toBe('66666')
        expect(sqliteCloudError.externalErrorCode).toBe('333')
        expect(sqliteCloudError.offsetCode).toBe(-1)

        done()
      })
    })

    test('should test array', async () => {
      const results = await sendCommands(chinookConnection, 'TEST ARRAY')
      expect(Array.isArray(results)).toBe(true)
      const arrayrowset = results as Array<any>
      expect(arrayrowset.length).toBe(5)
      expect(arrayrowset[0]).toBe('Hello World')
      expect(arrayrowset[1]).toBe(123456)
      expect(arrayrowset[2]).toBe(3.1415)
      expect(arrayrowset[3]).toBeNull()
    })

    test('should test rowset', async () => {
      const results = await sendCommands(chinookConnection, 'TEST ROWSET')
      expect(results.numberOfRows).toBe(41)
      expect(results.numberOfColumns).toBe(2)
      expect(results.version == 1 || results.version == 2).toBeTruthy()
      expect(results.columnsNames).toEqual(['key', 'value'])
    })

    test('should test chunked rowset', async () => {
      const results = await sendCommands(chinookConnection, 'TEST ROWSET_CHUNK')
      expect(results.numberOfRows).toBe(147)
      expect(results.numberOfColumns).toBe(1)
      expect(results.columnsNames).toEqual(['key'])

      expect(results[0]['key']).toBe('REINDEX')
      expect(results[1]['key']).toBe('INDEXED')
      expect(results[2]['key']).toBe('INDEX')
      expect(results[3]['key']).toBe('DESC')
    })
  })

  // various select statements
  describe('select', () => {
    test('can run simple select', async done => {
      const connection = new SQLiteCloudBunConnection(CHINOOK_DATABASE_URL, error => {
        if (error) {
          done(error)
        }
        connection.sendCommands("SELECT 2 'COLONNA'", (error, result) => {
          if (!error) {
            expect(result).toEqual([{ COLONNA: 2 }])
          }
          done(error)
        })
      })
    })

    test('can list tables', async done => {
      const connection = await getConnection()
      const results = await sendCommands(connection, 'LIST TABLES')
      expect(results.numberOfColumns).toBe(6)
      expect(results.numberOfRows).toBe(11)
      done()
    })

    test('can repeat commands', async () => {
      const connection = await getConnection()
      for (let i = 0; i < 50; i++) {
        const results = await sendCommands(connection, `SELECT ${i} 'COLONNA'`)
        expect(results.numberOfColumns).toBe(1)
        expect(results.numberOfRows).toBe(1)
        expect(results).toEqual([{ COLONNA: i }])
      }
      connection.close()
    })

    test('can send long commands', async () => {
      const connection = await getConnection()

      let sql = ''
      for (var i = 0; i < 250; i++) {
        sql += `SELECT ${i} AS counter; `
      }

      // receives only one result for last statement
      const results = await sendCommands(connection, sql)
      expect(results.numberOfColumns).toBe(1)
      expect(results.numberOfRows).toBe(1)
      expect(results).toEqual([{ counter: i - 1 }])
      connection.close()
    })
  })
})
