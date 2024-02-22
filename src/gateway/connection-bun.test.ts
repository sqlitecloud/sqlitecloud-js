//
// gateway.test.ts - bun tests for
//

// MUST RUN USING BUN TEST RUNNER, EG:
// bun test connection-bun.test.ts --watch

// running a specific test:
// bun test "connection-bun.test.ts" -t "should insert metadata" --watch

// run single many times:
// bun test "connection-bun.test.ts" -t "should insert metadata" --watch --rerun-each 50

import { SQLiteCloudError } from '../drivers/types'
import { SQLiteCloudBunConnection } from './connection-bun'
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'

const CHINOOK_DATABASE_URL = process.env['CHINOOK_DATABASE_URL'] as string
console.assert(CHINOOK_DATABASE_URL, 'CHINOOK_DATABASE_URL is required')

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

async function testCommands(command: string): Promise<any> {
  const connection = await getConnection()
  return new Promise((resolve, reject) => {
    connection.sendCommands(command, (error, result) => {
      connection.close()
      if (error) {
        reject(error)
      }
      resolve(result)
    })
  })
}

describe('SQLiteCloudBunConnection', () => {
  test('should connect using bun socket', done => {
    new SQLiteCloudBunConnection(CHINOOK_DATABASE_URL, error => {
      if (error) {
        console.error('Error connecting to database', error)
      }
      done(error)
    })
  })

  test('should test null', async () => {
    const results = await testCommands('TEST NULL')
    expect(results).toBeNull()
  })

  test('should insert metadata without waiting', async done => {
    const database = `pollo_${Bun.hash(Math.random().toString())}.sqlite`
    const connection = await getConnection()
    connection.sendCommands(`CREATE DATABASE ${database}; USE DATABASE ${database};`)
    connection.sendCommands('CREATE TABLE pollo (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, lastName TEXT);')
    connection.sendCommands("INSERT INTO pollo VALUES (1, 'Cluck', 'Norris')", (error, results) => {
      expect(error).toBeNull()
      expect(Array.isArray(results)).toBeTrue()
      expect(results).toHaveLength(6)
      expect(results[0]).toBe(10)

      connection.sendCommands(`UNUSE DATABASE; REMOVE DATABASE ${database} IF EXISTS;`, () => {
        done(error)
        connection.close()
      })
    })
  })

  test('should insert metadata waiting for each statement', async done => {
    const database = `pollo_${Bun.hash(Math.random().toString())}.sqlite`
    const connection = await getConnection()
    connection.sendCommands(`CREATE DATABASE ${database}; USE DATABASE ${database};`, (error, result) => {
      connection.sendCommands('CREATE TABLE pollo (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, lastName TEXT);', (error, result) => {
        connection.sendCommands("INSERT INTO pollo VALUES (1, 'Cluck', 'Norris')", (error, results) => {
          expect(error).toBeNull()
          expect(Array.isArray(results)).toBeTrue()
          expect(results).toHaveLength(6)
          expect(results[0]).toBe(10)

          connection.sendCommands(`UNUSE DATABASE; REMOVE DATABASE ${database} IF EXISTS;`, () => {
            done(error)
            connection.close()
          })
        })
      })
    })
  })

  test('should test integer', async () => {
    const results = await testCommands('TEST INTEGER')
    expect(results).toBe(123456)
  })

  test('should test float', async () => {
    const results = await testCommands('TEST FLOAT')
    expect(results).toBe(3.1415926)
  })

  test('should test string', async () => {
    const results = await testCommands('TEST STRING')
    expect(results).toBe('Hello World, this is a test string.')
  })

  test('should test zero string', async () => {
    const results = await testCommands('TEST ZERO_STRING')
    expect(results).toBe('Hello World, this is a zero-terminated test string.')
  })

  test('should test string0', async () => {
    const results = await testCommands('TEST STRING0')
    expect(results).toBe('')
  })

  test('should test command', async () => {
    const results = await testCommands('TEST COMMAND')
    expect(results).toBe('PING')
  })

  test('should test json', async () => {
    const results = await testCommands('TEST JSON')
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

  test('should test blob', async done => {
    const results = await testCommands('TEST BLOB')
    expect(typeof results).toBe('object')
    expect(results).toBeInstanceOf(Buffer)
    const bufferrowset = results as Buffer
    expect(bufferrowset.length).toBe(1000)
    done()
  })

  test('should test blob0', async done => {
    const results = await testCommands('TEST BLOB0')
    expect(typeof results).toBe('object')
    expect(results).toBeInstanceOf(Buffer)
    const bufferrowset = results as Buffer
    expect(bufferrowset.length).toBe(0)
    done()
  })

  test('should test error', async done => {
    const connection = await getConnection()
    connection.sendCommands('TEST ERROR', (error, results) => {
      expect(error).toBeDefined()
      expect(error).toBeInstanceOf(SQLiteCloudError)
      expect(results).toBeNull()

      const sqliteCloudError = error as SQLiteCloudError
      expect(sqliteCloudError.message).toBe('This is a test error message with a devil error code.')
      expect(sqliteCloudError.errorCode).toBe('66666')
      expect(sqliteCloudError.externalErrorCode).toBe('0')
      expect(sqliteCloudError.offsetCode).toBe(-1)

      done()
      connection.close()
    })
  })

  test('should test exterror', async done => {
    const connection = await getConnection()
    connection.sendCommands('TEST EXTERROR', (error, results) => {
      expect(error).toBeDefined()
      expect(error).toBeInstanceOf(SQLiteCloudError)
      expect(results).toBeNull()

      const sqliteCloudError = error as SQLiteCloudError
      expect(sqliteCloudError.message).toBe('This is a test error message with an extcode and a devil error code.')
      expect(sqliteCloudError.errorCode).toBe('66666')
      expect(sqliteCloudError.externalErrorCode).toBe('333')
      expect(sqliteCloudError.offsetCode).toBe(-1)

      done()
      connection.close()
    })
  })

  test('should test array', async () => {
    const results = await testCommands('TEST ARRAY')
    expect(Array.isArray(results)).toBe(true)
    const arrayrowset = results as Array<any>
    expect(arrayrowset.length).toBe(5)
    expect(arrayrowset[0]).toBe('Hello World')
    expect(arrayrowset[1]).toBe(123456)
    expect(arrayrowset[2]).toBe(3.1415)
    expect(arrayrowset[3]).toBeNull()
  })

  test('should test rowset', async done => {
    const results = await testCommands('TEST ROWSET')
    expect(results.numberOfRows).toBeGreaterThanOrEqual(30)
    expect(results.numberOfColumns).toBe(2)
    expect(results.version == 1 || results.version == 2).toBeTruthy()
    expect(results.columnsNames).toEqual(['key', 'value'])
    done()
  })

  test('should test chunked rowset', async done => {
    const results = await testCommands('TEST ROWSET_CHUNK')
    expect(results.numberOfRows).toBe(147)
    expect(results.numberOfColumns).toBe(1)
    expect(results.columnsNames).toEqual(['key'])

    expect(results[0]['key']).toBe('REINDEX')
    expect(results[1]['key']).toBe('INDEXED')
    expect(results[2]['key']).toBe('INDEX')
    expect(results[3]['key']).toBe('DESC')

    done()
  })

  test('can run simple select', done => {
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

  test('can repeat commands', async done => {
    const connection = await getConnection()
    for (let i = 0; i < 50; i++) {
      const results = await sendCommands(connection, `SELECT ${i} 'COLONNA'`)
      expect(results.numberOfColumns).toBe(1)
      expect(results.numberOfRows).toBe(1)
      expect(results).toEqual([{ COLONNA: i }])
    }
    connection.close()
    done()
  })

  test('can send long commands', async done => {
    const connection = await getConnection()

    let sql = ''
    let i = 0
    for (; i < 250; i++) {
      sql += `SELECT ${i} AS counter; `
    }

    // receives only one result for last statement
    const results = await sendCommands(connection, sql)
    expect(results.numberOfColumns).toBe(1)
    expect(results.numberOfRows).toBe(1)
    expect(results).toEqual([{ counter: i - 1 }])

    done()
  })
})
