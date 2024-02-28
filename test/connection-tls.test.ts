/**
 * connection-tls.test.ts - test low level communication protocol with tls sockets and raw commands
 */

import { SQLiteCloudError, SQLiteCloudRowset } from '../src/index'
import { SQLiteCloudConnection } from '../src/drivers/connection'
import { SQLiteCloudTlsConnection } from '../src/drivers/connection-tls'
import { anonimizeCommand } from '../src/drivers/utilities'
import {
  CHINOOK_DATABASE_URL,
  INSECURE_DATABASE_URL,
  LONG_TIMEOUT,
  getTestingConfig,
  getChinookConfig,
  getChinookTlsConnection,
  sendCommandsAsync,
  // clearTestingDatabasesAsync,
  WARN_SPEED_MS,
  EXPECT_SPEED_MS,
  EXTRA_LONG_TIMEOUT
} from './shared'

import fs from 'fs'

function getConnection() {
  return new SQLiteCloudTlsConnection({ connectionString: CHINOOK_DATABASE_URL }, error => {
    if (error) {
      console.error(`getChinookTlsConnection - returned error: ${error}`)
    }
    expect(error).toBeNull()
  })
}

describe('connection-tls', () => {
  describe('connect', () => {
    it('should connect', () => {
      // ...in beforeEach
    })
    /*
    it(
      'should drop all old testing databases',
      async () => {
        await clearTestingDatabasesAsync()
      },
      LONG_TIMEOUT
    )
*/
    it('should add self signed certificate for localhost connections', () => {
      const localConfig = getChinookConfig('sqlitecloud://admin:xxx@localhost:8850/chinook.sqlite')
      expect(localConfig.host).toBe('localhost')
      expect(localConfig.tlsOptions?.ca).toBeTruthy()

      const remoteConfig = getChinookConfig('sqlitecloud://admin:xxx@sqlitecloud.io:8850/chinook.sqlite')
      expect(remoteConfig.host).toBe('sqlitecloud.io')
      expect(remoteConfig.tlsOptions).toBeFalsy()
    })

    it(
      'should connect with config object string',
      done => {
        const configObj = getChinookConfig()
        const connection = new SQLiteCloudTlsConnection(configObj, error => {
          expect(error).toBeNull()
          expect(connection.connected).toBe(true)

          connection.sendCommands('TEST STRING', (error, results) => {
            connection.close()
            expect(connection.connected).toBe(false)
            done()
          })
        })
        expect(connection).toBeDefined()
      },
      LONG_TIMEOUT
    )

    it('should connect with connection string', done => {
      if (CHINOOK_DATABASE_URL.indexOf('localhost') > 0) {
        // skip this test when running locally since it requires a self-signed certificate
        done()
      }

      const connection = new SQLiteCloudTlsConnection(CHINOOK_DATABASE_URL, error => {
        expect(error).toBeNull()
        expect(connection.connected).toBe(true)

        const chinook = getConnection()
        chinook.sendCommands('TEST STRING', (error, results) => {
          expect(results).toBe('Hello World, this is a test string.')

          done()
          connection.close()
        })
      })
      expect(connection).toBeDefined()
    })

    it('should connect with insecure connection string', done => {
      if (!INSECURE_DATABASE_URL) {
        done()
      } else {
        expect(INSECURE_DATABASE_URL).toBeDefined()
        const conn = new SQLiteCloudTlsConnection(INSECURE_DATABASE_URL, error => {
          expect(error).toBeNull()
          expect(conn.connected).toBe(true)

          const chinook = getConnection()
          chinook.sendCommands('TEST STRING', (error, results) => {
            conn.close()
            expect(conn.connected).toBe(false)
            done()
          })
        })
        expect(conn).toBeDefined()
      }
    })

    it('should throw when connection string lacks credentials', done => {
      // use valid connection string but without credentials
      const testingConfig = getTestingConfig()
      delete testingConfig.username
      delete testingConfig.password

      try {
        const conn = new SQLiteCloudTlsConnection(testingConfig)
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
    it(
      'should test integer',
      done => {
        const chinook = getConnection()
        chinook.sendCommands('TEST INTEGER', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBe(123456)

          done()
          chinook.close()
        })
      },
      LONG_TIMEOUT
    )

    it('should test null', done => {
      const connection = getConnection()
      connection.sendCommands('TEST NULL', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBeNull()

        done()
        connection.close()
      })
    })

    it('should test float', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST FLOAT', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe(3.1415926)

        done()
        chinook.close()
      })
    })

    it(
      'should test string',
      done => {
        const chinook = getConnection()
        chinook.sendCommands('TEST STRING', (error, results) => {
          expect(error).toBeNull()
          expect(results).toBe('Hello World, this is a test string.')

          done()
          chinook.close()
        })
      },
      EXTRA_LONG_TIMEOUT
    )

    it('should test zero string', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST ZERO_STRING', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe('Hello World, this is a zero-terminated test string.')

        done()
        chinook.close()
      })
    })

    it('should test string0', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST STRING0', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe('')

        done()
        chinook.close()
      })
    })

    it('should test command', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST COMMAND', (error, results) => {
        expect(error).toBeNull()
        expect(results).toBe('PING')

        done()
        chinook.close()
      })
    })

    it('should test json', done => {
      const chinook = getConnection()
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
        chinook.close()
      })
    })

    it('should test blob', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST BLOB', (error, results) => {
        expect(error).toBeNull()
        expect(typeof results).toBe('object')
        expect(results).toBeInstanceOf(Buffer)
        const bufferrowset = results as any as Buffer
        expect(bufferrowset.length).toBe(1000)

        done()
        chinook.close()
      })
    })

    it('should test blob0', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST BLOB0', (error, results) => {
        expect(error).toBeNull()
        expect(typeof results).toBe('object')
        expect(results).toBeInstanceOf(Buffer)
        const bufferrowset = results as any as Buffer
        expect(bufferrowset.length).toBe(0)

        done()
        chinook.close()
      })
    })

    it('should test error', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST ERROR', (error, results) => {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)

        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('This is a test error message with a devil error code.')
        expect(sqliteCloudError.errorCode).toBe('66666')
        expect(sqliteCloudError.externalErrorCode).toBe('0')
        expect(sqliteCloudError.offsetCode).toBe(-1)

        done()
        chinook.close()
      })
    })

    it('should test exterror', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST EXTERROR', (error, results) => {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)

        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('This is a test error message with an extcode and a devil error code.')
        expect(sqliteCloudError.errorCode).toBe('66666')
        expect(sqliteCloudError.externalErrorCode).toBe('333')
        expect(sqliteCloudError.offsetCode).toBe(-1)

        done()
        chinook.close()
      })
    })

    it('should test array', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST ARRAY', (error, results) => {
        expect(error).toBeNull()
        expect(Array.isArray(results)).toBe(true)

        const arrayrowset = results as any as Array<any>
        expect(arrayrowset.length).toBe(5)
        expect(arrayrowset[0]).toBe('Hello World')
        expect(arrayrowset[1]).toBe(123456)
        expect(arrayrowset[2]).toBe(3.1415)
        expect(arrayrowset[3]).toBeNull()

        done()
        chinook.close()
      })
    })

    it('should test rowset', done => {
      const chinook = getConnection()
      chinook.sendCommands('TEST ROWSET', (error, results) => {
        expect(error).toBeNull()
        expect(results.numberOfRows).toBeGreaterThanOrEqual(30)
        expect(results.numberOfColumns).toBe(2)
        expect(results.version == 1 || results.version == 2).toBeTruthy()
        expect(results.columnsNames).toEqual(['key', 'value'])

        done()
        chinook.close()
      })
    })

    it(
      'should test chunked rowset',
      done => {
        // this operation sends 150 packets, so we need to increase the timeout
        const database = getChinookTlsConnection(undefined, { timeout: 60 * 1000 })
        database.sendCommands('TEST ROWSET_CHUNK', (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfRows).toBe(147)
          expect(results.numberOfColumns).toBe(1)
          expect(results.columnsNames).toEqual(['key'])

          expect(results[0]['key']).toBe('REINDEX')
          expect(results[1]['key']).toBe('INDEXED')
          expect(results[2]['key']).toBe('INDEX')
          expect(results[3]['key']).toBe('DESC')
          expect(results[146]['key']).toBe('PRIMARY')

          done()
          database.close()
        })
      },
      LONG_TIMEOUT
    )

    it(
      'should test chunked rowset twice',
      done => {
        // this operation sends 150 packets, so we need to increase the timeout
        const database = getChinookTlsConnection(undefined, { timeout: 60 * 1000 })
        database.sendCommands('TEST ROWSET_CHUNK', (error, results) => {
          expect(error).toBeNull()
          expect(results.numberOfRows).toBe(147)
          expect(results.numberOfColumns).toBe(1)
          expect(results.columnsNames).toEqual(['key'])
          expect(results[0]['key']).toBe('REINDEX')
          expect(results[1]['key']).toBe('INDEXED')
          expect(results[2]['key']).toBe('INDEX')
          expect(results[3]['key']).toBe('DESC')

          database.sendCommands('TEST ROWSET_CHUNK', (error, results) => {
            expect(error).toBeNull()
            expect(results.numberOfRows).toBe(147)
            expect(results.numberOfColumns).toBe(1)
            expect(results.columnsNames).toEqual(['key'])
            expect(results[0]['key']).toBe('REINDEX')
            expect(results[1]['key']).toBe('INDEXED')
            expect(results[2]['key']).toBe('INDEX')
            expect(results[3]['key']).toBe('DESC')

            database.sendCommands('SELECT 1', (error, results) => {
              expect(error).toBeNull()
              expect(results.numberOfRows).toBe(1)

              done()
              database.close()
            })
          })
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

        const chinook = getConnection()
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
              chinook.close()
            }
          })
        }
      },
      LONG_TIMEOUT
    )
    /* TODO RESTORE
    it('should apply short tls timeout', done => {
      // this operation sends 150 packets and cannot complete in 20ms
      debugger
      const database = getChinookTlsConnection(
        error => {
          if (error) {
            expect(error).toBeInstanceOf(SQLiteCloudError)
            expect((error as any).message).toBe('Request timed out')

            done()
            database.close()
          } else {
            database.sendCommands('TEST ROWSET_CHUNK', (error, results) => {
              expect(error).toBeInstanceOf(SQLiteCloudError)
              expect((error as any).message).toBe('Request timed out')

              done()
              database.close()
            })
          }
        },
        { timeout: 20 }
      )
    })
*/
  })

  describe('send select commands', () => {
    it(
      'should send xxl query',
      async () => {
        const XXL_QUERY = 1 * 1_000_000
        let longSql = ''

        const connection = getConnection()
        while (longSql.length < XXL_QUERY) {
          for (let i = 0; i < 5_000; i++) longSql += `SELECT ${longSql.length} 'HowLargeIsTooMuch'; `

          try {
            const longResults = await sendCommandsAsync(connection, longSql)
            expect(longResults).toBeInstanceOf(SQLiteCloudRowset)
            if (longResults instanceof SQLiteCloudRowset) {
              expect(longResults.numberOfColumns).toBe(1)
              expect(longResults.numberOfRows).toBe(1)
              expect(longResults[0]['HowLargeIsTooMuch']).toBeGreaterThanOrEqual(longSql.length - 50)
            }
          } catch (error) {
            console.error(`An error occoured while sending an xxl query of ${longSql.length} bytes, error: ${error}`)
            debugger
            throw error
          }
        }

        connection.close()
      },
      EXTRA_LONG_TIMEOUT
    )

    it(
      'should send single xxl query',
      async () => {
        const XXL_QUERY = 1 * 1_000_000
        let longSql = ''

        const connection = getConnection()
        while (longSql.length < XXL_QUERY) {
          longSql += `${longSql.length}_`
        }
        const selectedValue = `start_${longSql}end`
        longSql = `SELECT '${selectedValue}'`
        try {
          const longResults = await sendCommandsAsync(connection, longSql)
          expect(longResults).toBeInstanceOf(SQLiteCloudRowset)
          if (longResults instanceof SQLiteCloudRowset) {
            expect(longResults.numberOfColumns).toBe(1)
            expect(longResults.numberOfRows).toBe(1)
            const columnName = longResults.columnsNames[0]
            expect(longResults[0][columnName]).toBe(selectedValue)
          }
        } catch (error) {
          console.error(`An error occoured while sending an xxl query of ${longSql.length} bytes, error: ${error}`)
          debugger
          throw error
        }

        connection.close()
      },
      EXTRA_LONG_TIMEOUT
    )

    it('should LIST METADATA', done => {
      const chinook = getConnection()
      chinook.sendCommands('LIST METADATA;', (error, results) => {
        expect(error).toBeNull()
        expect(results.numberOfColumns).toBe(8)
        expect(results.numberOfRows).toBe(64)

        done()
        chinook.close()
      })
    })

    it('should select results with no colum names', done => {
      const chinook = getConnection()
      chinook.sendCommands("select 42, 'hello'", (error, results) => {
        expect(error).toBeNull()
        expect(results.numberOfColumns).toBe(2)
        expect(results.numberOfRows).toBe(1)
        expect(results.version == 1 || results.version == 2).toBeTruthy()
        expect(results.columnsNames).toEqual(['42', "'hello'"]) // column name should be hello, not 'hello'
        expect(results.getItem(0, 0)).toBe(42)
        expect(results.getItem(0, 1)).toBe('hello')

        done()
        chinook.close()
      })
    })

    it('should select long formatted string', done => {
      const chinook = getConnection()
      chinook.sendCommands("USE DATABASE :memory:; select printf('%.*c', 1000, 'x') AS DDD", (error, results) => {
        expect(error).toBeNull()
        expect(results.numberOfColumns).toBe(1)
        expect(results.numberOfRows).toBe(1)
        expect(results.version == 1 || results.version == 2).toBeTruthy()

        const stringrowset = results.getItem(0, 0) as string
        expect(stringrowset.startsWith('xxxxxxxxxxxxx')).toBeTruthy()
        expect(stringrowset).toHaveLength(1000)

        done()
        chinook.close()
      })
    })

    it('should select database', done => {
      const chinook = getConnection()
      chinook.sendCommands('USE DATABASE chinook.sqlite;', (error, results) => {
        expect(error).toBeNull()
        expect(results.numberOfColumns).toBeUndefined()
        expect(results.numberOfRows).toBeUndefined()
        expect(results.version).toBeUndefined()

        done()
        chinook.close()
      })
    })

    it('should select * from tracks limit 10 (no chunks)', done => {
      const chinook = getConnection()
      chinook.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, results) => {
        expect(error).toBeNull()
        expect(results.numberOfColumns).toBe(9)
        expect(results.numberOfRows).toBe(10)

        done()
        chinook.close()
      })
    })

    it('should select * from tracks (with chunks)', done => {
      const chinook = getConnection()
      chinook.sendCommands('SELECT * FROM tracks;', (error, results) => {
        expect(error).toBeNull()
        expect(results.numberOfColumns).toBe(9)
        expect(results.numberOfRows).toBe(3503)

        done()
        chinook.close()
      })
    })

    it('should select * from albums', done => {
      const chinook = getConnection()
      chinook.sendCommands('SELECT * FROM albums;', (error, results) => {
        expect(error).toBeNull()
        expect(results.numberOfColumns).toBe(3)
        expect(results.numberOfRows).toBe(347)
        expect(results.version == 1 || results.version == 2).toBeTruthy()

        done()
        chinook.close()
      })
    })
  })

  describe('connection stress testing', () => {
    it(
      '20x test string',
      done => {
        const chinook = getConnection()
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
              chinook.close()
            }
          })
        }
      },
      LONG_TIMEOUT
    )

    it(
      '20x individual selects',
      done => {
        const chinook = getConnection()
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
              chinook.close()
            }
          })
        }
      },
      LONG_TIMEOUT
    )

    it(
      '20x batched selects',
      done => {
        const chinook = getConnection()
        const numQueries = 20
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
                chinook.close()
              }
            }
          )
        }
      },
      LONG_TIMEOUT
    )
  })

  describe('anonimizeCommand', () => {
    it('should mask username and password', () => {
      const anonimized = anonimizeCommand('+62 AUTH USER admin PASSWORD notreallyapassword; USE DATABASE chinook.sqlite; ')
      expect(anonimized).toBe('+62 AUTH USER ****** PASSWORD ******; USE DATABASE chinook.sqlite; ')
    })

    it('should leave other values untouched', () => {
      const anonimized = anonimizeCommand('+62 AUTH USER admin SOMETHING notreallyapassword; USE DATABASE chinook.sqlite; ')
      expect(anonimized).toBe('+62 AUTH USER ****** SOMETHING notreallyapassword; USE DATABASE chinook.sqlite; ')
    })
  })
})
