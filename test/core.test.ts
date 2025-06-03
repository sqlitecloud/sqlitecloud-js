/**
 * core.test.ts - test sqlitecloud commands
 */

import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { SQLiteCloudTlsConnection } from '../src/drivers/connection-tls'
import { SQLiteCloudError, SQLiteCloudRowset } from '../src/index'
import { SQLiteCloudConnection } from '../src/drivers/connection'
import { CHINOOK_DATABASE_URL, CHINOOK_API_KEY } from './shared'
import { parseconnectionstring } from '../src/drivers/utilities'

jest.retryTimes(3)

// #region tests utilities
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
          if (expectedResult && expectedResult.source && expectedResult.source.includes('null')) {
            expect(results).toBeNull()
          } else {
            expect(results).toBe(expectedResult)
          }
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
                /(not found|doesn\'t exist|does not exist|invalid|unable|fail|cannot|must be unique|unknown|undefined|error|no such|not available|try again later|wrong|has no|is read-only|ended the connection|was already deallocted|already exists)/i
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

// #endregion

describe.each([
  ['', true],
  ['COMPRESSED', true],
  ['NOT_EXISTS', false]
])('tests', (compressed, ok) => {
  //chiedere ad andrea compressed??
  it(`should${ok ? '' : "n't"} test string`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST STRING ${compressed}`, test(done, chinook, ok, 'Hello World, this is a test string.'))
  })

  it(`should${ok ? '' : "n't"} test string0`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST STRING0 ${compressed}`, test(done, chinook, ok, ''))
  })

  it(`should${ok ? '' : "n't"} test zero string`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST ZERO_STRING ${compressed}`, test(done, chinook, ok, 'Hello World, this is a zero-terminated test string.'))
  })

  it(`should${ok ? '' : "n't"} test rowset`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST ROWSET ${compressed}`, test(done, chinook, ok, { key: expect.any(String), value: expect.any(String) }))
  })

  it(`should${ok ? '' : "n't"} test rowset chunk`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST ROWSET_CHUNK ${compressed}`, test(done, chinook, ok, { key: expect.any(String) }))
  })

  it(`should test error`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST ERROR ${compressed}`, test(done, chinook, false))
  })

  it(`should test exterror`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST EXTERROR ${compressed}`, test(done, chinook, false))
  })

  it(`should${ok ? '' : "n't"} test array`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST ARRAY ${compressed}`, test(done, chinook, ok, ['Hello World', 123456, 3.1415, null, expect.any(Buffer)]))
  })

  it(`should${ok ? '' : "n't"} test array0`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST ARRAY0 ${compressed}`, test(done, chinook, ok, 0))
  })

  it(`should${ok ? '' : "n't"} test integer`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST INTEGER ${compressed}`, test(done, chinook, ok, 123456))
  })

  it(`should${ok ? '' : "n't"} test integer`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST FLOAT ${compressed}`, test(done, chinook, ok, 3.1415926))
  })

  it(`should${ok ? '' : "n't"} test blob`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST BLOB ${compressed}`, test(done, chinook, ok, expect.any(Buffer)))
  })

  it(`should${ok ? '' : "n't"} test blob0`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST BLOB0 ${compressed}`, test(done, chinook, ok, expect.any(Buffer)))
  })

  it(`should${ok ? '' : "n't"} test json`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `TEST JSON ${compressed}`,
      test(done, chinook, ok, {
        'msg-from': { class: 'soldier', name: 'Wixilav' },
        'msg-log': [
          'soldier: Boss there is a slight problem with the piece offering to humans',
          'supreme-commander: Explain yourself soldier!',
          "soldier: Well they don't seem to move anymore...",
          'supreme-commander: Oh snap, I came here to see them twerk!'
        ],
        'msg-to': { class: 'supreme-commander', name: '[Redacted]' },
        'msg-type': ['0xdeadbeef', 'irc log']
      })
    )
  })

  it(`should${ok ? '' : "n't"} test null`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST NULL ${compressed}`, test(done, chinook, ok, null))
  })

  it(`should${ok ? '' : "n't"} test command`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TEST COMMAND ${compressed}`, test(done, chinook, ok, 'PING'))
  })
})

describe.each([
  ['192.168.1.1', 'ROLE', 'READ', true],
  ['192.168.1.1', 'ROLE', 'NOT_EXIST', false],
  ['192.168.1.1', 'USER', 'READ', false],
  ['', 'ROLE', 'READ', false]
  //['NOT_EXIST', 'ROLE', 'READ', false] is it right that takes invalid address as valid??
])('allowed ip', (address, type, name, ok) => {
  it(`should${ok ? '' : "n't"} add`, done => {
    const chinook = getConnection()
    //sqlOk(`ADD ALLOWED IP ${address} ${type} ${name}`, chinook, done, ok) prova con .sql
    chinook.sendCommands(`ADD ALLOWED IP ${address} ${type} ${name}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list added`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST ALLOWED IP ${type} ${name}`, test(done, chinook, ok, { address: address, name: name, type: type.toLowerCase() }))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE ALLOWED IP ${address} ${type} ${name}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST ALLOWED IP ${type} ${name}`, test(done, chinook, false, { address: address, name: name, type: type.toLowerCase() }))
  })
})

describe.each([
  [randomName(), 'READ', 'chinook', 'artists', true],
  [randomName(), 'NOT_EXIST', 'chinook', 'artists', false],
  ['', 'READ', 'chinook', 'artists', false]
  //[randomName(), 'READ', 'NOT_EXIST', 'artists', false] // doesn't check if database exists
  //[randomName(), 'READ', 'chinook', 'NOT_EXIST', false] // doesn't check if table exists
])('role', (role, privilege, database, table, ok) => {
  it(`should${ok ? '' : "n't"} create`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`CREATE ROLE ${role} PRIVILEGE ${privilege} DATABASE ${database} TABLE ${table}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list created`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST ROLES`, test(done, chinook, ok, { rolename: role, builtin: 0, privileges: privilege, databasename: database, tablename: table }))
  })

  it(`should${ok ? '' : "n't"} rename`, done => {
    const prevRole = role
    role = randomName()
    const chinook = getConnection()
    chinook.sendCommands(`RENAME ROLE ${prevRole} TO ${role}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list renamed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST ROLES`, test(done, chinook, ok, { rolename: role, builtin: 0, privileges: privilege, databasename: database, tablename: table }))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE ROLE ${role}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST ROLES`,
      test(done, chinook, false, { rolename: role, builtin: 0, privileges: privilege, databasename: database, tablename: table })
    )
  })
})

describe.each([
  ['admin', randomName(), randomDate(), _, true],
  ['admin', randomName(), randomDate(), randomName(), true],
  ['admin', randomName(), 'WRONG_DATE', _, false],
  ['NOT_EXIST', randomName(), randomDate(), randomName(), false],
  ['admin', '', randomDate(), _, false]
])('api key', (username, keyName, expiration, key, ok) => {
  let generated_key: string

  it(`should${ok ? '' : "n't"} create`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE APIKEY USER ${username} NAME ${keyName} EXPIRATION "${expiration}"${key ? ` KEY ${key}` : ''}`,
      test(done, chinook, ok, key ? key : /^[a-zA-Z0-9]{43}$/, (res: string) => (generated_key = res))
    )
  })

  it(`should${ok ? '' : "n't"} switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH APIKEY ${generated_key}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list created`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST APIKEYS USER ${username} ${username == 'admin' ? '; LIST MY APIKEYS' : ''}`,
      test(done, chinook, ok, { creation_date: date(), expiration_date: expiration, key: generated_key, name: keyName })
    )
  })

  it(`should${ok ? '' : "n't"} rename`, done => {
    const prevKeyName = keyName
    keyName = randomName()
    const prevExpiration = expiration
    expiration = randomDate()
    const chinook = getConnection()
    chinook.sendCommands(
      `SET APIKEY ${generated_key} NAME ${keyName} EXPIRATION "${expiration}"; LIST APIKEYS USER ${username}`,
      test(done, chinook, false, { creation_date: date(), expiration_date: prevExpiration, key: generated_key, name: prevKeyName })
    )
  })

  it(`should${ok ? '' : "n't"} list renamed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST APIKEYS USER ${username} ${username == 'admin' ? '; LIST MY APIKEYS' : ''}`,
      test(done, chinook, ok, { creation_date: date(), expiration_date: expiration, key: generated_key, name: keyName })
    )
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE APIKEY ${generated_key}`, test(done, chinook, ok))
  })

  it(`shouldn't switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH APIKEY ${generated_key}`, test(done, chinook, false))
  })

  it(`should${ok ? '' : "n't"} list empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST APIKEYS USER ${username} ${username == 'admin' ? '; LIST MY APIKEYS' : ''}`,
      test(done, chinook, false, { creation_date: date(), expiration_date: expiration, key: generated_key, name: keyName })
    )
  })
})

describe.each([
  [parseconnectionstring(CHINOOK_DATABASE_URL).username, parseconnectionstring(CHINOOK_DATABASE_URL).password, true],
  [parseconnectionstring(CHINOOK_DATABASE_URL).username, randomName(), false],
  [randomName(), parseconnectionstring(CHINOOK_DATABASE_URL).password, false],
  [randomName(), randomName(), false],
  [randomName(), '', false],
  ['', randomName(), false],
  ['', '', false]
])('auth user', (username, password, ok) => {
  it(`should${ok ? '' : "n't"} auth`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH USER ${username} PASSWORD ${password}`, test(done, chinook, ok))
  })
})

describe.each([
  [_, _, _, _, randomBool(), _, _, _, true],
  //[_, _, _, _, randomBool(), _, _, 'NOT_EXIST', false]//not checking node??
  ['NOT_EXIST', _, _, _, randomBool(), _, _, _, false],
  //[_, 'NOT_EXIST', _, _, randomBool(), _, _, _, false], //can't do just to date or the date check is only on FROM?
  ['NOT_EXIST', 'NOT_EXIST', _, _, randomBool(), _, _, _, false],
  [_, _, 9, _, randomBool(), _, _, _, false], //log level 9 doesn't exist
  //[_, _, 2, _, randomBool(), _, _, _, true], //leaving it commented to avoid it failing on ci/cd
  [_, _, _, 9, randomBool(), _, _, _, false], //log type 9 doesn't exist
  //[_, _, _, 5, randomBool(), _, _, _, true], //leaving it commented to avoid it failing on ci/cd
  [_, _, _, _, randomBool(), 0, _, _, false], //should fail because limit is 0
  [_, _, _, _, randomBool(), 5, _, _, true],
  //[_, _, _, _, randomBool(), 5, 10, _, true] can fail on ci/cd
  [_, _, _, _, randomBool(), 5, -1, _, false],
  [randomDate(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()), _, _, _, randomBool(), Number.MAX_VALUE, Number.MAX_VALUE, _, false],
  [_, randomDate(), _, _, randomBool(), _, _, 999, false], // is it possible to have so many nodes? :)
  [randomDate(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()), randomDate(), _, _, randomBool(), _, _, 1, true]
])('logs', (from, to, level, type, id, limit, cursor, node, ok) => {
  it(`should${ok ? '' : "n't"} list log`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST LOG${from ? ` FROM "${from}"` : ''}${to ? ` TO "${to}"` : ''}${level ? ` LEVEL ${level}` : ''}${type ? ` TYPE ${type}` : ''}${id ? ' ID' : ''}${limit != _ ? ` LIMIT ${limit}` : ''}${cursor ? ` CURSOR ${cursor}` : ''}${node ? ` NODE ${node}` : ''}`,
      test(done, chinook, ok, {
        datetime: date(),
        log_type: expect.any(Number),
        log_level: expect.any(Number),
        description: expect.any(String),
        id: id ? expect.any(Number) : undefined,
        username: parseconnectionstring(CHINOOK_DATABASE_URL).username,
        database: parseconnectionstring(CHINOOK_DATABASE_URL).database,
        ip_address: ip(),
        connection_id: expect.any(Number)
      })
    )
  })
})

describe.each([
  [_, true],
  [true, true]
])('cluster', (id, ok) => {
  let leader: number
  it(`should${ok ? '' : "n't"} get leader`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `GET LEADER ${id ? 'ID' : ''}`,
      test(
        done,
        chinook,
        ok,
        id ? expect.any(Number) : parseconnectionstring(CHINOOK_DATABASE_URL).host + ':' + parseconnectionstring(CHINOOK_DATABASE_URL).port,
        (res: any) => {
          if (id) leader = res
        }
      )
    )
  })

  it(`should${ok ? '' : "n't"} list nodes`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      'LIST NODES',
      test(done, chinook, ok, {
        id: leader ?? expect.any(Number),
        public_addr: leader ? parseconnectionstring(CHINOOK_DATABASE_URL).host : expect.any(String),
        port: leader ? parseconnectionstring(CHINOOK_DATABASE_URL).port : expect.any(Number),
        cluster_port: leader ? 9860 : expect.any(Number),
        status: leader ? 'Leader' : expect.any(String),
        progress: expect.any(String),
        match: expect.any(Number),
        last_activity: date()
      })
    )
  })

  it(`shouldn't transfer leadership`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`TRANSFER LEADERSHIP TO NODE ${leader ? leader + 9999999 : ''}`, test(done, chinook, false))
  })
})

