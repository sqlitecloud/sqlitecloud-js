//
// utilities.test.ts
//

import { SQLiteCloudError } from '../src/index'
import { prepareSql, parseconnectionstring } from '../src/drivers/utilities'
import { getTestingDatabaseName } from './shared'

import { expect, describe, it } from '@jest/globals'

describe('prepareSql', () => {
  it('should replace single ? parameter', () => {
    const sql = prepareSql('SELECT * FROM users WHERE name = ?', 'John')
    expect(sql).toBe("SELECT * FROM users WHERE name = 'John'")
  })

  it('should replace multiple ? parameter', () => {
    const sql = prepareSql('SELECT * FROM users WHERE name = ? AND last_name = ?', 'John', 'Doe')
    expect(sql).toBe("SELECT * FROM users WHERE name = 'John' AND last_name = 'Doe'")
  })

  it('should replace multiple ? parameter passed as array', () => {
    const sql = prepareSql('SELECT * FROM users WHERE name = ? AND last_name = ?', ['John', 'Doe'])
    expect(sql).toBe("SELECT * FROM users WHERE name = 'John' AND last_name = 'Doe'")
  })

  it('should replace ?2 parameter with index key', () => {
    const sql = prepareSql('UPDATE tbl SET name = ?2 WHERE id = ?', [2, 'bar'])
    expect(sql).toBe("UPDATE tbl SET name = 'bar' WHERE id = 'bar'")
  })

  it('should replace ?5 parameter with index key in object', () => {
    // ?5 will resolve to key '5' in the object, ? will resolve to key '2'
    const sql = prepareSql('UPDATE tbl SET name = ?5 WHERE id = ?', { 2: 42, 5: 'bar' })
    expect(sql).toBe("UPDATE tbl SET name = 'bar' WHERE id = 42")
  })

  it("should replace string ? parameter containing ' character", () => {
    const sql = prepareSql('SELECT * FROM phone WHERE name = ?', "Jack's phone")
    expect(sql).toBe("SELECT * FROM phone WHERE name = 'Jack''s phone'")
  })

  it('should handle ? parameter with sql injection threat', () => {
    const sql = prepareSql('SELECT * FROM phone WHERE name = ?', "Jack's phone; DROP TABLE phone;")
    expect(sql).toBe("SELECT * FROM phone WHERE name = 'Jack''s phone; DROP TABLE phone;'")
  })

  it('should replace integer ? parameter', () => {
    const sql = prepareSql('SELECT * FROM users WHERE age < ?', 32)
    expect(sql).toBe('SELECT * FROM users WHERE age < 32')
  })

  it('should replace float ? parameter', () => {
    const sql = prepareSql('SELECT * FROM pies WHERE diameter < ?', Math.PI)
    expect(sql).toBe(`SELECT * FROM pies WHERE diameter < ${Math.PI}`)
  })

  it('should replace null ? parameter', () => {
    const sql = prepareSql('SELECT * FROM pies WHERE diameter = ?', null)
    expect(sql).toBe('SELECT * FROM pies WHERE diameter = NULL')
  })

  it('should replace json ? parameter', () => {
    const sql = prepareSql('update users set profile = ? WHERE id = ?', { first: 'John', last: 'Doe' }, 1)
    expect(sql).toBe('update users set profile = \'{"first":"John","last":"Doe"}\' WHERE id = 1')
  })

  it('should replace buffer ? parameter', () => {
    const buffer = Buffer.from('Hello World!')
    const sql = prepareSql('UPDATE users SET details = ? WHERE id = ?', buffer, 1)
    expect(sql).toBe("UPDATE users SET details = X'48656c6c6f20576f726c6421' WHERE id = 1")
  })

  it('should throw if ? parameter is missing', () => {
    expect(() => {
      prepareSql('SELECT * FROM users WHERE name = ? AND last_name = ?', 'John' /** missing last_name parameter */)
    }).toThrow(SQLiteCloudError)
  })

  it('should replace multiple $named parameters', () => {
    const sql = prepareSql('SELECT * FROM users WHERE first = $first AND last = $last', { $first: 'John', $last: 'Doe' })
    expect(sql).toBe("SELECT * FROM users WHERE first = 'John' AND last = 'Doe'")
  })

  it('should treat 0 as zero and not null', () => {
    const zero: number = 0
    const sql = prepareSql("SELECT ? AS 'number'", zero)
    expect(sql).toBe("SELECT 0 AS 'number'")
  })
})

