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

import { join } from 'path'
export const CHINOOK_DATABASE_FILE = join(__dirname, 'assets/chinook.db')

export const LONG_TIMEOUT = 100 * 1000 // 100 seconds

export function getChinoookConfig(): SQLiteCloudConfig {
  return parseConnectionString(CHINOOK_DATABASE_URL)
}
export function getTestingConfig(): SQLiteCloudConfig {
  return parseConnectionString(TESTING_DATABASE_URL)
}

export const CHINOOK_FIRST_TRACK = {
  AlbumId: 1,
  Bytes: 11170334,
  Composer: 'Angus Young, Malcolm Young, Brian Johnson',
  GenreId: 1,
  MediaTypeId: 1,
  Milliseconds: 343719,
  Name: 'For Those About To Rock (We Salute You)',
  TrackId: 1,
  UnitPrice: 0.99
}

describe('connection', () => {
  let connection: SQLiteCloudConnection

  beforeEach(done => {
    expect(CHINOOK_DATABASE_URL).toBeDefined()
    expect(TESTING_DATABASE_URL).toBeDefined()

    if (!connection) {
      try {
        connection = new SQLiteCloudConnection(CHINOOK_DATABASE_URL + '?nonlinearizable=1', error => {
          expect(connection).toBeDefined()
          done()
        })
        connection.verbose()
      } catch (error) {
        console.error(error)
        throw error
      }
    }
  })

  afterEach(() => {
    if (connection) {
      connection.close()
    }
    // @ts-ignore
    connection = undefined
  })

  describe('connect', () => {
    it('should connect', () => {
      // ...in beforeEach
    })

    it('should connect with config object string', done => {
      const configObj = parseConnectionString(CHINOOK_DATABASE_URL)
      const conn = new SQLiteCloudConnection(configObj)
      expect(conn).toBeDefined()

      conn.connect(error => {
        expect(error).toBeNull()
        expect(conn.connected).toBe(true)

        connection.sendCommands('TEST STRING', (error, results) => {
          conn.close()
          expect(conn.connected).toBe(false)
          done()
        })
      })
    })

    it('should connect with connection string', done => {
      const conn = new SQLiteCloudConnection(CHINOOK_DATABASE_URL)
      expect(conn).toBeDefined()

      conn.connect(error => {
        expect(error).toBeNull()
        expect(conn.connected).toBe(true)

        connection.sendCommands('TEST STRING', (error, results) => {
          conn.close()
          expect(conn.connected).toBe(false)
          done()
        })
      })
    })

    it('should throw when connection string lacks credentials', done => {
      // use valid connection string but without credentials
      const testingConfig = getTestingConfig()
      delete testingConfig.username
      delete testingConfig.password

      try {
        const conn = new SQLiteCloudConnection(testingConfig)
      } catch (error) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)
        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('The user, password and host arguments must be specified.')
        expect(sqliteCloudError.errorCode).toBe('ERR_MISSING_ARGS')
        expect(sqliteCloudError.externalErrorCode).toBeUndefined()
        expect(sqliteCloudError.offsetCode).toBeUndefined()

        done()
      }
    })
  })

  describe('send test commands', () => {
    it('should test integer', done => {
      connection.sendCommands('TEST INTEGER', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe(123456)
        done()
      })
    })

    it('should test null', done => {
      connection.sendCommands('TEST NULL', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBeNull()
        done()
      })
    })

    it('should test float', done => {
      connection.sendCommands('TEST FLOAT', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe(3.1415926)
        done()
      })
    })

    it('should test string', done => {
      connection.sendCommands('TEST STRING', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe('Hello World, this is a test string.')
        done()
      })
    })

    it('should test zero string', done => {
      connection.sendCommands('TEST ZERO_STRING', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe('Hello World, this is a zero-terminated test string.')
        done()
      })
    })

    it('should test string0', done => {
      connection.sendCommands('TEST STRING0', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe('')
        done()
      })
    })

    it('should test command', done => {
      connection.sendCommands('TEST COMMAND', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe('PING')
        done()
      })
    })

    it('should test json', done => {
      connection.sendCommands('TEST JSON', (error, results) => {
        expect(error).toBeNull()
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
        done()
      })
    })

    it('should test blob', done => {
      connection.sendCommands('TEST BLOB', (error, results) => {
        expect(error).toBeNull()
        expect(typeof results).toBe('object')
        expect(results).toBeInstanceOf(Buffer)
        const bufferrowset = results as any as Buffer
        expect(bufferrowset.length).toBe(1000)
        done()
      })
    })

    it('should test blob0', done => {
      connection.sendCommands('TEST BLOB0', (error, results) => {
        expect(error).toBeNull()
        expect(typeof results).toBe('object')
        expect(results).toBeInstanceOf(Buffer)
        const bufferrowset = results as any as Buffer
        expect(bufferrowset.length).toBe(0)
        done()
      })
    })

    it('should test error', done => {
      connection.sendCommands('TEST ERROR', (error, results) => {
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

    it('should test exterror', done => {
      connection.sendCommands('TEST EXTERROR', (error, results) => {
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

    it('should test array', done => {
      connection.sendCommands('TEST ARRAY', (error, results) => {
        expect(error).toBeNull()
        expect(Array.isArray(results)).toBe(true)

        const arrayrowset = results as any as Array<any>
        expect(arrayrowset.length).toBe(5)
        expect(arrayrowset[0]).toBe('Hello World')
        expect(arrayrowset[1]).toBe(123456)
        expect(arrayrowset[2]).toBe(3.1415)
        expect(arrayrowset[3]).toBeNull()
        done()
      })
    })

    it('should test rowset', done => {
      connection.sendCommands('TEST ROWSET', (error, results) => {
        expect(results.numberOfRows).toBe(41)
        expect(results.numberOfColumns).toBe(2)
        expect(results.version == 1 || results.version == 2).toBeTruthy()
        expect(results.columnsNames).toEqual(['key', 'value'])
        done()
      })
    })

    it(
      'should test chunked rowset',
      done => {
        connection.sendCommands('TEST ROWSET_CHUNK', (error, results) => {
          expect(results.numberOfRows).toBe(147)
          expect(results.numberOfColumns).toBe(1)
          expect(results.columnsNames).toEqual(['key'])
          done()
        })
      },
      30 * 1000 // long timeout
    )
  })

  describe('send select commands', () => {
    it('should select long formatted string', done => {
      connection.sendCommands("USE DATABASE :memory:; select printf('%.*c', 1000, 'x') AS DDD", (error, results) => {
        expect(results.numberOfColumns).toBe(1)
        expect(results.numberOfRows).toBe(1)
        expect(results.version == 1 || results.version == 2).toBeTruthy()

        const stringrowset = results.getItem(0, 0) as string
        expect(stringrowset.startsWith('xxxxxxxxxxxxx')).toBeTruthy()
        expect(stringrowset).toHaveLength(1000)

        done()
      })
    })

    it('should select database', done => {
      connection.sendCommands('USE DATABASE chinook.db;', (error, results) => {
        expect(results.numberOfColumns).toBeUndefined()
        expect(results.numberOfRows).toBeUndefined()
        expect(results.version).toBeUndefined()
        done()
      })
    })

    it('should select * from tracks limit 10 (no chunks)', done => {
      connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, results) => {
        expect(results.numberOfColumns).toBe(9)
        expect(results.numberOfRows).toBe(10)
        done()
      })
    })

    it('should select * from tracks (with chunks)', done => {
      connection.sendCommands('SELECT * FROM tracks;', (error, results) => {
        expect(results.numberOfColumns).toBe(9)
        expect(results.numberOfRows).toBe(3503)
        done()
      })
    })

    it('should select * from albums', done => {
      connection.sendCommands('SELECT * FROM albums;', (error, results) => {
        expect(results.numberOfColumns).toBe(3)
        expect(results.numberOfRows).toBe(347)
        expect(results.version == 1 || results.version == 2).toBeTruthy()
        done()
      })
    })
  })

  describe('connection stress testing', () => {
    it(
      '20x test string',
      done => {
        const numQueries = 20
        let completed = 0
        const startTime = Date.now()
        for (let i = 0; i < numQueries; i++) {
          connection.sendCommands('TEST STRING', (error, results) => {
            expect(results).toBe('Hello World, this is a test string.')
            if (++completed >= numQueries) {
              const queryMs = (Date.now() - startTime) / numQueries
              console.log(`${numQueries}x test string, ${queryMs.toFixed(0)}ms per query`)
              expect(queryMs).toBeLessThan(2000)
              done()
            }
          })
        }
      },
      LONG_TIMEOUT
    )

    it(
      '20x individual selects',
      done => {
        const numQueries = 20
        let completed = 0
        const startTime = Date.now()
        for (let i = 0; i < numQueries; i++) {
          connection.sendCommands('SELECT * FROM albums ORDER BY RANDOM() LIMIT 4;', (error, results) => {
            expect(error).toBeNull()
            expect(results.numberOfColumns).toBe(3)
            expect(results.numberOfRows).toBe(4)
            if (++completed >= numQueries) {
              const queryMs = (Date.now() - startTime) / numQueries
              console.log(`${numQueries}x individual selects, ${queryMs.toFixed(0)}ms per query`)
              expect(queryMs).toBeLessThan(2000)
              done()
            }
          })
        }
      },
      LONG_TIMEOUT
    )

    it(
      '20x batched selects',
      done => {
        const numQueries = 20
        let completed = 0
        const startTime = Date.now()
        for (let i = 0; i < numQueries; i++) {
          connection.sendCommands(
            'SELECT * FROM albums ORDER BY RANDOM() LIMIT 16; SELECT * FROM albums ORDER BY RANDOM() LIMIT 12; SELECT * FROM albums ORDER BY RANDOM() LIMIT 8; SELECT * FROM albums ORDER BY RANDOM() LIMIT 4;',
            (error, results) => {
              // server only returns the last rowset?
              expect(results.numberOfColumns).toBe(3)
              expect(results.numberOfRows).toBe(4)
              if (++completed >= numQueries) {
                const queryMs = (Date.now() - startTime) / numQueries
                console.log(`${numQueries}x batched selects, ${queryMs.toFixed(0)}ms per query`)
                expect(queryMs).toBeLessThan(2000)
                done()
              }
            }
          )
        }
      },
      LONG_TIMEOUT
    )
  })
})
