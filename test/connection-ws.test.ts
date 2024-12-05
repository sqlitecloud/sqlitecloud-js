/**
 * connection-ws.test.ts - test connection via socket.io based gateway
 */

import { SQLiteCloudError } from '../src/index'
import { SQLiteCloudConnection } from '../src/drivers/connection'
import { SQLiteCloudWebsocketConnection } from '../src/drivers/connection-ws'
import {
  //
  CHINOOK_DATABASE_URL,
  LONG_TIMEOUT,
  getChinookConfig,
  getChinookWebsocketConnection,
  WARN_SPEED_MS,
  EXPECT_SPEED_MS
} from './shared'
import { SQLiteCloudCommand } from '../src/drivers/types'

describe('connection-ws', () => {
  let chinook: SQLiteCloudConnection

  beforeEach(() => {
    chinook = getChinookWebsocketConnection()
  })

  afterEach(() => {
    chinook?.close()
    // @ts-ignore
    chinook = undefined
  })

  describe('connect', () => {
    it('should connect', () => {
      // ...in beforeEach
    })

    it('should connect with config object string', done => {
      const configObj = getChinookConfig()
      configObj.usewebsocket = true
      let connection: SQLiteCloudWebsocketConnection | null = null
      connection = new SQLiteCloudWebsocketConnection(configObj, error => {
        expect(error).toBeNull()
        done()
      })
      connection?.close()
    })

    it('should not connect with incorrect credentials', done => {
      const configObj = getChinookConfig()
      configObj.connectionstring?.replace(configObj.password as string, 'wrongpassword')
      configObj.password = 'wrongpassword'
      configObj.usewebsocket = true

      // should attempt connection and return error
      const connection = new SQLiteCloudWebsocketConnection(configObj, error => {
        expect(error).toBeDefined()
        done()
      })
      connection?.close()
    })
    /* TODO RESTORE TEST
    it('should connect with connection string', done => {
      if (CHINOOK_DATABASE_URL.indexOf('localhost') > 0) {
        // skip this test when running locally since it requires a self-signed certificate
        done()
      }

      let conn: SQLiteCloudWebsocketConnection | null = null
      conn = new SQLiteCloudWebsocketConnection(CHINOOK_DATABASE_URL, error => {
        expect(error).toBeNull()
        // @ts-ignore
        this.sendCommands('TEST STRING', (error, results) => {
          expect(error).toBeNull()
          conn?.close()
          expect(conn?.connected).toBe(false)
          done()
        })
      })
      expect(conn).toBeDefined()
    })
  })
*/
    describe('send test commands', () => {
      it('should test integer', done => {
        chinook.sendCommands('TEST INTEGER', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBe(123456)
          done()
        })
      })

      it('should test null', done => {
        chinook.sendCommands('TEST NULL', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBeNull()
          done()
        })
      })

      it('should test float', done => {
        chinook.sendCommands('TEST FLOAT', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBe(3.1415926)
          done()
        })
      })

      it('should test string', done => {
        chinook.sendCommands('TEST STRING', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBe('Hello World, this is a test string.')
          done()
        })
      })

      it('should test zero string', done => {
        chinook.sendCommands('TEST ZERO_STRING', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBe('Hello World, this is a zero-terminated test string.')
          done()
        })
      })

      it('should test string0', done => {
        chinook.sendCommands('TEST STRING0', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBe('')
          done()
        })
      })

      it('should test command', done => {
        chinook.sendCommands('TEST COMMAND', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBe('PING')
          done()
        })
      })

      it('should test json', done => {
        chinook.sendCommands('TEST JSON', (error, results) => {
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
        chinook.sendCommands('TEST BLOB', (error, results) => {
          expect(error).toBeNull()
          expect(typeof results).toBe('object')
          expect(results).toBeInstanceOf(Buffer)
          const bufferrowset = results as any as Buffer
          expect(bufferrowset.length).toBe(1000)
          done()
        })
      })

      it('should test blob0', done => {
        chinook.sendCommands('TEST BLOB0', (error, results) => {
          expect(error).toBeNull()
          expect(typeof results).toBe('object')
          expect(results).toBeInstanceOf(Buffer)
          const bufferrowset = results as any as Buffer
          expect(bufferrowset.length).toBe(0)
          done()
        })
      })

      it('should test error', done => {
        chinook.sendCommands('TEST ERROR', (error, results) => {
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
        chinook.sendCommands('TEST EXTERROR', (error, results) => {
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
        chinook.sendCommands('TEST ARRAY', (error, results) => {
          expect(error).toBeNull()
          expect(Array.isArray(results)).toBe(true)

          const arrayrowset = results as any as Array<any>
          expect(arrayrowset.length).toBe(5)
          expect(arrayrowset[0].Result).toBe('Hello World')
          expect(arrayrowset[1].Result).toBe(123456)
          expect(arrayrowset[2].Result).toBe(3.1415)
          expect(arrayrowset[3].Result).toBeNull()
          done()
        })
      })

      it('should test rowset', done => {
        chinook.sendCommands('TEST ROWSET', (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfRows).toBeGreaterThan(20)
          expect(results.numberOfColumns).toBe(2)
          expect(results.version == 1 || results.version == 2).toBeTruthy()
          expect(results.columnsNames).toEqual(['key', 'value'])
          done()
        })
      })

      it(
        'should test chunked rowset',
        done => {
          // this operation sends 150 packets, so we need to increase the timeout
          const database = getChinookWebsocketConnection(undefined, { timeout: 60 * 1000 })
          database.sendCommands('TEST ROWSET_CHUNK', (error, results) => {
            expect(error).toBeNull()
            expect(results.numberOfRows).toBe(147)
            expect(results.numberOfColumns).toBe(1)
            expect(results.columnsNames).toEqual(['key'])

            database.close()
            done()
          })
        },
        LONG_TIMEOUT
      )
    })

    describe('operations', () => {
      it(
        'should serialize operations',
        done => {
          const numQueries = 20
          let completed = 0

          for (let i = 0; i < numQueries; i++) {
            chinook.sendCommands(`select ${i} as "count", 'hello' as 'string'`, (error, results) => {
              expect(error).toBeNull()
              expect(results.numberOfColumns).toBe(2)
              expect(results.numberOfRows).toBe(1)
              expect(results.version == 1 || results.version == 2).toBeTruthy()
              expect(results.columnsNames).toEqual(['count', 'string'])
              expect(results.getItem(0, 0)).toBe(i)

              if (++completed >= numQueries) {
                done()
              }
            })
          }
        },
        LONG_TIMEOUT
      )
      /* TODO RESTORE TEST
    it('should apply short timeout', done => {
      // apply shorter timeout
      const configObj = parseconnectionstring(CHINOOK_DATABASE_URL + '?timeout=20')
      configObj.websocketOptions = { useWebsocket: true }
      const database = new SQLiteCloudConnection(configObj, error => {
        if (error) {
          expect(error).toBeInstanceOf(SQLiteCloudError)
          expect((error as any).message).toBe('Request timed out')
          done()
          database.close()
        } else {
          // this operation sends 150 packets and cannot complete in 20ms
          database.sendCommands('TEST ROWSET_CHUNK', (error, results) => {
            expect(error).toBeInstanceOf(SQLiteCloudError)
            expect((error as any).message).toBe('Request timed out')
            done()
            database.close()
          })
        }
      })
    })
*/
    })

    describe('send select commands', () => {
      it('should LIST METADATA', done => {
        chinook.sendCommands('LIST METADATA;', (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfColumns).toBe(8)
          expect(results.numberOfRows).toBeGreaterThanOrEqual(32)
          done()
        })
      })

      it('should select results with no colum names', done => {
        chinook.sendCommands("select 42, 'hello'", (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfColumns).toBe(2)
          expect(results.numberOfRows).toBe(1)
          expect(results.version == 1 || results.version == 2).toBeTruthy()
          expect(results.columnsNames).toEqual(['42', "'hello'"]) // column name should be hello, not 'hello'
          expect(results.getItem(0, 0)).toBe(42)
          expect(results.getItem(0, 1)).toBe('hello')

          done()
        })
      })

      it('should select long formatted string', done => {
        chinook.sendCommands("USE DATABASE :memory:; select printf('%.*c', 1000, 'x') AS DDD", (error, results) => {
          expect(error).toBeNull()
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
        chinook.sendCommands('USE DATABASE chinook.sqlite;', (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfColumns).toBeUndefined()
          expect(results.numberOfRows).toBeUndefined()
          expect(results.version).toBeUndefined()
          done()
        })
      })

      it('should select * from tracks limit 10 (no chunks)', done => {
        chinook.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfColumns).toBe(9)
          expect(results.numberOfRows).toBe(10)
          done()
        })
      })

      it('should select * from tracks (with chunks)', done => {
        chinook.sendCommands('SELECT * FROM tracks;', (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfColumns).toBe(9)
          expect(results.numberOfRows).toBeGreaterThan(3000) // 3503 tracks but we sometimes test deleting rows
          done()
        })
      })

      it('should select * from albums', done => {
        chinook.sendCommands('SELECT * FROM albums;', (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfColumns).toBe(3)
          expect(results.numberOfRows).toBe(347)
          expect(results.version == 1 || results.version == 2).toBeTruthy()
          done()
        })
      })

      it('should select without bindings', done => {
        const command = { query: 'SELECT * FROM albums' } as SQLiteCloudCommand
        chinook.sendCommands(command, (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfColumns).toBeGreaterThan(0)
          done()
        })
      })

      it('should select with bindings', done => {
        const command: SQLiteCloudCommand = { query: 'SELECT * FROM albums WHERE albumId = ?', parameters: [1] }
        chinook.sendCommands(command, (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfColumns).toBe(3)
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
            chinook.sendCommands('TEST STRING', (error, results) => {
              expect(error).toBeNull()
              expect(results).toBe('Hello World, this is a test string.')
              if (++completed >= numQueries) {
                const queryMs = (Date.now() - startTime) / numQueries
                if (queryMs > WARN_SPEED_MS) {
                  console.log(`${numQueries}x test string, ${queryMs.toFixed(0)}ms per query`)
                  expect(queryMs).toBeLessThan(EXPECT_SPEED_MS)
                }
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
            chinook.sendCommands('SELECT * FROM albums ORDER BY RANDOM() LIMIT 4;', (error, results) => {
              expect(error).toBeNull()
              expect(results.numberOfColumns).toBe(3)
              expect(results.numberOfRows).toBe(4)
              if (++completed >= numQueries) {
                const queryMs = (Date.now() - startTime) / numQueries
                if (queryMs > WARN_SPEED_MS) {
                  console.log(`${numQueries}x individual selects, ${queryMs.toFixed(0)}ms per query`)
                  expect(queryMs).toBeLessThan(EXPECT_SPEED_MS)
                }
                done()
              }
            })
          }
        },
        LONG_TIMEOUT
      )

      it(
        '10x batched selects',
        done => {
          const numQueries = 10
          let completed = 0
          const startTime = Date.now()
          for (let i = 0; i < numQueries; i++) {
            chinook.sendCommands(
              'SELECT * FROM albums ORDER BY RANDOM() LIMIT 16; SELECT * FROM albums ORDER BY RANDOM() LIMIT 12; SELECT * FROM albums ORDER BY RANDOM() LIMIT 8; SELECT * FROM albums ORDER BY RANDOM() LIMIT 4;',
              (error, results) => {
                expect(error).toBeNull()
                // server only returns the last rowset?
                expect(results.numberOfColumns).toBe(3)
                expect(results.numberOfRows).toBe(4)
                if (++completed >= numQueries) {
                  const queryMs = (Date.now() - startTime) / numQueries
                  if (queryMs > WARN_SPEED_MS) {
                    console.log(`${numQueries}x batched selects, ${queryMs.toFixed(0)}ms per query`)
                    expect(queryMs).toBeLessThan(EXPECT_SPEED_MS)
                  }
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
})