describe.each([
  [randomName(), randomName(), 'READ', 'chinook.sqlite', 'artists', CHINOOK_API_KEY, true],
  [randomName(), randomName(), '', '', '', CHINOOK_API_KEY, true],
  [randomName(), randomName(), 'READ', '', '', CHINOOK_API_KEY, true],
  [randomName(), randomName(), 'NOT_EXIST', '', '', randomName(), false],
  [randomName(), randomName(), '', 'chinook.sqlite', 'artists', CHINOOK_API_KEY, true]
  //[randomName(), randomName(), 'READ', 'NOT_EXIST', '', false],
  //[randomName(), randomName(), 'READ', '', 'NOT_EXIST', false] core not checking if database or table exists
])('user', (username, password, role, database, table, key, ok) => {
  it(`should${ok ? '' : "n't"} create`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE USER ${username} PASSWORD ${password}${role ? ` ROLE ${role}` : ''}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}; ${role ? `LIST USERS WITH ROLES${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}` : 'LIST USERS'}`,
      test(
        done,
        chinook,
        ok,
        role != ''
          ? {
              username: username,
              enabled: 1,
              roles: role ? role : null,
              databasename: database ? database : null,
              tablename: table ? table : null
            }
          : {
              username: username,
              enabled: 1
            }
      )
    )
  })

  it(`should${ok ? '' : "n't"} auth`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH USER ${username} PASSWORD ${password}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} verify`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`VERIFY USER ${username} PASSWORD ${password}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH USER ${username}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET USER ${username}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} auth with apikey`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH APIKEY ${key}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} switch apikey`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH APIKEY ${key}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} auth with hash`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH USER ${username} HASH ${createHash('sha256').update(password).digest('base64')}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} revoke role`, done => {
    const gOk = role != '' && ok
    const chinook = getConnection()
    chinook.sendCommands(
      `REVOKE ROLE ${role} USER ${username}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}; ${role ? 'LIST USERS WITH ROLES' : 'LIST USERS'}`,
      test(
        done,
        chinook,
        gOk,
        role != ''
          ? {
              username: username,
              enabled: 1,
              roles: role ? null : expect.any(String),
              databasename: null,
              tablename: null
            }
          : {
              username: username,
              enabled: 1
            }
      )
    )
  })

  it(`should${ok ? '' : "n't"} grant role`, done => {
    const gOk = role != '' && ok
    const chinook = getConnection()
    chinook.sendCommands(
      `GRANT ROLE ${role} USER ${username}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}; ${role ? `LIST USERS WITH ROLES${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}` : 'LIST USERS'}`,
      test(
        done,
        chinook,
        gOk,
        role != ''
          ? {
              username: username,
              enabled: 1,
              roles: role ? role : null,
              databasename: database ? database : null,
              tablename: table ? table : null
            }
          : {
              username: username,
              enabled: 1
            }
      )
    )
  })

  it(`should${ok ? '' : "n't"} disable`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `DISABLE USER ${username}; ${role ? `LIST USERS WITH ROLES${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}` : 'LIST USERS'}`,
      test(
        done,
        chinook,
        ok,
        role != ''
          ? {
              username: username,
              enabled: 0,
              roles: role ? role : null,
              databasename: database ? database : null,
              tablename: table ? table : null
            }
          : {
              username: username,
              enabled: 0
            }
      )
    )
  })

  it(`shouldn't auth`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH USER ${username} PASSWORD ${password}`, test(done, chinook, false))
  })

  it(`shouldn't verify`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`VERIFY USER ${username} PASSWORD ${password}`, test(done, chinook, false))
  })

  it(`shouldn't switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH USER ${username}`, test(done, chinook, false))
  })

  it(`shouldn't set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET USER ${username}`, test(done, chinook, false))
  })

  it(`should${ok ? '' : "n't"} enable`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ENABLE USER ${username}; ${role ? `LIST USERS WITH ROLES${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}` : 'LIST USERS'}`,
      test(
        done,
        chinook,
        ok,
        role != ''
          ? {
              username: username,
              enabled: 1,
              roles: role ? role : null,
              databasename: database ? database : null,
              tablename: table ? table : null
            }
          : {
              username: username,
              enabled: 1
            }
      )
    )
  })

  it(`should${ok ? '' : "n't"} auth`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH USER ${username} PASSWORD ${password}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} add allowed ip to verify`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`ADD ALLOWED IP 1.1.1.1 USER ${username}`, test(done, chinook, ok))
  })

  it(`shouldn't verify`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`VERIFY USER ${username} PASSWORD ${password} IP 1.1.1.12`, test(done, chinook, false))
  })

  it(`should${ok ? '' : "n't"} verify`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`VERIFY USER ${username} PASSWORD ${password} IP 1.1.1.1`, test(done, chinook, ok))
  })

  it(`shouldn't auth`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH USER ${username} PASSWORD ${password}`, test(done, chinook, false))
  })

  it(`should${ok ? '' : "n't"} remove allowed ip to verify`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE ALLOWED IP 1.1.1.1 USER ${username}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH USER ${username}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET USER ${username}`, test(done, chinook, ok))
  })

  it(`should get user`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET USER`, test(done, chinook, true, parseconnectionstring(CHINOOK_DATABASE_URL).username))
  })

  it(`should${ok ? '' : "n't"} rename`, done => {
    const chinook = getConnection()
    const oldUsername = username
    username = randomName()
    chinook.sendCommands(
      `RENAME USER ${oldUsername} TO ${username}; ${role ? `LIST USERS WITH ROLES${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}` : 'LIST USERS'}`,
      test(
        done,
        chinook,
        ok,
        role != ''
          ? {
              username: username,
              enabled: 1,
              roles: role ? role : null,
              databasename: database ? database : null,
              tablename: table ? table : null
            }
          : {
              username: username,
              enabled: 1
            }
      )
    )
  })

  it(`should${ok ? '' : "n't"} set user password`, done => {
    const chinook = getConnection()
    password = randomName()
    chinook.sendCommands(`SET PASSWORD ${password} USER ${username}; AUTH USER ${username} PASSWORD ${password}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `REMOVE USER ${username}; ${role ? `LIST USERS WITH ROLES${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}` : 'LIST USERS'}`,
      test(
        done,
        chinook,
        false,
        role != ''
          ? {
              username: username,
              enabled: 1,
              roles: role ? role : null,
              databasename: database ? database : null,
              tablename: table ? table : null
            }
          : {
              username: username,
              enabled: 1
            }
      )
    )
  })

  it(`shouldn't auth`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH USER ${username} PASSWORD ${password}`, test(done, chinook, false))
  })

  it(`shouldn't switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH USER ${username}`, test(done, chinook, false))
  })

  it(`shouldn't set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET USER ${username}`, test(done, chinook, false))
  })

  it(`should set my password`, done => {
    let chinook = getConnection()
    const myPassword = randomName()
    chinook.sendCommands(`SET MY PASSWORD adminpasswordxxx`, (error: Error | null, results: any) => {
      try {
        expect(error).toBeNull()
        expect(results).toBe('OK')
        chinook.close()

        //with old pass it should fail
        chinook = new SQLiteCloudTlsConnection({ connectionstring: CHINOOK_DATABASE_URL }, (error: any) => {
          let cerr = ''
          if (error) {
            console.error(`getChinookTlsConnection - returned error: ${error}`)
            cerr = `getChinookTlsConnection - returned error: ${error}`
          }
          expect(error).toBeDefined()
          expect(cerr).toMatch(/error/i)
        })

        //try with new pass
        chinook = new SQLiteCloudTlsConnection(
          { connectionstring: CHINOOK_DATABASE_URL.replace(parseconnectionstring(CHINOOK_DATABASE_URL).password ?? 'defaultPassword', myPassword) },
          (error: any) => {
            if (error) {
              console.error(`getChinookTlsConnection - returned error: ${error}`)
            }
            expect(error).toBeNull()
          }
        )
        chinook.sendCommands(`SET MY PASSWORD ${parseconnectionstring(CHINOOK_DATABASE_URL).password}`, (error: Error | null, results: any) => {
          expect(error).toBeNull()
          expect(results).toBe('OK')
        })
      } catch (error) {
        done(error)
      } finally {
        chinook.close()
        done()
      }
    })
  })
})

