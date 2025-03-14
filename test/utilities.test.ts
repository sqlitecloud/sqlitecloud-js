//
// utilities.test.ts
//

import { SQLiteCloudError } from '../src/index'
import { parseconnectionstring, sanitizeSQLiteIdentifier } from '../src/drivers/utilities'
import { getTestingDatabaseName } from './shared'

import { expect, describe, it } from '@jest/globals'

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
      maxrows: 42 // only parsing here, validation is later in validateConfiguration
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

  it('should parse connection with insecure as bool or number', () => {
    let connectionstring = `sqlitecloud://host:1234/database?insecure=true`
    let config = parseconnectionstring(connectionstring)

    expect(config.insecure).toBe(true)

    connectionstring = `sqlitecloud://host:1234/database?insecure=1`
    config = parseconnectionstring(connectionstring)

    expect(config.insecure).toBe(true)

    connectionstring = `sqlitecloud://host:1234/database?insecure=0`
    config = parseconnectionstring(connectionstring)

    expect(config.insecure).toBe(false)
  })

  it('should parse connection with timeout as number', () => {
    let connectionstring = `sqlitecloud://host:1234/database?timeout=123`
    let config = parseconnectionstring(connectionstring)

    expect(config.timeout).toBe(123)
  })
})

describe('getTestingDatabaseName', () => {
  it('should generate readable database names', () => {
    const database = getTestingDatabaseName('benchkmark')
    expect(database).toBeTruthy()
  })
})

describe('sanitizeSQLiteIdentifier()', () => {
  it('should trim and escape valid identifier', () => {
    const identifier = '  valid_identifier  '
    const sanitized = sanitizeSQLiteIdentifier(identifier)
    expect(sanitized).toBe('"valid_identifier"')
  })

  it('valid indentifier', () => {
    const identifier = "a_colName1"
    const sanitized = sanitizeSQLiteIdentifier(identifier)
    expect(sanitized).toBe('"a_colName1"')
  })

  it('should double quotes for sql injection', () => {
    const identifier = ' chinook.sql; DROP TABLE "albums" '
    const sanitized = sanitizeSQLiteIdentifier(identifier)
    expect(sanitized).toBe('"chinook.sql; DROP TABLE \"\"albums\"\""')
  })
})
