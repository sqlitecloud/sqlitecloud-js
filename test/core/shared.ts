import { SQLiteCloudError, SQLiteCloudRowset } from '../../src/index'
import { SQLiteCloudConnection } from '../../src/drivers/connection'
import { SQLiteCloudTlsConnection } from '../../src/drivers/connection-tls'
import { CHINOOK_DATABASE_URL } from '../shared'
import { parseconnectionstring } from '../../src/drivers/utilities'

const _ = undefined // to use undefined as empty argument

function getConnection() {
  return new SQLiteCloudTlsConnection({ connectionstring: CHINOOK_DATABASE_URL }, error => {
    if (error) {
      console.error(`getChinookTlsConnection - returned error: ${error}`)
    }
    expect(error).toBeNull()
  })
}

const connUsername = parseconnectionstring(CHINOOK_DATABASE_URL).username

//utils
const randomName = (length: number = 7): string =>
  Array(length + 1)
    .join((Math.random().toString(36) + '00000000000000000').slice(2, 18))
    .slice(0, length)
const randomDate = (fromTime = new Date(new Date().getTime() + 4 * 60 * 60 * 1000).getTime()) =>
  new Date(fromTime + Math.random())
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z/, '')
const randomBool = (): boolean => Math.random() < 0.5
const date = () => expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
const ip = () => expect.stringMatching(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
const uuid = () => expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
const bool = () => expect.any(Number)
const colseq = () => expect.stringMatching(/^(BINARY|RTRIM|NOCASE)$/)
const screaming_snake_case = () => expect.stringMatching(/^[A-Z]+[_]*[A-Z]*$/)
const regex_IP_UUID_N = /(^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$)|(^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$)|[0-9]/

/* const sqlOk = async (command: string, database: SQLiteCloudTlsConnection, done: jest.DoneCallback, ok: boolean) => { //testing with .sql
  try {
    const results = await database.sql(command)
    console.log(results)
  } catch (error) {
    expect(error).toBeInstanceOf(SQLiteCloudError)
    console.log(error)
  }
} */

const test = (done: jest.DoneCallback, chinook: SQLiteCloudConnection, ok: boolean, expectedResult: any = 'OK', callback?: Function) => {
  return (error: SQLiteCloudError | Error | null, results: any) => {
    try {
      if (ok) {
        expect(error).toBeNull()
        if (results && results.constructor) {
          switch (results.constructor) {
            case Array:
              if (typeof expectedResult === 'number') {
                expect(results).toHaveLength(expectedResult)
              } else {
                expectedResult.forEach((expRes: any) => expect(results).toContainEqual(expRes))
              }
              break
            case String:
              expect(results).toMatch(expectedResult)
              break
            case Object:
            case Number:
            case Buffer:
              expect(results).toEqual(expectedResult)
              break
            case SQLiteCloudRowset:
              if (expectedResult instanceof Array) {
                expect(results).toEqual(expectedResult)
              } else {
                expect(results).toContainEqual(expectedResult)
              }
              break
            default:
              expect(results).toBe(expectedResult)
          }
        } else {
          expect(results).toBe(expectedResult)
        }
      } else {
        try {
          expect(results).not.toContainEqual(expectedResult)
        } catch {
          try {
            expect(results).toEqual([])
          } catch {
            try {
              expect(error).toBeInstanceOf(SQLiteCloudError)
              expect((error as SQLiteCloudError).message).toMatch(
                /(not found|doesn\'t exist|does not exist|invalid|unable|fail|cannot|must be unique|unknown|undefined|error|no such|not available|try again later|wrong|has no|is read-only)/i
              )
              expect(results).toBeUndefined()
            } catch {
              expect(results).toBeFalsy()
              expect(error).toBeFalsy()
            }
          }
        }
      }
      if (callback) callback(results, error)
      done()
    } catch (error) {
      done(error)
    } finally {
      chinook.close()
    }
  }
}

export {
  _,
  SQLiteCloudError,
  SQLiteCloudRowset,
  SQLiteCloudConnection,
  SQLiteCloudTlsConnection,
  CHINOOK_DATABASE_URL,
  parseconnectionstring,
  getConnection,
  connUsername,
  randomName,
  randomDate,
  randomBool,
  date,
  ip,
  uuid,
  bool,
  colseq,
  screaming_snake_case,
  regex_IP_UUID_N,
  test
}