describe.each([
  [randomName(), randomName(), 'artists', 'chinook.sqlite', true],
  ['', '', '', '', false]
])('pubsub', (name, message, table, database, ok) => {
  it(`should${ok ? '' : "n't"} create`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`CREATE CHANNEL ${name}; LIST CHANNELS`, test(done, chinook, ok, { chname: name }))
  })

  it(`should${ok ? '' : "n't"} create without errors`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`CREATE CHANNEL ${name} IF NOT EXISTS`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} listen`, done => {
    //ERROR Data type: | is not defined in SCSP, it isn't supported yet
    const chinook = getConnection()
    chinook.sendCommands(
      `LISTEN ${name}`,
      test(
        done,
        chinook,
        ok,
        /^PAUTH\s([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/
      )
    )
  })

  it(`should${ok ? '' : "n't"} listen table`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LISTEN TABLE ${table} ${database ? `DATABASE ${database}` : ''}`,
      test(
        done,
        chinook,
        ok,
        /^PAUTH\s([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/
      )
    )
  })

  it(`should${ok ? '' : "n't"} list pubsub connections`, done => {
    const chinook = getConnection()

    chinook.sendCommands(
      `LISTEN TABLE ${table} ${database ? `DATABASE ${database}` : ''}`,
      ok
        ? (error: any, results: any) => {
            expect(error).toBeNull()
            expect(results).toMatch(
              /^PAUTH\s([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/
            )

            chinook.sendCommands(
              `LIST PUBSUB CONNECTIONS`,
              test(done, chinook, ok, {
                id: expect.any(Number),
                dbname: database,
                chname: table,
                client_uuid: uuid()
              })
            )
          }
        : test(done, chinook, false)
    )
  })

  it(`should${ok ? '' : "n't"} notify`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`NOTIFY ${name} "${message}"`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} unlisten`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`UNLISTEN ${name}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} unlisten table`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`UNLISTEN TABLE ${table} ${database ? `DATABASE ${database}` : ''}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE CHANNEL ${name}; LIST CHANNELS`, test(done, chinook, false, { chname: name }))
  })
})

describe.each([
  //don't use pub privilege, it's used by the tests
  ['READ', randomName(), 'chinook.sqlite', 'artists', true],
  ['READ', randomName(), '', '', true],
  //['READ', randomName(), 'NOT_EXIST', 'NOT_EXIST', false], //no check on table or database name
  ['READ', 'READ', '', '', false],
  ['', '', '', '', false],
  ['', '', 'chinook.sqlite', 'artists', false],
  ['', 'READ', '', '', false],
  ['READ', '', '', '', false]
])('privilege', (privilege, role, database, table, ok) => {
  it(`should${ok ? '' : "n't"} grant`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE ROLE ${role}; GRANT PRIVILEGE ${privilege} ROLE ${role}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}; REMOVE ROLE ${role}`,
      test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST PRIVILEGES`, test(done, chinook, ok, { name: role == privilege || role == '' ? '' : privilege }))
  })

  it(`should${ok ? '' : "n't"} revoke`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE ROLE ${role} PRIVILEGE ${privilege}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}; REVOKE PRIVILEGE ${privilege} ROLE ${role}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}; REMOVE ROLE ${role}`,
      test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE ROLE ${role} PRIVILEGE PUB; SET PRIVILEGE ${privilege} ROLE ${role}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}; LIST ROLES`,
      test(done, chinook, ok, {
        rolename: role,
        builtin: 0,
        privileges: privilege,
        databasename: database ? database : null,
        tablename: table ? table : null
      })
    )
  })
})

describe.each([
  [
    100,
    'os',
    'MEMORY',
    _,
    'main',
    'employees',
    'City',
    randomDate(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()),
    randomDate(),
    'DETAILED',
    'PUBSUB',
    true
  ],
  ['', '', '', ' ' /*NOT_EXIST waiting for the strtol fix*/, _, _, _, _, randomDate(), _, _, false],
  [0, 'sqlitecloud_version', 'MEMORY', 1, '', 'albums', _, _, _, '', '', true],
  [0, 'sqlitecloud_version', 'MEMORY', 1, '', '', _, randomDate(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()), randomDate(), '', '', true],
  [0, _, _, 999, _, 'NOT_EXIST', 'NOT_EXIST', 'NOT_EXIST', 'NOT_EXIST', _, 'NOT_EXIST', false]
])('general', (sleep, key, memory, node, database, table, column, from, to, detailed, pubsub, ok) => {
  it(`should ping`, done => {
    const chinook = getConnection()
    chinook.sendCommands('PING', test(done, chinook, true, 'PONG'))
  })

  it(`should${ok ? '' : "n't"} sleep`, done => {
    const ms: number = new Date().getMilliseconds()
    const chinook = getConnection()
    chinook.sendCommands(
      `SLEEP ${sleep}`,
      test(done, chinook, ok, _, () => {
        const newMs: number = new Date().getMilliseconds()
        expect(Math.abs(newMs - ms)).toBeGreaterThanOrEqual(typeof sleep == 'number' ? sleep : 0)
      })
    )
  })

  it(`should${ok ? '' : "n't"} get info`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET INFO ${key} ${node ? `NODE ${node}` : ''}`, test(done, chinook, ok, /.*/i))
  })

  it(`should${table && ok ? '' : "n't"} get sql`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET SQL ${table}`, test(done, chinook, table ? ok : false, `CREATE TABLE "${table}"`))
  })

  it(`should${ok ? '' : "n't"} list commands`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST COMMANDS ${detailed}`,
      test(done, chinook, ok, {
        command: expect.any(String),
        count: expect.any(Number),
        avgtime: expect.any(Number),
        privileges: detailed == 'DETAILED' ? expect.any(String) : undefined
      })
    )
  })

  it(`should${ok ? '' : "n't"} list connections`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST CONNECTIONS ${node ? `NODE ${node}` : ''}`,
      test(done, chinook, ok, {
        id: expect.any(Number),
        address: ip(),
        username: parseconnectionstring(CHINOOK_DATABASE_URL).username,
        database: parseconnectionstring(CHINOOK_DATABASE_URL).database,
        connection_date: date(),
        last_activity: date()
      })
    )
  })

  let connection: number

  it(`should${ok ? '' : "n't"} close connection`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST CONNECTIONS ${node ? `NODE ${node}` : ''}`, (_, res: any) => {
      if (ok) connection = res[0].id
      chinook.sendCommands(`CLOSE CONNECTION ${connection} ${node ? `NODE ${node}` : ''}`, test(done, chinook, ok))
    })
  })

  it("shouldn't list closed connection", done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST CONNECTIONS ${node ? `NODE ${node}` : ''}`,
      test(done, chinook, false, {
        id: connection,
        address: ip(),
        username: parseconnectionstring(CHINOOK_DATABASE_URL).username,
        database: parseconnectionstring(CHINOOK_DATABASE_URL).database,
        connection_date: date(),
        last_activity: date()
      })
    )
  })

  it(`should${ok ? '' : "n't"} list indexes`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      'LIST INDEXES',
      test(done, chinook, ok, {
        name: expect.stringMatching(/IFK_.*/i),
        tbl_name: table != '' ? table : expect.any(String)
      })
    )
  })

  it(`should${ok ? '' : "n't"} list info`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      'LIST INFO',
      test(done, chinook, ok, {
        key: key,
        value: expect.any(String)
      })
    )
  })

  it(`should list keywords`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      'LIST KEYWORDS',
      test(done, chinook, true, [
        { key: 'REINDEX' },
        { key: 'INDEXED' },
        { key: 'INDEX' },
        { key: 'DESC' },
        { key: 'ESCAPE' },
        { key: 'EACH' },
        { key: 'CHECK' },
        { key: 'KEY' },
        { key: 'BEFORE' },
        { key: 'FOREIGN' },
        { key: 'FOR' },
        { key: 'IGNORE' },
        { key: 'REGEXP' },
        { key: 'EXPLAIN' },
        { key: 'INSTEAD' },
        { key: 'ADD' },
        { key: 'DATABASE' },
        { key: 'AS' },
        { key: 'SELECT' },
        { key: 'TABLE' },
        { key: 'LEFT' },
        { key: 'THEN' },
        { key: 'END' },
        { key: 'DEFERRABLE' },
        { key: 'ELSE' },
        { key: 'EXCLUDE' },
        { key: 'DELETE' },
        { key: 'TEMPORARY' },
        { key: 'TEMP' },
        { key: 'OR' },
        { key: 'ISNULL' },
        { key: 'NULLS' },
        { key: 'SAVEPOINT' },
        { key: 'INTERSECT' },
        { key: 'TIES' },
        { key: 'NOTNULL' },
        { key: 'NOT' },
        { key: 'NO' },
        { key: 'NULL' },
        { key: 'LIKE' },
        { key: 'EXCEPT' },
        { key: 'TRANSACTION' },
        { key: 'ACTION' },
        { key: 'ON' },
        { key: 'NATURAL' },
        { key: 'ALTER' },
        { key: 'RAISE' },
        { key: 'EXCLUSIVE' },
        { key: 'EXISTS' },
        { key: 'CONSTRAINT' },
        { key: 'INTO' },
        { key: 'OFFSET' },
        { key: 'OF' },
        { key: 'SET' },
        { key: 'TRIGGER' },
        { key: 'RANGE' },
        { key: 'GENERATED' },
        { key: 'DETACH' },
        { key: 'HAVING' },
        { key: 'GLOB' },
        { key: 'BEGIN' },
        { key: 'INNER' },
        { key: 'REFERENCES' },
        { key: 'UNIQUE' },
        { key: 'QUERY' },
        { key: 'WITHOUT' },
        { key: 'WITH' },
        { key: 'OUTER' },
        { key: 'RELEASE' },
        { key: 'ATTACH' },
        { key: 'BETWEEN' },
        { key: 'NOTHING' },
        { key: 'GROUPS' },
        { key: 'GROUP' },
        { key: 'CASCADE' },
        { key: 'ASC' },
        { key: 'DEFAULT' },
        { key: 'CASE' },
        { key: 'COLLATE' },
        { key: 'CREATE' },
        { key: 'CURRENT_DATE' },
        { key: 'IMMEDIATE' },
        { key: 'JOIN' },
        { key: 'INSERT' },
        { key: 'MATCH' },
        { key: 'PLAN' },
        { key: 'ANALYZE' },
        { key: 'PRAGMA' },
        { key: 'MATERIALIZED' },
        { key: 'DEFERRED' },
        { key: 'DISTINCT' },
        { key: 'IS' },
        { key: 'UPDATE' },
        { key: 'VALUES' },
        { key: 'VIRTUAL' },
        { key: 'ALWAYS' },
        { key: 'WHEN' },
        { key: 'WHERE' },
        { key: 'RECURSIVE' },
        { key: 'ABORT' },
        { key: 'AFTER' },
        { key: 'RENAME' },
        { key: 'AND' },
        { key: 'DROP' },
        { key: 'PARTITION' },
        { key: 'AUTOINCREMENT' },
        { key: 'TO' },
        { key: 'IN' },
        { key: 'CAST' },
        { key: 'COLUMN' },
        { key: 'COMMIT' },
        { key: 'CONFLICT' },
        { key: 'CROSS' },
        { key: 'CURRENT_TIMESTAMP' },
        { key: 'CURRENT_TIME' },
        { key: 'CURRENT' },
        { key: 'PRECEDING' },
        { key: 'FAIL' },
        { key: 'LAST' },
        { key: 'FILTER' },
        { key: 'REPLACE' },
        { key: 'FIRST' },
        { key: 'FOLLOWING' },
        { key: 'FROM' },
        { key: 'FULL' },
        { key: 'LIMIT' },
        { key: 'IF' },
        { key: 'ORDER' },
        { key: 'RESTRICT' },
        { key: 'OTHERS' },
        { key: 'OVER' },
        { key: 'RETURNING' },
        { key: 'RIGHT' },
        { key: 'ROLLBACK' },
        { key: 'ROWS' },
        { key: 'ROW' },
        { key: 'UNBOUNDED' },
        { key: 'UNION' },
        { key: 'USING' },
        { key: 'VACUUM' },
        { key: 'VIEW' },
        { key: 'WINDOW' },
        { key: 'DO' },
        { key: 'BY' },
        { key: 'INITIALLY' },
        { key: 'ALL' },
        { key: 'PRIMARY' }
      ])
    )
  })

  it(`should${ok ? '' : "n't"} list metadata`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST METADATA ${database} ${table ? `TABLE ${table}` : ''} ${column ? `COLUMN ${column}` : ''}`,
      test(
        done,
        chinook,
        ok,
        column
          ? 6
          : table
            ? {
                name: expect.any(String),
                data_type: expect.any(String),
                col_seq: colseq(),
                not_null: bool(),
                primary_key: bool(),
                auto_inc: bool()
              }
            : {
                name: expect.any(String),
                data_type: expect.any(String),
                col_seq: colseq(),
                not_null: bool(),
                primary_key: bool(),
                auto_inc: bool(),
                tablename: expect.any(String),
                affinity_type: expect.any(Number)
              }
      )
    )
  })

  it(`should${ok ? '' : "n't"} list stats`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST STATS ${from ? `FROM "${from}"` : ''} ${to ? `TO "${to}"` : ''} ${node ? `NODE ${node}` : ''} ${memory}`,
      test(done, chinook, ok, {
        datetime: date(),
        key: memory == 'MEMORY' ? 'PHYSICAL_MEMORY' : screaming_snake_case(),
        value: memory == 'MEMORY' ? expect.any(Number) : expect.any(String)
      })
    )
  })

  it(`should${ok ? '' : "n't"} list tables`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST TABLES ${pubsub}`,
      test(
        done,
        chinook,
        ok,
        pubsub == 'PUBSUB'
          ? {
              chname: table ?? expect.any(String)
            }
          : {
              schema: expect.any(String),
              name: table && table != '' ? table : expect.any(String),
              type: 'table',
              ncol: expect.any(Number),
              wr: expect.any(Number),
              strict: expect.any(Number)
            }
      )
    )
  })
})

describe.each([
  [randomName(), _, _, _, true],
  [randomName(), randomName(), _ /* 'UTF-16' */, 4096, true],
  [randomName(), '', _, 999, false], //the page size must be a power of two between 512 and 65536 inclusive this isn't true?? enccoding is not supported?
  [randomName(), _, _ /* 'UTF-16le' */, 1024, true],
  [randomName(), randomName(), _ /* 'UTF-16be' */, 32768, true]
])('database', (database, encryption, encoding, pagesize, ok) => {
  it(`should${ok ? '' : "n't"} create`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE DATABASE ${database} ${encryption ? `KEY ${encryption}` : ''} ${encoding ? `ENCODING ${encoding}` : ''} ${pagesize ? `PAGESIZE ${pagesize}` : ''}; LIST DATABASES; CREATE DATABASE ${database} ${encryption ? `KEY ${encryption}` : ''} ${encoding ? `ENCODING ${encoding}` : ''} ${pagesize ? `PAGESIZE ${pagesize}` : ''} IF NOT EXISTS; LIST DATABASES`,
      test(done, chinook, ok, { name: database })
    )
  })

  it(`should${ok ? '' : "n't"} switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH DATABASE ${database}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} disable and list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DISABLE DATABASE ${database}; LIST DATABASES`, test(done, chinook, false, { name: database }))
  })

  it(`shouldn't switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH DATABASE ${database}`, test(done, chinook, false))
  })

  it(`should${ok ? '' : "n't"} enable and list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`ENABLE DATABASE ${database}; LIST DATABASES`, test(done, chinook, ok, { name: database }))
  })

  it(`should${ok ? '' : "n't"} disable and use`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DISABLE DATABASE ${database}; USE DATABASE ${database}`, test(done, chinook, false))
  })

  it(`should${ok ? '' : "n't"} enable and use`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`ENABLE DATABASE ${database}; USE DATABASE ${database}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list detailed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST DATABASES DETAILED`,
      test(done, chinook, ok, {
        name: database,
        size: expect.any(Number),
        connections: expect.any(Number),
        encryption: encryption ? 'AES256' : null,
        backup: 0,
        nread: expect.any(Number),
        nwrite: expect.any(Number),
        inbytes: expect.any(Number),
        outbytes: expect.any(Number),
        fragmentation: expect.any(String),
        pagesize: pagesize ?? expect.any(Number),
        encoding: encoding ?? expect.any(String),
        status: expect.any(Number),
        wal_size: expect.any(Number),
        shm_size: expect.any(Number),
        cloudsync: null,
        rls: 0,
        udf: 0
      })
    )
  })

  it(`should${ok ? '' : "n't"} decrypt`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `DECRYPT DATABASE ${database}; LIST DATABASES DETAILED`,
      test(done, chinook, ok, {
        name: database,
        size: expect.any(Number),
        connections: expect.any(Number),
        encryption: null,
        backup: 0,
        nread: expect.any(Number),
        nwrite: expect.any(Number),
        inbytes: expect.any(Number),
        outbytes: expect.any(Number),
        fragmentation: expect.any(String),
        pagesize: pagesize ?? expect.any(Number),
        encoding: encoding ?? expect.any(String),
        status: expect.any(Number),
        wal_size: expect.any(Number),
        shm_size: expect.any(Number),
        cloudsync: null,
        rls: 0,
        udf: 0
      })
    )
  })

  it(`should${ok ? '' : "n't"} encrypt`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ENCRYPT DATABASE ${database} KEY ${encryption}; LIST DATABASES DETAILED`,
      test(done, chinook, ok, {
        name: database,
        size: expect.any(Number),
        connections: expect.any(Number),
        encryption: 'AES256',
        backup: 0,
        nread: expect.any(Number),
        nwrite: expect.any(Number),
        inbytes: expect.any(Number),
        outbytes: expect.any(Number),
        fragmentation: expect.any(String),
        pagesize: pagesize ?? expect.any(Number),
        encoding: encoding ?? expect.any(String),
        status: expect.any(Number),
        wal_size: expect.any(Number),
        shm_size: expect.any(Number),
        cloudsync: null,
        rls: 0,
        udf: 0
      })
    )
  })

  it(`should${ok ? '' : "n't"} list connections`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `USE DATABASE ${database}; LIST DATABASE ${database} CONNECTIONS`,
      test(done, chinook, ok, {
        id: expect.any(Number),
        address: ip(),
        username: connUsername,
        database: database,
        connection_date: date(),
        last_activity: date()
      })
    )
  })

  it(`should${ok ? '' : "n't"} list connections by id`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `USE DATABASE ${database}; GET DATABASE ID`,
      test(done, chinook, ok, expect.any(Number), (id: number) => {
        chinook.sendCommands(
          `LIST DATABASE ${id} CONNECTIONS ID`,
          test(done, chinook, ok, {
            id: expect.any(Number),
            address: ip(),
            username: connUsername,
            database: database,
            connection_date: date(),
            last_activity: date()
          })
        )
      })
    )
  })

  it(`should${ok ? '' : "n't"} list keys`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `USE DATABASE ${database}; LIST DATABASE ${database} KEYS`,
      test(
        done,
        chinook,
        ok,
        encryption != ''
          ? {
              key: 'database_key',
              value: `${encryption}`
            }
          : []
      )
    )
  })

  it(`should${ok ? '' : "n't"} get id`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`USE DATABASE ${database}; GET DATABASE ID`, test(done, chinook, ok, expect.any(Number)))
  })

  it(`should${ok ? '' : "n't"} get size`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`USE DATABASE ${database}; GET DATABASE SIZE`, test(done, chinook, ok, expect.any(Number)))
  })

  it(`should${ok ? '' : "n't"} get name`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`USE DATABASE ${database}; GET DATABASE NAME`, test(done, chinook, ok, database))
  })

  it(`should${ok ? '' : "n't"} get default`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`USE DATABASE ${database}; GET DATABASE`, test(done, chinook, ok, database))
  })

  it(`should${ok ? '' : "n't"} unuse`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`USE DATABASE ${database}; UNUSE DATABASE; GET DATABASE NAME`, test(done, chinook, false, database))
  })

  it(`should unuse`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`UNUSE DATABASE`, test(done, chinook, true))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `REMOVE DATABASE ${database}; LIST DATABASES; REMOVE DATABASE ${database} IF EXISTS; LIST DATABASES`,
      test(done, chinook, false, { name: database })
    )
  })

  it(`shouldn't switch`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SWITCH DATABASE ${database}`, test(done, chinook, false))
  })
})