describe('parseconnectionstring', () => {
  it('should parse connection string', () => {
    const connectionstring = 'sqlitecloud://user:password@host:1234/database?option1=xxx&option2=yyy'
    const config = parseconnectionstring(connectionstring)

    expect(config).toEqual({
      username: 'user',
      password: 'password',
      host: 'host',
      port: 1234,
      database: 'database',
      option1: 'xxx',
      option2: 'yyy'
    })
  })

  it('should parse connection string without database or options', () => {
    const connectionstring = 'sqlitecloud://user:password@host:1234'
    const config = parseconnectionstring(connectionstring)

    expect(config).toEqual({
      username: 'user',
      password: 'password',
      host: 'host',
      port: 1234
    })
  })

  it('should parse options regardless of case', () => {
    // NOTE: apiKey intentionally mixedCase here...
    const connectionstring1 = 'sqlitecloud://host?apiKey=xxx'
    const config1 = parseconnectionstring(connectionstring1)
    expect(config1).toEqual({
      host: 'host',
      apikey: 'xxx'
    })

    const connectionstring2 = 'sqlitecloud://host?apikey=yyy'
    const config2 = parseconnectionstring(connectionstring2)
    expect(config2).toEqual({
      host: 'host',
      apikey: 'yyy'
    })

    const connectionstring4 = 'sqlitecloud://host?apiKey=yyy&maxRows=42'
    const config4 = parseconnectionstring(connectionstring4)
    expect(config4).toEqual({
      host: 'host',
      apikey: 'yyy',
      maxrows: '42' // only parsing here, validation is later in validateConfiguration
    })
  })

  it('should parse connection string without port', () => {
    const connectionstring = 'sqlitecloud://user:password@host'
    const config = parseconnectionstring(connectionstring)

    expect(config).toEqual({
      username: 'user',
      password: 'password',
      host: 'host'
    })
  })

  it('should throw SQLiteCloudError if the connection string is invalid', () => {
    const connectionstring = 'not a valid url'

    expect(() => {
      parseconnectionstring(connectionstring)
    }).toThrow(SQLiteCloudError)
  })

  it('should handle connection strings without port', () => {
    const connectionstring = 'sqlitecloud://user:password@host/database?option1=xxx&option2=yyy'
    const result = parseconnectionstring(connectionstring)

    expect(result).toEqual({
      username: 'user',
      password: 'password',
      host: 'host',
      port: undefined,
      database: 'database',
      option1: 'xxx',
      option2: 'yyy'
    })
  })

  it('should handle connection strings without options', () => {
    const connectionstring = 'sqlitecloud://user:password@host:1234/database'
    const config = parseconnectionstring(connectionstring)

    expect(config).toEqual({
      username: 'user',
      password: 'password',
      host: 'host',
      port: 1234,
      database: 'database'
    })
  })

  it('should handle url encoded password', () => {
    const connectionstring = 'sqlitecloud://user:pass%25word@host:1234/database'
    const config = parseconnectionstring(connectionstring)

    expect(config).toEqual({
      username: 'user',
      password: 'pass%word',
      host: 'host',
      port: 1234,
      database: 'database'
    })
  })

  it('should parse connection with api key', () => {
    const apikey = 'mIiLARzKm9XBVllbAzkB1wqrgijJ3Gx0X5z1Agm3xBo'
    const connectionstring = `sqlitecloud://host:1234/database?apikey=${apikey}`
    const config = parseconnectionstring(connectionstring)

    expect(config.apikey).toBe(apikey)
    expect(config.username).toBeUndefined()
    expect(config.password).toBeUndefined()
    expect(config.password_hashed).toBeUndefined()

    expect(config).toEqual({
      apikey,
      host: 'host',
      port: 1234,
      database: 'database'
    })
  })
})

describe('getTestingDatabaseName', () => {
  it('should generate readable database names', () => {
    const database = getTestingDatabaseName('benchkmark')
    expect(database).toBeTruthy()
  })
})
