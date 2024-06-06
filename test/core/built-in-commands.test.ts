/**
 * built-in-commands.test.ts - test sqlitecloud built-in commands
 */

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
const bool = () => expect.any(Number)
const colseq = () => expect.stringMatching(/^(BINARY|RTRIM|NOCASE)$/)
const screaming_snake_case = () => expect.stringMatching(/^[A-Z]+[_]*[A-Z]*$/)

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
                /(not found|doesn\'t exist|does not exist|invalid|unable|fail|cannot|must be unique|unknown|undefined|error|no such|not available|try again later|wrong)/i
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
  ['admin', randomName(), randomDate(), true],
  ['admin', randomName(), 'WRONG_DATE', false],
  ['NOT_EXIST', randomName(), randomDate(), false],
  ['admin', '', randomDate(), false]
])('api key', (username, keyName, expiration, ok) => {
  let key: string

  it(`should${ok ? '' : "n't"} create`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE APIKEY USER ${username} NAME ${keyName} EXPIRATION "${expiration}"`,
      test(done, chinook, ok, /^[a-zA-Z0-9]{43}$/, (res: string) => (key = res))
    )
  })

  it(`should${ok ? '' : "n't"} list created`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST APIKEYS USER ${username} ${username == 'admin' ? '; LIST MY APIKEYS' : ''}`,
      test(done, chinook, ok, { creation_date: date(), expiration_date: expiration, key: key, name: keyName })
    )
  })

  it(`should${ok ? '' : "n't"} rename`, done => {
    const prevKeyName = keyName
    keyName = randomName()
    const prevExpiration = expiration
    expiration = randomDate()
    const chinook = getConnection()
    chinook.sendCommands(
      `SET APIKEY ${key} NAME ${keyName} EXPIRATION "${expiration}"; LIST APIKEYS USER ${username}`,
      test(done, chinook, false, { creation_date: date(), expiration_date: prevExpiration, key: key, name: prevKeyName })
    )
  })

  it(`should${ok ? '' : "n't"} list renamed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST APIKEYS USER ${username} ${username == 'admin' ? '; LIST MY APIKEYS' : ''}`,
      test(done, chinook, ok, { creation_date: date(), expiration_date: expiration, key: key, name: keyName })
    )
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE APIKEY ${key}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST APIKEYS USER ${username} ${username == 'admin' ? '; LIST MY APIKEYS' : ''}`,
      test(done, chinook, false, { creation_date: date(), expiration_date: expiration, key: key, name: keyName })
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
        node: leader ? parseconnectionstring(CHINOOK_DATABASE_URL).host + ':' + parseconnectionstring(CHINOOK_DATABASE_URL).port : expect.any(String),
        cluster: leader ? parseconnectionstring(CHINOOK_DATABASE_URL).host + ':9860' : expect.any(String),
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
  [randomName(), randomName(), 'READ', 'chinook.sqlite', 'artists', true],
  [randomName(), randomName(), '', '', '', true],
  [randomName(), randomName(), 'READ', '', '', true],
  [randomName(), randomName(), 'NOT_EXIST', '', '', false],
  [randomName(), randomName(), '', 'chinook.sqlite', 'artists', true]
  //[randomName(), randomName(), 'READ', 'NOT_EXIST', '', false],
  //[randomName(), randomName(), 'READ', '', 'NOT_EXIST', false] core not checking if database or table exists
])('user', (username, password, role, database, table, ok) => {
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

  /* it.skip(`should set my password`, done => { //TOFIX?? is it normal that I can't auth right after changing my pass?
    let chinook = getConnection()
    const myPassword = randomName()
    chinook.sendCommands(`SET MY PASSWORD adminpasswordxxx`, (error: Error | null, results: any) => {
      try {
        expect(error).toBeNull()
        expect(results).toBe('OK')
        //chinook.close()
        chinook = new SQLiteCloudTlsConnection(
          { connectionstring: CHINOOK_DATABASE_URL.replace(parseconnectionstring(CHINOOK_DATABASE_URL).password ?? 'defaultPassword', myPassword) },
          error => {
            if (error) {
              console.error(`getChinookTlsConnection - returned error: ${error}`)
            }
            expect(error).toBeNull()
          }
        )
        chinook.sendCommands(`SET MY PASSWORD ${parseconnectionstring(CHINOOK_DATABASE_URL).password}`, (error: Error | null, results: any) => {
          expect(error).toBeNull()
          expect(results).toBe('OK')
          done()
        })
      } catch (error) {
        done(error)
      } finally {
        chinook.close()
      }
    })
  }) */
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

  /* it(`should${ok ? '' : "n't"} listen`, done => { //ERROR Data type: | is not defined in SCSP, it isn't supported yet
    const chinook = getConnection()
    chinook.sendCommands(`LISTEN ${name}`, test(done, chinook, ok))
  })
  it(`should${ok ? '' : "n't"} listen table`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LISTEN TABLE ${table} ${database ? `DATABASE ${database}` : ''}`, test(done, chinook, ok))
  }) */

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

  it(`should${ok ? '' : "n't"} disable and list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DISABLE DATABASE ${database}; LIST DATABASES`, test(done, chinook, false, { name: database }))
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
        status: expect.any(Number)
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
        status: expect.any(Number)
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
        status: expect.any(Number)
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
})