describe.each([
  ['chinook.sqlite', 0, null, null, true],
  ['chinook.sqlite', 1, 1, 1, true],
  ['chinook.sqlite', 0, undefined, undefined, true],
  [undefined, 1, 1, 1, false],
  ['chinook.sqlite', 1, '1h', '1h', true],
  ['undefined', randomName(), randomName(), randomName(), false]
])('backups', (database, enabled, retention, snapshot_interval, ok) => {
  it(`should${ok ? '' : "n't"} apply backup settings`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `
      SET DATABASE ${database} KEY backup TO ${enabled};
      ${retention ? `SET DATABASE ${database} KEY backup_retention TO ${retention}` : 'REMOVE DATABASE chinook.sqlite KEY backup_retention'};
      ${snapshot_interval ? `SET DATABASE ${database} KEY backup_snapshot_interval TO ${snapshot_interval}` : 'REMOVE DATABASE chinook.sqlite KEY backup_snapshot_interval'};
      APPLY BACKUP SETTINGS;
      `,
      test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} list settings`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST BACKUP SETTINGS`,
      test(done, chinook, ok, {
        name: 'chinook.sqlite',
        enabled: enabled,
        backup_retention: retention ? retention.toString() : null,
        backup_snapshot_interval: snapshot_interval ? snapshot_interval.toString() : null
      })
    )
  })

  it(`should${ok ? '' : "n't"} list backups`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST BACKUPS`, test(done, chinook, ok, /*enabled*/ []))
  })

  it(`should${/* can't get backups to work locally. enabled ? true : */ false ? '' : "n't"} list ${database} backups`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST BACKUPS DATABASE ${database}`, test(done, chinook, /* enabled ? true : */ false))
  })

  it(`should${/* can't get backups to work locally. enabled ? true : */ false ? '' : "n't"} restore ${database} backup`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`RESTORE BACKUP DATABASE ${database}`, test(done, chinook, /* enabled ? true : */ false)) //[GENERATION <generation>] [INDEX <index>] [TIMESTAMP <timestamp>]
  })
})

describe.each([[randomName(), false]])('plugins', (name, ok) => {
  //these test can potentially break in the future
  it(`should list plugins`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST PLUGINS`, test(done, chinook, true, []))
  })

  it(`should enable plugin`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`ENABLE PLUGIN ${name}`, test(done, chinook, true))
  })

  it(`should${ok ? '' : "n't"} load plugin`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LOAD PLUGIN ${name}`, test(done, chinook, ok))
  })

  it(`should disable plugin`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DISABLE PLUGIN ${name}`, test(done, chinook, true))
  })
})

describe.each([
  [1, undefined, 'chinook.sqlite', 75, true, true, false, true],
  [1, undefined, undefined, undefined, false, false, false, true],
  [1, undefined, undefined, undefined, true, true, false, true],
  [_, undefined, undefined, undefined, true, true, false, true],
  ['\0\0\0\0', 'undefined', '\0\0\0\0', undefined, true, true, true, false]
])('analyzer', (node, group, database, percentage, all, apply, grouped, ok) => {
  it(`enables query analyzer`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET KEY query_analyzer_enabled TO 1; SET KEY query_analyzer_threshold TO 0;`, test(done, chinook, ok))
  })

  it(`executes a query to analyze`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SELECT * FROM customers`, test(done, chinook, true, expect.anything()))
  })

  let query: string

  it(`should${ok ? '' : "n't"} list analyzer`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST ANALYZER${group ? ` GROUPID ${group}` : ''}${database ? ` DATABASE ${database}` : ''}${grouped ? ' GROUPED' : ''}${node ? ` NODE ${node}` : ''}`,
      test(
        done,
        chinook,
        ok,
        grouped
          ? {
              group_id: expect.any(Number),
              sql: expect.any(String),
              database: database ?? expect.any(String),
              'AVG(query_time)': expect.any(Number),
              'MAX(query_time)': expect.any(Number),
              'COUNT(query_time)': expect.any(Number)
            }
          : {
              id: expect.any(Number),
              sql: expect.any(String),
              database: database ?? expect.any(String),
              query_time: expect.anything(),
              datetime: expect.anything()
            },
        (res: any) => (ok ? (query = res[0].id) : undefined)
      )
    )
  })

  it(`should${ok ? '' : "n't"} suggest`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ANALYZER SUGGEST ID ${query}${percentage ? ` PERCENTAGE ${percentage}` : ''}${apply ? ' APPLY' : ''}${node ? ` NODE ${node}` : ''}`,
      test(done, chinook, ok, {
        statement: expect.any(Number),
        type: expect.any(Number),
        report: expect.any(String)
      })
    )
  })

  it(`should${ok ? '' : "n't"} plan`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ANALYZER PLAN ID ${query}${node ? ` NODE ${node}` : ''}`,
      test(done, chinook, ok, {
        id: expect.any(Number),
        parent: expect.any(Number),
        notused: expect.any(Number),
        detail: expect.any(String)
      })
    )
  })

  it(`should${ok ? '' : "n't"} reset analyzer`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ANALYZER RESET${query ? ` ID ${query}` : group ? ` GROUPID ${group}` : database ? ` DATABASE ${database}` : all ? ' ALL' : ''}${node ? ` NODE ${node}` : ''}`,
      test(done, chinook, ok)
    )
  })

  it(`disables query analyzer`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE KEY query_analyzer_enabled; REMOVE KEY query_analyzer_threshold;`, test(done, chinook, ok))
  })
})

describe.each([
  ['COMPRESSION', 1, true], //tofix
  ['ID', 10, true],
  ['IP', 10, true],
  ['MAXDATA', 0, true], //tofix
  ['MAXROWS', 0, true], //tofix
  ['MAXROWSET', 0, true], //tofix
  ['NOBLOB', 0, true], //tofix
  ['NONLINEARIZABLE', 0, true], //tofix
  ['UUID', 10, true],
  ['ZEROTEXT', 0, true], //tofix
  [undefined, undefined, false],
  ['\0\0\\\\', 10, false],
  [99, 10, false],

  //['COMPRESSION', -1 * Number.MAX_VALUE, true], tofix
  ['ID', -1 * Number.MAX_VALUE, true],
  ['IP', -1 * Number.MAX_VALUE, true],
  //['MAXDATA', -1 * Number.MAX_VALUE, true], tofix
  //['MAXROWS', -1 * Number.MAX_VALUE, true], tofix
  //['MAXROWSET', -1 * Number.MAX_VALUE, true], tofix
  //['NOBLOB', -1 * Number.MAX_VALUE, true],/tofix
  //['NONLINEARIZABLE', -1 * Number.MAX_VALUE, true], tofix
  ['UUID', -1 * Number.MAX_VALUE, true],
  //['ZEROTEXT', -1 * Number.MAX_VALUE, true], tofix
  [undefined, undefined, false],
  ['\0\0\\\\', -1 * Number.MAX_VALUE, false],
  [99, -1 * Number.MAX_VALUE, false],

  //['COMPRESSION', Number.MAX_VALUE, true], tofix
  ['ID', Number.MAX_VALUE, true],
  ['IP', Number.MAX_VALUE, true],
  //['MAXDATA', Number.MAX_VALUE, true], tofix
  //['MAXROWS', Number.MAX_VALUE, true], tofix
  //['MAXROWSET', Number.MAX_VALUE, true], tofix
  //['NOBLOB', Number.MAX_VALUE, true], tofix
  //['NONLINEARIZABLE', Number.MAX_VALUE, true], tofix
  //['UUID', Number.MAX_VALUE, true],
  //['ZEROTEXT', Number.MAX_VALUE, true], tofix
  [undefined, undefined, false],
  ['\0\0\\\\', Number.MAX_VALUE, false],
  [99, Number.MAX_VALUE, false],

  //['COMPRESSION', 0, true], tofix
  ['ID', 0, true],
  ['IP', 0, true],
  ['MAXDATA', 0, true],
  ['MAXROWS', 0, true],
  ['MAXROWSET', 0, true],
  ['NOBLOB', 0, true],
  ['NONLINEARIZABLE', 0, true],
  ['UUID', 0, true],
  ['ZEROTEXT', 0, true],
  [undefined, undefined, false],
  ['\0\0\\\\', 0, false],
  [99, 0, false]
])('client settings', (key, value, ok) => {
  it(`should${ok ? '' : "n't"} get key`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET CLIENT KEY ${key}`, test(done, chinook, ok, regex_IP_UUID_N))
  })

  it(`should${ok ? '' : "n't"} list keys`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST CLIENT KEYS`,
      test(done, chinook, ok, {
        key: key,
        value: expect.stringMatching(regex_IP_UUID_N)
      })
    )
  })

  let read_only = false

  it(`should${ok ? '' : "n't"} set key to ${value}`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET CLIENT KEY ${key} TO ${value}`, (error: any, results: any) => {
      if (ok) {
        if (results) {
          expect(error).toBeNull()
          expect(results).toBe('OK')
        } else {
          expect(error.message).toMatch(/(is read-only|unable to set)/i)
          read_only = true
        }
        chinook.close()
        done()
      } else {
        test(done, chinook, ok)(error, results)
      }
    })
  })

  it(`should${ok ? '' : "n't"} check list keys`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST CLIENT KEYS`,
      test(done, chinook, ok, {
        key: key,
        value: !read_only && ok ? value?.toString() : expect.stringMatching(regex_IP_UUID_N)
      })
    )
  })

  it(`should${ok ? '' : "n't"} check key`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET CLIENT KEY ${key}`, test(done, chinook, ok, !read_only && ok ? value?.toString() : regex_IP_UUID_N))
  })

  it(`should${ok ? '' : "n't"} remove key`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE CLIENT KEY ${key}`, test(done, chinook, ok))
  })
})

describe.each([
  ['hello', 10, true],
  [undefined, undefined, false],
  ['\0\0\\\\', 10, false],
  [99, 10, true],

  ['hello', -1 * Number.MAX_VALUE, true],
  [undefined, undefined, false],
  ['\0\0\\\\', -1 * Number.MAX_VALUE, false],
  [99, -1 * Number.MAX_VALUE, true],

  ['hello', Number.MAX_VALUE, true],
  [undefined, undefined, false],
  ['\0\0\\\\', Number.MAX_VALUE, false],
  [99, Number.MAX_VALUE, true],

  ['hello', 0, true],
  [undefined, undefined, false],
  ['\0\0\\\\', 0, false],
  [99, 0, true]
])('database settings', (key, value, ok) => {
  it(`shouldn't get key`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET DATABASE chinook.sqlite KEY ${key}`, test(done, chinook, ok, null)) //key hasn't been set so it's right to receive null
  })

  it(`should${ok ? '' : "n't"} list keys`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST DATABASE chinook.sqlite KEYS`,
      test(done, chinook, true, {
        key: 'backup',
        value: '1'
      })
    )
  })

  it(`should${ok ? '' : "n't"} set key to ${value}`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET DATABASE chinook.sqlite KEY ${key} TO ${value}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} check key`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET DATABASE chinook.sqlite KEY ${key}`, test(done, chinook, ok, value?.toString()))
  })

  it(`should remove key`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE DATABASE chinook.sqlite KEY ${key}`, test(done, chinook, ok))
  })
})

describe.each([
  ['autocheckpoint', 10, true, true, true],
  ['autocheckpoint_full', 10, true, true, true],
  ['backlog', 10, false, true, true],
  ['backup_node_id', 10, false, true, true],
  ['base_path', 10, false, false, true],
  ['client_timeout', 10, false, true, true],
  ['cluster_address', 10, false, false, true],
  ['cluster_config', 10, false, false, true],
  ['cluster_node_id', 10, false, false, true],
  ['cluster_port', 10, false, false, true],
  ['cluster_timeout', 10, false, true, true],
  ['command_maxlen', 10, false, true, true],
  ['dbbusy_timeout', 10, false, true, true],
  ['dbdrop_timeout', 10, false, true, true],
  ['dbpage_size', 10, false, true, true],
  ['download_chunk_size', 10, false, true, true],
  ['follower_client_timeout', 10, false, true, true],
  ['insecure', 10, false, true, true],
  ['listening_address', 10, false, false, true],
  ['listening_port', 10, false, false, true],
  ['log_format', 10, false, true, true],
  ['log_level', 10, false, true, true],
  ['max_chunk_size', 10, false, true, true],
  ['max_connections', 10, false, true, true],
  ['messages_path', 10, false, false, true],
  ['min_compression_size', 10, false, true, true],
  ['newcluster', 10, true, false, true],
  ['nocluster', 10, false, true, true],
  ['nthreads', 10, false, true, true],
  ['pubsub_keep_history', 10, false, true, true],
  ['pubsub_skip_blob', 10, false, true, true],
  ['query_analyzer_enabled', 10, false, true, true],
  ['query_analyzer_threshold', 10, false, true, true],
  ['raft_election_tick', 10, false, true, true],
  ['raft_election_timeout', 10, false, true, true],
  ['raft_heartbeat_tick', 10, false, true, true],
  ['raft_inc_vacuum_pages', 10, false, true, true],
  ['raft_log_level', 10, false, true, true],
  ['raft_max_db_size', 10, false, true, true],
  ['raft_max_free_size', 10, false, true, true],
  ['raft_max_log_entries', 10, false, true, true],
  ['raft_tickms', 10, false, true, true],
  ['raft_timeout', 10, false, true, true],
  ['stats_interval', 10, false, true, true],
  ['tcpkeepalive', 10, false, true, true],
  ['tcpkeepalive_count', 10, false, true, true],
  ['tls_certificate_path', 10, false, false, true],
  ['tls_certificatekey_path', 10, false, false, true],
  ['tls_cluster_certificate_path', 10, false, false, true],
  ['tls_cluster_certificatekey_path', 10, false, false, true],
  ['tls_root_certificate_path', 10, false, false, true],
  ['tls_verify_client', 10, false, true, true],
  ['use_concurrent_transactions', 10, false, true, true],
  ['zombie_timeout', 10, false, true, true],
  [undefined, undefined, false, false, false],
  ['\0\0\\\\', 10, true, true, false],
  [99, 10, false, true, false],

  ['autocheckpoint', -1 * Number.MAX_VALUE, true, true, true],
  ['autocheckpoint_full', -1 * Number.MAX_VALUE, true, true, true],
  ['backlog', -1 * Number.MAX_VALUE, false, true, true],
  ['backup_node_id', -1 * Number.MAX_VALUE, false, true, true],
  ['base_path', -1 * Number.MAX_VALUE, false, false, true],
  ['client_timeout', -1 * Number.MAX_VALUE, false, true, true],
  ['cluster_address', -1 * Number.MAX_VALUE, false, false, true],
  ['cluster_config', -1 * Number.MAX_VALUE, false, false, true],
  ['cluster_node_id', -1 * Number.MAX_VALUE, false, false, true],
  ['cluster_port', -1 * Number.MAX_VALUE, false, false, true],
  ['cluster_timeout', -1 * Number.MAX_VALUE, false, true, true],
  ['command_maxlen', -1 * Number.MAX_VALUE, false, true, true],
  ['dbbusy_timeout', -1 * Number.MAX_VALUE, false, true, true],
  ['dbdrop_timeout', -1 * Number.MAX_VALUE, false, true, true],
  ['dbpage_size', -1 * Number.MAX_VALUE, false, true, true],
  ['download_chunk_size', -1 * Number.MAX_VALUE, false, true, true],
  ['follower_client_timeout', -1 * Number.MAX_VALUE, false, true, true],
  ['insecure', -1 * Number.MAX_VALUE, false, true, true],
  ['listening_address', -1 * Number.MAX_VALUE, false, false, true],
  ['listening_port', -1 * Number.MAX_VALUE, false, false, true],
  ['log_format', -1 * Number.MAX_VALUE, false, true, true],
  ['log_level', -1 * Number.MAX_VALUE, false, true, true],
  ['max_chunk_size', -1 * Number.MAX_VALUE, false, true, true],
  ['max_connections', -1 * Number.MAX_VALUE, false, true, true],
  ['messages_path', -1 * Number.MAX_VALUE, false, false, true],
  ['min_compression_size', -1 * Number.MAX_VALUE, false, true, true],
  ['newcluster', -1 * Number.MAX_VALUE, true, false, true],
  ['nocluster', -1 * Number.MAX_VALUE, false, true, true],
  ['nthreads', -1 * Number.MAX_VALUE, false, true, true],
  ['pubsub_keep_history', -1 * Number.MAX_VALUE, false, true, true],
  ['pubsub_skip_blob', -1 * Number.MAX_VALUE, false, true, true],
  ['query_analyzer_enabled', -1 * Number.MAX_VALUE, false, true, true],
  ['query_analyzer_threshold', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_election_tick', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_election_timeout', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_heartbeat_tick', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_inc_vacuum_pages', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_log_level', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_max_db_size', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_max_free_size', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_max_log_entries', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_tickms', -1 * Number.MAX_VALUE, false, true, true],
  ['raft_timeout', -1 * Number.MAX_VALUE, false, true, true],
  ['stats_interval', -1 * Number.MAX_VALUE, false, true, true],
  ['tcpkeepalive', -1 * Number.MAX_VALUE, false, true, true],
  ['tcpkeepalive_count', -1 * Number.MAX_VALUE, false, true, true],
  ['tls_certificate_path', -1 * Number.MAX_VALUE, false, false, true],
  ['tls_certificatekey_path', -1 * Number.MAX_VALUE, false, false, true],
  ['tls_cluster_certificate_path', -1 * Number.MAX_VALUE, false, false, true],
  ['tls_cluster_certificatekey_path', -1 * Number.MAX_VALUE, false, false, true],
  ['tls_root_certificate_path', -1 * Number.MAX_VALUE, false, false, true],
  ['tls_verify_client', -1 * Number.MAX_VALUE, false, true, true],
  ['use_concurrent_transactions', -1 * Number.MAX_VALUE, false, true, true],
  ['zombie_timeout', -1 * Number.MAX_VALUE, false, true, true],
  [undefined, undefined, false, false, false],
  ['\0\0\\\\', -1 * Number.MAX_VALUE, true, true, false],
  [99, -1 * Number.MAX_VALUE, false, true, false],

  ['autocheckpoint', Number.MAX_VALUE, true, true, true],
  ['autocheckpoint_full', Number.MAX_VALUE, true, true, true],
  ['backlog', Number.MAX_VALUE, false, true, true],
  ['backup_node_id', Number.MAX_VALUE, false, true, true],
  ['base_path', Number.MAX_VALUE, false, false, true],
  ['client_timeout', Number.MAX_VALUE, false, true, true],
  ['cluster_address', Number.MAX_VALUE, false, false, true],
  ['cluster_config', Number.MAX_VALUE, false, false, true],
  ['cluster_node_id', Number.MAX_VALUE, false, false, true],
  ['cluster_port', Number.MAX_VALUE, false, false, true],
  ['cluster_timeout', Number.MAX_VALUE, false, true, true],
  ['command_maxlen', Number.MAX_VALUE, false, true, true],
  ['dbbusy_timeout', Number.MAX_VALUE, false, true, true],
  ['dbdrop_timeout', Number.MAX_VALUE, false, true, true],
  ['dbpage_size', Number.MAX_VALUE, false, true, true],
  ['download_chunk_size', Number.MAX_VALUE, false, true, true],
  ['follower_client_timeout', Number.MAX_VALUE, false, true, true],
  ['insecure', Number.MAX_VALUE, false, true, true],
  ['listening_address', Number.MAX_VALUE, false, false, true],
  ['listening_port', Number.MAX_VALUE, false, false, true],
  ['log_format', Number.MAX_VALUE, false, true, true],
  ['log_level', Number.MAX_VALUE, false, true, true],
  ['max_chunk_size', Number.MAX_VALUE, false, true, true],
  //['max_connections', Number.MAX_VALUE, false, true, true], tofix
  ['messages_path', Number.MAX_VALUE, false, false, true],
  ['min_compression_size', Number.MAX_VALUE, false, true, true],
  ['newcluster', Number.MAX_VALUE, true, false, true],
  ['nocluster', Number.MAX_VALUE, false, true, true],
  ['nthreads', Number.MAX_VALUE, false, true, true],
  ['pubsub_keep_history', Number.MAX_VALUE, false, true, true],
  ['pubsub_skip_blob', Number.MAX_VALUE, false, true, true],
  ['query_analyzer_enabled', Number.MAX_VALUE, false, true, true],
  ['query_analyzer_threshold', Number.MAX_VALUE, false, true, true],
  ['raft_election_tick', Number.MAX_VALUE, false, true, true],
  ['raft_election_timeout', Number.MAX_VALUE, false, true, true],
  ['raft_heartbeat_tick', Number.MAX_VALUE, false, true, true],
  ['raft_inc_vacuum_pages', Number.MAX_VALUE, false, true, true],
  ['raft_log_level', Number.MAX_VALUE, false, true, true],
  ['raft_max_db_size', Number.MAX_VALUE, false, true, true],
  ['raft_max_free_size', Number.MAX_VALUE, false, true, true],
  ['raft_max_log_entries', Number.MAX_VALUE, false, true, true],
  ['raft_tickms', Number.MAX_VALUE, false, true, true],
  ['raft_timeout', Number.MAX_VALUE, false, true, true],
  ['stats_interval', Number.MAX_VALUE, false, true, true],
  ['tcpkeepalive', Number.MAX_VALUE, false, true, true],
  ['tcpkeepalive_count', Number.MAX_VALUE, false, true, true],
  ['tls_certificate_path', Number.MAX_VALUE, false, false, true],
  ['tls_certificatekey_path', Number.MAX_VALUE, false, false, true],
  ['tls_cluster_certificate_path', Number.MAX_VALUE, false, false, true],
  ['tls_cluster_certificatekey_path', Number.MAX_VALUE, false, false, true],
  ['tls_root_certificate_path', Number.MAX_VALUE, false, false, true],
  ['tls_verify_client', Number.MAX_VALUE, false, true, true],
  ['use_concurrent_transactions', Number.MAX_VALUE, false, true, true],
  ['zombie_timeout', Number.MAX_VALUE, false, true, true],
  [undefined, undefined, false, false, false],
  ['\0\0\\\\', Number.MAX_VALUE, true, true, false],
  [99, Number.MAX_VALUE, false, true, false],

  ['autocheckpoint', 0, true, true, true],
  ['autocheckpoint_full', 0, true, true, true],
  ['backlog', 0, false, true, true],
  ['backup_node_id', 0, false, true, true],
  ['base_path', 0, false, false, true],
  ['client_timeout', 0, false, true, true],
  ['cluster_address', 0, false, false, true],
  ['cluster_config', 0, false, false, true],
  ['cluster_node_id', 0, false, false, true],
  ['cluster_port', 0, false, false, true],
  ['cluster_timeout', 0, false, true, true],
  ['command_maxlen', 0, false, true, true],
  ['dbbusy_timeout', 0, false, true, true],
  ['dbdrop_timeout', 0, false, true, true],
  ['dbpage_size', 0, false, true, true],
  ['download_chunk_size', 0, false, true, true],
  ['follower_client_timeout', 0, false, true, true],
  ['insecure', 0, false, true, true],
  ['listening_address', 0, false, false, true],
  ['listening_port', 0, false, false, true],
  ['log_format', 0, false, true, true],
  ['log_level', 0, false, true, true],
  ['max_chunk_size', 0, false, true, true],
  ['max_connections', 0, false, true, true],
  ['messages_path', 0, false, false, true],
  ['min_compression_size', 0, false, true, true],
  ['newcluster', 0, true, false, true],
  ['nocluster', 0, false, true, true],
  ['nthreads', 0, false, true, true],
  ['pubsub_keep_history', 0, false, true, true],
  ['pubsub_skip_blob', 0, false, true, true],
  ['query_analyzer_enabled', 0, false, true, true],
  ['query_analyzer_threshold', 0, false, true, true],
  ['raft_election_tick', 0, false, true, true],
  ['raft_election_timeout', 0, false, true, true],
  ['raft_heartbeat_tick', 0, false, true, true],
  ['raft_inc_vacuum_pages', 0, false, true, true],
  ['raft_log_level', 0, false, true, true],
  ['raft_max_db_size', 0, false, true, true],
  ['raft_max_free_size', 0, false, true, true],
  ['raft_max_log_entries', 0, false, true, true],
  //['raft_tickms', 0, false, true, true], tofix
  //['raft_timeout', 0, false, true, true], tofix
  ['stats_interval', 0, false, true, true],
  ['tcpkeepalive', 0, false, true, true],
  ['tcpkeepalive_count', 0, false, true, true],
  ['tls_certificate_path', 0, false, false, true],
  ['tls_certificatekey_path', 0, false, false, true],
  ['tls_cluster_certificate_path', 0, false, false, true],
  ['tls_cluster_certificatekey_path', 0, false, false, true],
  ['tls_root_certificate_path', 0, false, false, true],
  ['tls_verify_client', 0, false, true, true],
  ['use_concurrent_transactions', 0, false, true, true],
  ['zombie_timeout', 0, false, true, true],
  [undefined, undefined, false, false, false],
  ['\0\0\\\\', 0, true, true, false],
  [99, 0, false, true, false]
])('cluster settings', (key, value, detailed, no_read_only, ok) => {
  let old_value = expect.stringMatching(/([0-9]|\/|\[)/)

  it(`should${ok ? '' : "n't"} get key: ${key && typeof key == 'string' && !key.includes('\\') ? key : 'something that will make me crash'}`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `GET KEY ${key}`,
      test(done, chinook, ok, /([0-9]|\/|\[|null)/, (res: any) => (res == null ? (old_value = null) : _))
    )
  })

  it(`should${ok ? '' : "n't"} list keys`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST KEYS${detailed ? ' DETAILED' : ''}${no_read_only ? ' NOREADONLY' : ''}`,
      test(
        done,
        chinook,
        ok,
        detailed
          ? {
              key: key,
              value: expect.anything(),
              default_value: no_read_only ? expect.anything() : null,
              readonly: no_read_only ? 0 : expect.any(Number),
              description: expect.any(String)
            }
          : {
              key: key,
              value: old_value
            }
      )
    )
  })

  let read_only = false

  it(`should${ok ? '' : "n't"} set key to ${value}`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET KEY ${key} TO ${value}`, (error: any, results: any) => {
      if (ok) {
        if (results) {
          expect(error).toBeNull()
          expect(results).toBe('OK')
        } else {
          expect(error.message).toMatch(/is read-only/i)
          read_only = true
        }
        chinook.close()
        done()
      } else {
        test(done, chinook, ok)(error, results)
      }
    })
  })

  it(`should${ok ? '' : "n't"} check key`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `GET KEY ${key}`,
      test(done, chinook, ok, /([0-9]|\/|\[|null)/, (res: any) => (!read_only && ok ? expect(res).toEqual(value?.toString()) : _))
    )
  })

  it(`should${ok ? '' : "n't"} remove key`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE KEY ${key}`, test(done, chinook, !read_only && ok))
  })
})

describe.each([
  ['example.com', 'chinook.sqlite', 'artists', 3, _, 'example', true],
  ['example2.com', 'chinook.sqlite', 'artists', 2, _, 'example2', true],
  ['example1.com', 'chinook.sqlite', 'artists', 1, _, 'example1', true],
  ['example0.com', 'chinook.sqlite', 'artists', 0, _, 'example0', false],
  ['example_notexisting.com', _, _, 2, _, 'example_notexisting', false],
  ['example.com', 'chinook', 'artist', 3, _, 'example', false],
  [_, _, _, 2, _, _, false]
])('webhook', (url_or_code, database, table, mask, options, secret, ok) => {
  let generated_secret = ''
  let id = 0

  it(`should${ok ? '' : "n't"} add`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ADD WEBHOOK ${url_or_code}`,
      test(done, chinook, ok, /[A-Za-z0-9]{43}/i, (r: any) => (generated_secret = r))
    )
  })

  it(`should${ok ? '' : "n't"} add with secret`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ADD WEBHOOK ${url_or_code}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}${mask ? ` MASK ${mask}` : ''}${options ? ` OPTIONS ${options}` : ''} SECRET ${secret}`,
      test(done, chinook, ok, secret)
    )
  })

  it(`should${ok ? '' : "n't"} list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST WEBHOOKS`,
      test(
        done,
        chinook,
        ok,
        {
          id: expect.any(Number),
          action: url_or_code,
          databasename: database,
          tablename: table,
          mask: mask,
          options: options ?? null,
          secret: secret
        },
        (r: any) => (id = r[r.length - 1].id)
      )
    )
  })

  it(`should${ok ? '' : "n't"} remove with secret`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE WEBHOOK ${id}`, test(done, chinook, ok))
  })

  it(`shouldn't list ${ok ? 'removed' : ''}`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST WEBHOOKS`,
      test(done, chinook, false, {
        id: id,
        action: url_or_code,
        databasename: database,
        tablename: table,
        mask: mask,
        options: options ?? null,
        secret: secret
      })
    )
  })

  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `SET WEBHOOK ${id - 1}${url_or_code ? ` ACTION ${url_or_code}` : ''}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}${mask ? ` MASK ${mask}` : ''}${options ? ` OPTIONS ${options}` : ''}`,
      test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} list set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST WEBHOOKS`,
      test(done, chinook, ok, {
        id: id - 1,
        action: url_or_code,
        databasename: database,
        tablename: table,
        mask: mask,
        options: options ?? null,
        secret: generated_secret
      })
    )
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE WEBHOOK ${id - 1}`, test(done, chinook, ok))
  })
})

describe.each([
  ['test', true],
  [Number.MAX_VALUE, true],
  [_, false]
])('debug mask', (mask, ok) => {
  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET DEBUG MASK ${mask ?? ''}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE DEBUG MASK ${mask ?? ''}`, test(done, chinook, ok))
  })
})

describe('command debug', () => {
  for (let i = -5; i < 10; i++) {
    let ok = false
    if (i > 0 && i < 5) ok = true
    it(`should${ok ? '' : "n't"} command debug`, done => {
      const chinook = getConnection()
      chinook.sendCommands(
        `COMMAND DEBUG ${i}`,
        test(
          done,
          chinook,
          true,
          ok
            ? {
                id: expect.any(Number),
                address: ip(),
                port: expect.any(Number),
                nodeid: expect.any(Number),
                username: parseconnectionstring(CHINOOK_DATABASE_URL).username,
                database: parseconnectionstring(CHINOOK_DATABASE_URL).database,
                uuid: uuid(),
                ptr: expect.stringMatching(/^0x[a-z0-9]{12}/),
                connection_date: date(),
                last_activity: date(),
                forward: expect.any(Number),
                userid: expect.any(Number),
                exp: i != 2 ? undefined : expect.any(Number),
                dnow: i == 2 ? undefined : i == 4 ? expect.any(String) : expect.any(Number),
                last: i == 2 || i == 4 ? undefined : expect.any(Number),
                dlast: i != 4 ? undefined : expect.any(String),
                diff: i == 2 ? undefined : expect.any(Number)
              }
            : 'OK'
        )
      )
    })
  }
})

describe.skip.each([
  //unable to find command set env??
  ['test', Number.MAX_VALUE, true],
  ['//', '//', false]
])('env', (key, value, ok) => {
  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET ENV ${key} TO ${value}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} get`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET ENV ${key}`, test(done, chinook, ok, value))
  })

  it(`should${ok ? '' : "n't"} list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST ENV`,
      test(done, chinook, ok, {
        key: key,
        value: value
      })
    )
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE ENV KEY ${key}`, test(done, chinook, ok))
  })
})

describe.each([
  [true, 2, '192.168.1.1', 8860, 9860, true]
  //[false, 0, '//', '//', false]
])('node', (learner, id, address, port, cluster_port, ok) => {
  it(`should${ok ? '' : "n't"} add`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ADD${learner ? ' LEARNER' : ''} NODE ${id} ADDRESS ${address}:${port} ${cluster_port ? ` CLUSTER ${address}:${cluster_port}` : ''}`,
      test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST NODES`,
      test(done, chinook, ok, {
        id: id,
        public_addr: address,
        port: port,
        cluster_port: cluster_port,
        status: learner ? 'Learner' : 'Leader',
        progress: expect.stringMatching(/(replicate|probe)/i),
        match: expect.any(Number),
        last_activity: expect.any(String) //date()
      })
    )
  })

  it.skip(`should${ok ? '' : "n't"} auth`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH CLUSTER ${id} ${CHINOOK_API_KEY}`, test(done, chinook, ok))
  })

  it.skip(`should${ok ? '' : "n't"} promote`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`PROMOTE NODE ${id}`, test(done, chinook, ok))
  })

  it.skip(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE NODE ${id}`, test(done, chinook, ok))
  })
})

//skipping some list tests because they get undefined reply??
describe('list', () => {
  it.skip(`should list compile options`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST COMPILE OPTIONS`,
      test(done, chinook, true, [
        { compile_options: 'ATOMIC_INTRINSICS=1' },
        { compile_options: 'CODEC=see-aes256-ofb' },
        { compile_options: 'COMPILER=gcc-12.2.0' },
        { compile_options: 'DEFAULT_AUTOVACUUM' },
        { compile_options: 'DEFAULT_CACHE_SIZE=-2000' },
        { compile_options: 'DEFAULT_FILE_FORMAT=4' },
        { compile_options: 'DEFAULT_FOREIGN_KEYS' },
        { compile_options: 'DEFAULT_JOURNAL_SIZE_LIMIT=-1' },
        { compile_options: 'DEFAULT_MMAP_SIZE=0' },
        { compile_options: 'DEFAULT_PAGE_SIZE=4096' },
        { compile_options: 'DEFAULT_PCACHE_INITSZ=20' },
        { compile_options: 'DEFAULT_RECURSIVE_TRIGGERS' },
        { compile_options: 'DEFAULT_SECTOR_SIZE=4096' },
        { compile_options: 'DEFAULT_SYNCHRONOUS=2' },
        { compile_options: 'DEFAULT_WAL_AUTOCHECKPOINT=1000' },
        { compile_options: 'DEFAULT_WAL_SYNCHRONOUS=2' },
        { compile_options: 'DEFAULT_WORKER_THREADS=0' },
        { compile_options: 'DIRECT_OVERFLOW_READ' },
        { compile_options: 'ENABLE_COLUMN_METADATA' },
        { compile_options: 'ENABLE_DBPAGE_VTAB' },
        { compile_options: 'ENABLE_FTS3' },
        { compile_options: 'ENABLE_FTS3_PARENTHESIS' },
        { compile_options: 'ENABLE_FTS3_TOKENIZER' },
        { compile_options: 'ENABLE_FTS4' },
        { compile_options: 'ENABLE_FTS5' },
        { compile_options: 'ENABLE_GEOPOLY' },
        { compile_options: 'ENABLE_LOAD_EXTENSION' },
        { compile_options: 'ENABLE_MATH_FUNCTIONS' },
        { compile_options: 'ENABLE_NORMALIZE' },
        { compile_options: 'ENABLE_PREUPDATE_HOOK' },
        { compile_options: 'ENABLE_RTREE' },
        { compile_options: 'ENABLE_SESSION' },
        { compile_options: 'ENABLE_SNAPSHOT' },
        { compile_options: 'ENABLE_STMT_SCANSTATUS' },
        { compile_options: 'ENABLE_ZIPVFS' },
        { compile_options: 'HAS_CODEC' },
        { compile_options: 'MALLOC_SOFT_LIMIT=1024' },
        { compile_options: 'MAX_ATTACHED=10' },
        { compile_options: 'MAX_COLUMN=2000' },
        { compile_options: 'MAX_COMPOUND_SELECT=500' },
        { compile_options: 'MAX_DEFAULT_PAGE_SIZE=8192' },
        { compile_options: 'MAX_EXPR_DEPTH=1000' },
        { compile_options: 'MAX_FUNCTION_ARG=127' },
        { compile_options: 'MAX_LENGTH=1000000000' },
        { compile_options: 'MAX_LIKE_PATTERN_LENGTH=50000' },
        { compile_options: 'MAX_MMAP_SIZE=0x7fff0000' },
        { compile_options: 'MAX_PAGE_COUNT=0xfffffffe' },
        { compile_options: 'MAX_PAGE_SIZE=65536' },
        { compile_options: 'MAX_SQL_LENGTH=1000000000' },
        { compile_options: 'MAX_TRIGGER_DEPTH=1000' },
        { compile_options: 'MAX_VARIABLE_NUMBER=32766' },
        { compile_options: 'MAX_VDBE_OP=250000000' },
        { compile_options: 'MAX_WORKER_THREADS=8' },
        { compile_options: 'MUTEX_PTHREADS' },
        { compile_options: 'OMIT_AUTOINIT' },
        { compile_options: 'OMIT_DEPRECATED' },
        { compile_options: 'OMIT_TCL_VARIABLE' },
        { compile_options: 'SYSTEM_MALLOC' },
        { compile_options: 'TEMP_STORE=1' },
        { compile_options: 'THREADSAFE=1' }
      ])
    )
  })

  it.skip(`should list only reserved commands`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST ONLY RESERVED COMMANDS`,
      test(done, chinook, true, [
        {
          command: 'ADD WEBHOOK <url_or_code> [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'ADD WEBHOOK <url_or_code> [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>] SECRET <secret>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'ADD [LEARNER] NODE <nodeid> ADDRESS <ip_address:port> [CLUSTER <ip_address:port>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'AUTH APIKEY <key>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'AUTH CLUSTER <node_id> <key>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'AUTH USER <username> HASH <hashed_password>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP FINISH <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP INIT [<dest_name>] [SOURCE <source_name>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP PAGECOUNT <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP REMAINING <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP STEP <index> PAGES <npages>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB BYTES <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB CLOSE <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB OPEN <database_name> TABLE <table_name> COLUMN <column_name> ROWID <rowid> RWFLAG <rwflag>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB READ <index> SIZE <size> OFFSET <offset>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB REOPEN <index> ROWID <rowid>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB WRITE <index> OFFSET <offset> DATA <data>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'COMMAND DEBUG <debug_code>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'COUNT LOG [FROM <start_date>] [TO <end_date>] [LEVEL <log_level>] [TYPE <log_type>] [ID] [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'CREATE APIKEY USER <username> NAME <key_name> [EXPIRATION <expiration_date>] KEY <apikey>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE CACHEFLUSH',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'DATABASE ERRNO', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'DATABASE FILENAME <db_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE GET CHANGES',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE GET ROWID',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE GET TOTAL CHANGES',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE LIMIT <id> [VALUE <value>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE NAME <db_index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE READONLY <db_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE STATUS <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE TXNSTATE [<schema_name>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'DOWNLOAD ABORT', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'DOWNLOAD DATABASE <database_name> [IF EXISTS]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'DOWNLOAD STEP', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'GET CONNECTION STATUS',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'HELP <<command>>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'LIST COMPILE OPTIONS',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'LIST LATENCY KEY <keyname> [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'LIST LATENCY [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'LIST WEBHOOKS', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'LIST [ONLY] RESERVED COMMANDS [DETAILED]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'LOAD DATABASE <database_name> [KEY <encryption_key>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'PAUTH <uuid> <secret>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'PROMOTE NODE <nodeid>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'PUBSUB ONLY', count: expect.any(Number), avgtime: expect.any(Number) },
        { command: 'QUIT SERVER', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'REMOVE DEBUG MASK <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'REMOVE NODE <nodeid>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'REMOVE WEBHOOK <webhook_id>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'RESERVE DATABASE <database_name> UUID <uuid_value>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SET DEBUG MASK <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SET USER <username>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SET WEBHOOK <webhook_id> [ACTION <url_or_code>] [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SQLITE RANDOMNESS <n> [RESET]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SQLITE STATUS <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SWITCH APIKEY <key>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SWITCH DATABASE <database_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SWITCH USER <username>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'TRANSFER DATABASE <database_name> [KEY <encryption_key>] [SNAPSHOT <snapshot_value>] [INTERNAL]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'UNRESERVE DATABASE <database_name> [UUID]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'UPLOAD ABORT', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'UPLOAD DATABASE <database_name> [KEY <encryption_key>] [REPLACE]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VERIFY USER <username> PASSWORD <password> [IP <ip_address>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM BIND <vmindex> TYPE <type> COLUMN <column> VALUE <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM CLEAR <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'VM COMPILE <sql>', count: expect.any(Number), avgtime: expect.any(Number) },
        { command: 'VM EXECUTE <sql>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'VM FINALIZE <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'VM LIST <vmindex>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'VM PARAMETER <vmindex> INDEX <name>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM PARAMETER <vmindex> NAME <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM RESET <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM SCAN STATUS <vmindex> INDEX <loop_index> OP <op>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM SCAN STATUS RESET <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'VM SQL <vmindex>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'VM STATUS <vmindex> OP <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM STEP <vmindex> [<flag>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        }
      ])
    )
  })

  it.skip(`should list only reserved commands detailed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST ONLY RESERVED COMMANDS DETAILED`,
      test(done, chinook, true, [
        {
          command: 'ADD WEBHOOK <url_or_code> [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'ADD WEBHOOK <url_or_code> [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>] SECRET <secret>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'ADD [LEARNER] NODE <nodeid> ADDRESS <ip_address:port> [CLUSTER <ip_address:port>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'AUTH APIKEY <key>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'AUTH CLUSTER <node_id> <key>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'AUTH USER <username> HASH <hashed_password>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP FINISH <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP INIT [<dest_name>] [SOURCE <source_name>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP PAGECOUNT <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP REMAINING <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP STEP <index> PAGES <npages>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB BYTES <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB CLOSE <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB OPEN <database_name> TABLE <table_name> COLUMN <column_name> ROWID <rowid> RWFLAG <rwflag>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB READ <index> SIZE <size> OFFSET <offset>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB REOPEN <index> ROWID <rowid>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB WRITE <index> OFFSET <offset> DATA <data>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'COMMAND DEBUG <debug_code>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'COUNT LOG [FROM <start_date>] [TO <end_date>] [LEVEL <log_level>] [TYPE <log_type>] [ID] [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'CREATE APIKEY USER <username> NAME <key_name> [EXPIRATION <expiration_date>] KEY <apikey>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE CACHEFLUSH',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'DATABASE ERRNO', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'DATABASE FILENAME <db_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE GET CHANGES',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE GET ROWID',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE GET TOTAL CHANGES',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE LIMIT <id> [VALUE <value>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE NAME <db_index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE READONLY <db_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE STATUS <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE TXNSTATE [<schema_name>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'DOWNLOAD ABORT', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'DOWNLOAD DATABASE <database_name> [IF EXISTS]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'DOWNLOAD STEP', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'GET CONNECTION STATUS',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'HELP <<command>>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'LIST COMPILE OPTIONS',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'LIST LATENCY KEY <keyname> [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'LIST LATENCY [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'LIST WEBHOOKS', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'LIST [ONLY] RESERVED COMMANDS [DETAILED]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'LOAD DATABASE <database_name> [KEY <encryption_key>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'PAUTH <uuid> <secret>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'PROMOTE NODE <nodeid>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'PUBSUB ONLY', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        { command: 'QUIT SERVER', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'REMOVE DEBUG MASK <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'REMOVE NODE <nodeid>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'REMOVE WEBHOOK <webhook_id>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'RESERVE DATABASE <database_name> UUID <uuid_value>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SET DEBUG MASK <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SET USER <username>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SET WEBHOOK <webhook_id> [ACTION <url_or_code>] [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SQLITE RANDOMNESS <n> [RESET]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SQLITE STATUS <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SWITCH APIKEY <key>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SWITCH DATABASE <database_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SWITCH USER <username>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'TRANSFER DATABASE <database_name> [KEY <encryption_key>] [SNAPSHOT <snapshot_value>] [INTERNAL]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'UNRESERVE DATABASE <database_name> [UUID]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'UPLOAD ABORT', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'UPLOAD DATABASE <database_name> [KEY <encryption_key>] [REPLACE]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VERIFY USER <username> PASSWORD <password> [IP <ip_address>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM BIND <vmindex> TYPE <type> COLUMN <column> VALUE <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM CLEAR <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'VM COMPILE <sql>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        { command: 'VM EXECUTE <sql>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'VM FINALIZE <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'VM LIST <vmindex>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'VM PARAMETER <vmindex> INDEX <name>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM PARAMETER <vmindex> NAME <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM RESET <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM SCAN STATUS <vmindex> INDEX <loop_index> OP <op>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM SCAN STATUS RESET <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'VM SQL <vmindex>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'VM STATUS <vmindex> OP <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM STEP <vmindex> [<flag>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        }
      ])
    )
  })

  it(`should list reserved commands`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST RESERVED COMMANDS`,
      test(done, chinook, true, {
        command: expect.any(String),
        count: expect.any(Number),
        avgtime: expect.any(Number)
      })
    )
  })

  it(`should list reserved commands detailed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST RESERVED COMMANDS DETAILED`,
      test(done, chinook, true, {
        command: expect.any(String),
        count: expect.any(Number),
        avgtime: expect.any(Number),
        privileges: expect.any(String)
      })
    )
  })

  it(`should get help`, done => {
    //to be implemented
    const chinook = getConnection()
    chinook.sendCommands(`HELP <<command>>`, test(done, chinook, true))
  })
})

describe('connection', () => {
  it(`should get connection status`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `GET CONNECTION STATUS`,
      test(done, chinook, true, [parseconnectionstring(CHINOOK_DATABASE_URL).username, parseconnectionstring(CHINOOK_DATABASE_URL).database, 0, 0])
    )
  }, 15000)
})

describe.each([
  ['chinook.sqlite', true],
  [_, false]
])('download database', (database, ok) => {
  it(`should${ok ? '' : "n't"} download database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `DOWNLOAD DATABASE ${database}`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]) //could fail??
            r.forEach((v: number) => expect(v).toBeGreaterThan(0))
            for (let i = 0; i < r.length - 1; i++) {
              chinook.sendCommands(
                `DOWNLOAD STEP`,
                i != r.length - 2
                  ? (e, r) => {
                      expect(e).toBeNull()
                      expect(r).toBeInstanceOf(Buffer)
                    }
                  : test(done, chinook, ok, expect.any(Buffer))
              )
            }
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} abort download database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `DOWNLOAD DATABASE ${database}`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)])
            r.forEach((v: number) => expect(v).toBeGreaterThan(0))

            chinook.sendCommands(`DOWNLOAD STEP`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Buffer)
              chinook.sendCommands(`DOWNLOAD ABORT`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toEqual('OK')
                chinook.sendCommands(`DOWNLOAD STEP`, test(done, chinook, ok))
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should download database if exists${ok ? '' : " (it doesn't exist)"}`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `DOWNLOAD DATABASE ${database} IF EXISTS`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)])
            r.forEach((v: number) => expect(v).toBeGreaterThan(0))
            for (let i = 0; i < r.length - 1; i++) {
              chinook.sendCommands(
                `DOWNLOAD STEP`,
                i != r.length - 2
                  ? (e, r) => {
                      expect(e).toBeNull()
                      expect(r).toBeInstanceOf(Buffer)
                    }
                  : test(done, chinook, ok, expect.any(Buffer))
              )
            }
          }
        : (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([0, 0, expect.any(Number)])
            chinook.sendCommands(`DOWNLOAD STEP`, test(done, chinook, ok))
          }
    )
  })
})

describe('database commands', () => {
  it(`should do a cache flush`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE CACHEFLUSH`, test(done, chinook, true))
  })

  it(`should get error number`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE ERRNO`, test(done, chinook, true, 0))
  })

  it(`should get changes`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE GET CHANGES`, test(done, chinook, true, 0))
  })

  it(`should get rowid`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE GET ROWID`, test(done, chinook, true, 0))
  })

  it(`should get total changes`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE GET TOTAL CHANGES`, test(done, chinook, true, 0))
  })

  for (let i = -5; i < 10; i++) {
    let ok = false
    if (i >= 0 && i < 2) ok = true
    it(`should${ok ? '' : "n't"} get database name`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE NAME ${i}`, test(done, chinook, ok, /[a-z]/))
    })
  }

  ;[
    [0, true],
    [Number.MAX_VALUE, true],
    [Number.MIN_VALUE, true]
  ].forEach(([n, ok]) => {
    it(`should${ok ? '' : "n't"} get database status ${n}`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE STATUS ${n} RESET ${n}`, test(done, chinook, ok as boolean, 3))
    })
  })
  ;[
    ['main', true],
    [_, false]
  ].forEach(([db_name, ok]) => {
    it(`should${ok ? '' : "n't"} get database filename`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE FILENAME ${db_name}`, test(done, chinook, ok as boolean, '/data/8860/databases/chinook.sqlite'))
    })

    it(`should${ok ? '' : "n't"} get if database is read-only`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE READONLY ${db_name}`, test(done, chinook, ok as boolean, 0)) // https://www.sqlite.org/c3ref/db_readonly.html
    })

    it(`should${ok ? '' : "n't"} get database txnstate`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE TXNSTATE ${db_name}`, test(done, chinook, ok as boolean, 0)) // https://www.sqlite.org/c3ref/c_txn_none.html
    })
  })

  for (let i = -5; i < 20; i++) {
    let ok = false
    if (i >= 0 && i <= 11) ok = true
    it(`should${ok ? '' : "n't"} get databases limit ${i}`, done => {
      const chinook = getConnection()
      chinook.sendCommands(
        `DATABASE LIMIT ${i == 7 || i == 11 ? `${i} VALUE ${i}` : i}`,
        test(done, chinook, ok, ok && i != 7 && i != 11 ? expect.any(Number) : 0)
      )
    })
  }
})

describe('pubsub', () => {
  it(`should do pubsub only`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`PUBSUB ONLY`, (e, r) => {
      expect(e).toBeNull()
      expect(r).toEqual('OK')
      chinook.sendCommands(`LIST DATABASES`, test(done, chinook, false))
    })
  })
})

describe.each([
  [0, true],
  [1, true],
  [Number.MAX_VALUE, true],
  [Number.MIN_VALUE, true]
])('sqlite commands', (n, ok) => {
  it(`should set sqlite randomness`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SQLITE RANDOMNESS ${n}`, test(done, chinook, ok, n ? expect.any(Buffer) : null))
  })

  it(`should set sqlite randomness and reset`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SQLITE RANDOMNESS ${n} RESET`, test(done, chinook, ok))
  })

  it(`should get sqlite status and reset`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SQLITE STATUS ${n} RESET ${n}`, test(done, chinook, ok, 3))
  })
})

describe.each([
  [_, _, _, _, randomBool(), _, true],
  [_, _, 9, _, randomBool(), _, true],
  [_, _, _, 9, randomBool(), _, true],
  [randomDate(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()), _, _, _, randomBool(), _, true],
  [_, randomDate(), _, _, randomBool(), 999, false],
  [randomDate(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()), randomDate(), _, _, randomBool(), 1, true]
])('logs', (from, to, level, type, id, node, ok) => {
  it(`should${ok ? '' : "n't"} count log`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `COUNT LOG${from ? ` FROM "${from}"` : ''}${to ? ` TO "${to}"` : ''}${level ? ` LEVEL ${level}` : ''}${type ? ` TYPE ${type}` : ''}${id ? ' ID' : ''}${node ? ` NODE ${node}` : ''}`,
      test(done, chinook, ok, expect.any(Object))
    )
  })
})

describe.each([
  [0, true],
  [1, true],
  [Number.MAX_VALUE, false],
  [Number.MIN_VALUE, false]
])('latency', (node, ok) => {
  it(`should${ok ? '' : "n't"} list latency empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST LATENCY`, test(done, chinook, true, []))
  })

  it(`should${ok ? '' : "n't"} list latency of node empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST LATENCY NODE ${node}`, test(done, chinook, ok, []))
  })

  it(`should${ok ? '' : "n't"} list latency key empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST LATENCY KEY ${_}`, test(done, chinook, true, []))
  })

  it(`should${ok ? '' : "n't"} list latency of node empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST LATENCY KEY ${_} NODE ${node}`, test(done, chinook, ok, []))
  })
})

describe.each([
  ['main', true],
  [_, false]
])('backup database', (database, ok) => {
  it(`should${ok ? '' : "n't"} backup database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BACKUP INIT ${database}`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)]) //could fail??

            chinook.sendCommands(`BACKUP STEP 0 PAGES ${r[3]}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Array)

              chinook.sendCommands(`BACKUP REMAINING 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe(0)
                chinook.sendCommands(`BACKUP FINISH 0`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r[0]).toBe(42)
                  test(done, chinook, ok, 3)(e, r)
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} finish early backup database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BACKUP INIT ${database}`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)])

            chinook.sendCommands(`BACKUP STEP 0 PAGES 1`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Array)
              chinook.sendCommands(`BACKUP FINISH 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toEqual([42, 0, 0])
                chinook.sendCommands(`BACKUP STEP 0 PAGES 1`, test(done, chinook, false)) //should return error already deallocated
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it.skip(`should${ok ? '' : "n't"} backup database to source with unsupported attach`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE DATABASE source_db IF NOT EXISTS; ATTACH DATABASE source_db AS source; BACKUP INIT ${database} SOURCE source`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)]) //could fail??

            chinook.sendCommands(`BACKUP STEP 0 PAGES ${r[3]}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Array)

              chinook.sendCommands(`BACKUP REMAINING 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe(0)
                chinook.sendCommands(`BACKUP FINISH 0`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r[0]).toBe(42)
                  expect(r).toHaveLength(3)
                  chinook.sendCommands(`DETACH DATABASE source_db`, test(done, chinook, ok))
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} backup database to source`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BACKUP INIT ${database} SOURCE temp`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)]) //could fail??

            chinook.sendCommands(`BACKUP STEP 0 PAGES ${r[3]}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Array)

              chinook.sendCommands(`BACKUP REMAINING 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe(0)
                chinook.sendCommands(`BACKUP FINISH 0`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r[0]).toBe(42)
                  test(done, chinook, ok, 3)(e, r)
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })
})

describe.each([
  ['main', 'artists', 'Name', 5, true],
  [_, _, _, _, false]
])('blob', (database, table, column, bytes, ok) => {
  it(`should${ok ? '' : "n't"} open blob`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB READ ${index} SIZE ${bytes} OFFSET 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBeInstanceOf(Buffer)
                expect(r).toHaveLength(bytes as number)

                chinook.sendCommands(`BLOB CLOSE ${index}`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r).toBe('OK')

                  //check if slot 0 was already deallocated
                  chinook.sendCommands(`BLOB READ ${index} SIZE ${Math.trunc((bytes as number) / 2)} OFFSET 0`, test(done, chinook, false))
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} finish early blob read`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB READ ${index} SIZE ${Math.trunc((bytes as number) / 2)} OFFSET 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBeInstanceOf(Buffer)
                expect(r).toHaveLength(Math.trunc(bytes ? bytes / 2 : 0))

                chinook.sendCommands(`BLOB CLOSE ${index}`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r).toBe('OK')

                  //check if slot 0 was already deallocated
                  chinook.sendCommands(`BLOB READ ${index} SIZE ${Math.trunc((bytes as number) / 2)} OFFSET 0`, test(done, chinook, false))
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} open blob and size fail`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB READ ${index} SIZE ${(bytes as number) + 1} OFFSET 0`, test(done, chinook, false))
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail reading blob bytes`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index + 1}`, test(done, chinook, false))
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail closing blob`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB CLOSE ${index + 1}`, test(done, chinook, false))
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail reading blob`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB READ ${index + 1} SIZE 1 OFFSET 0`, test(done, chinook, false))
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} open blob and offset fail`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB READ ${index} SIZE ${bytes as number} OFFSET ${(bytes as number) + 1}`, test(done, chinook, false))
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} change blob rowid by reopening`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB REOPEN ${index} ROWID 2`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe('OK')

                chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r).not.toBe(bytes)

                  chinook.sendCommands(`BLOB CLOSE ${index}`, (e, r) => {
                    expect(e).toBeNull()
                    expect(r).toBe('OK')

                    //try to reopen closed slot should fail
                    chinook.sendCommands(`BLOB REOPEN ${index} ROWID 3`, test(done, chinook, false))
                  })
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it.skip(`should${ok ? '' : "n't"} fail to write on a ro db`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index} OFFSET 0 DATA 12`, (e, r) => {
              expect(r).toBeUndefined()
              expect(e && e.message).toMatch(/attempt to write a readonly database/i)

              chinook.sendCommands(`BLOB CLOSE ${index}`, test(done, chinook, ok)) //tofix shouldn't throw error
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} write`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index} OFFSET 0 DATA 12`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe('OK')

              chinook.sendCommands(`BLOB CLOSE ${index}`, test(done, chinook, ok))
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail to write`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index + 1} OFFSET 0 DATA 12`, test(done, chinook, false))
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} write with offset`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index} OFFSET 3 DATA 12`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe('OK')

              chinook.sendCommands(`BLOB CLOSE ${index}`, test(done, chinook, ok))
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail double writing`, done => {
    const chinook = getConnection()
    const chinook2 = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index} OFFSET 0 DATA 12`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe('OK')
            })

            chinook2.sendCommands(`BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(index)

              chinook2.sendCommands(`BLOB WRITE ${index} OFFSET 0 DATA 12`, (e, r) => {
                expect(r).toBeUndefined()
                expect(e && e.message).toMatch(/database is locked/i)
              })

              chinook2.close()
            })

            chinook.sendCommands(`BLOB CLOSE ${index}`, test(done, chinook, ok))
          }
        : chinook2.close() && test(done, chinook, ok)
    )
  })
})

describe.each([
  ['northwind.db', true]
  //[_, false]
])('upload database', (database, ok) => {
  it(`should fail to start upload database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`UPLOAD DATABASE chinook.sqlite`, test(done, chinook, false))
  })

  //fails because we need to handle blobs in the driver
  it.skip(`should${ok ? '' : "n't"} upload database`, async () => {
    const chinook = getConnection()

    const upload_database = await chinook.sql(`UPLOAD DATABASE ${database} REPLACE`)
    expect(upload_database).toBe('OK')
    console.log('UPLOAD DATABASE', upload_database)

    const fileStream = fs.createReadStream(path.join(__dirname, '../assets/', database as string))

    async function uploader(connection: any, sql: string | ArrayBuffer): Promise<unknown> {
      return await new Promise((resolve, reject) => {
        // console.debug(`sendCommandsAsync - ${sql}`)
        connection.sendCommands([sql], (error: Error | null, results: any) => {
          console.log('uploader', error, results)
          // Explicitly type the 'error' parameter as 'Error'
          if (error) {
            reject(error)
          } else {
            // console.debug(JSON.stringify(results).substring(0, 140) + '...')
            resolve(results)
          }
        })
      })
    }

    let chunk
    for await (chunk of fileStream) {
      console.log(chunk.buffer)
      const upload_chunk = await uploader(chinook, chunk.buffer)
      expect(upload_chunk).toBe('OK')
    }

    fileStream.close()

    const close_upload = await uploader(chinook, new ArrayBuffer(0))
    expect(close_upload).toBe('OK')

    const list_databases = await chinook.sql(`LIST DATABASES DETAILED`)
    expect(list_databases).toContainEqual({
      size: expect.any(Number),
      name: database,
      connections: 0,
      encryption: expect.any(String),
      backup: 0,
      nread: 0,
      nwrite: 0,
      inbytes: 0,
      outbytes: 0,
      fragmentation: 0.0,
      pagesize: 1024,
      encoding: 'UTF-8',
      status: 1,
      wal_size: expect.any(Number),
      shm_size: expect.any(Number),
      cloudsync: null,
      rls: 0,
      udf: 0
    })

    chinook.close()
  }, 60000)

  it(`should reserve and unreserve database`, done => {
    const chinook = getConnection()
    const rsrvd_db_test = randomName()
    chinook.sendCommands(`RESERVE DATABASE ${rsrvd_db_test} UUID ${rsrvd_db_test}`, (e, r) => {
      expect(e).toBeNull()
      expect(r).toBe('OK')

      chinook.sendCommands(`UPLOAD DATABASE ${rsrvd_db_test}`, (e, r) => {
        expect(r).toBeUndefined()
        expect(e && e.message).toMatch(/is reserved and cannot be uploaded/i)

        chinook.sendCommands(`UPLOAD ABORT`, (e, r) => {
          expect(e).toBeNull()
          expect(r).toEqual('OK')

          chinook.sendCommands(`UPLOAD DATABASE ${rsrvd_db_test}`, (e, r) => {
            expect(r).toBeUndefined()
            expect(e && e.message).toMatch(/is reserved and cannot be uploaded/i)

            chinook.sendCommands(`UNRESERVE DATABASE ${rsrvd_db_test} UUID`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toEqual('OK')

              chinook.sendCommands(`UPLOAD DATABASE ${rsrvd_db_test}`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe('OK')

                chinook.sendCommands(`UPLOAD ABORT`, test(done, chinook, true))
              })
            })
          })
        })
      })
    })
  })

  it(`should try multiple database transfers`, done => {
    const chinook = getConnection()
    const rsrvd_db_test = randomName()
    chinook.sendCommands(`TRANSFER DATABASE ${rsrvd_db_test}`, (e, r) => {
      expect(e).toBeNull()
      expect(r).toBe('OK')

      chinook.sendCommands(`TRANSFER DATABASE ${rsrvd_db_test} INTERNAL`, (e, r) => {
        expect(r).toBeUndefined()
        expect(e && e.message).toMatch(/another upload operation is in place/i)

        chinook.sendCommands(`UPLOAD ABORT`, (e, r) => {
          expect(e).toBeNull()
          expect(r).toEqual('OK')

          chinook.sendCommands(`TRANSFER DATABASE ${rsrvd_db_test} INTERNAL`, (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual('OK')

            chinook.sendCommands(`UPLOAD ABORT`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toEqual('OK')

              chinook.sendCommands(`TRANSFER DATABASE ${rsrvd_db_test} KEY ${rsrvd_db_test} INTERNAL`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe('OK')

                chinook.sendCommands(`UPLOAD ABORT`, test(done, chinook, true))
              })
            })
          })
        })
      })
    })
  })
})

describe('vm commands', () => {
  it(`should vm execute`, async () => {
    const chinook = getConnection()
    expect(await chinook.sql(`VM EXECUTE "SELECT * FROM artists"`)).toContainEqual({
      ArtistId: 3,
      Name: 'Aerosmith'
    })
    chinook.close()
  })

  it(`should vm compile`, async () => {
    const chinook = getConnection()
    const result = await chinook.sql(`VM COMPILE "SELECT * FROM artists"`)
    expect(result[0]).toBe(21)
    expect(result[7]).toBe(0)
    chinook.close()
  })
})
