//
// utilities.test.ts
//

import { SQLiteCloudError } from '../src/index'
import {
  decodeBigIntMarkers,
  encodeBigIntMarkers,
  getInitializationCommands,
  parseconnectionstring,
  parseSafeIntegerMode,
  sanitizeSQLiteIdentifier,
  validateConfiguration
} from '../src/drivers/utilities'
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

  it('should parse connection with safe integer mode', () => {
    const connectionstring = `sqlitecloud://host:1234/database?apikey=xxx&safe_integer_mode=bigint`
    const config = parseconnectionstring(connectionstring)

    expect(config.safe_integer_mode).toBe('bigint')
  })

  it('should parse websocket blob transport options', () => {
    const connectionstring = `sqlitecloud://host:1234/database?apikey=xxx&websocket_blob_format=socketio-blobs-v1&websocket_max_attachments=123`
    const config = parseconnectionstring(connectionstring)

    expect(config.websocketBlobFormat).toBe('socketio-blobs-v1')
    expect(config.websocketMaxAttachments).toBe(123)
  })

  it('expect error when both user/pass and api key are set', () => {
    const connectionstring = 'sqlitecloud://user:password@host:1234/database?apikey=yyy'
    expect(() => parseconnectionstring(connectionstring)).toThrowError('Choose between apikey, token or username/password')
  })

  it('expect error when both user/pass and token are set', () => {
    const connectionstring = 'sqlitecloud://user:password@host:1234/database?token=yyy'
    expect(() => parseconnectionstring(connectionstring)).toThrowError('Choose between apikey, token or username/password')
  })

  it('expect error when both apikey and token are set', () => {
    const connectionstring = 'sqlitecloud://host:1234/database?apikey=xxx&token=yyy'
    expect(() => parseconnectionstring(connectionstring)).toThrowError('Choose between apikey, token or username/password')
  })
})

describe('validateConfiguration()', () => {
  it('should use safe integer mode from config', () => {
    const config = validateConfiguration({
      username: 'user',
      password: 'password',
      host: 'host',
      safe_integer_mode: 'mixed'
    })

    expect(config.safe_integer_mode).toBe('mixed')
  })

  it('should use safe integer mode from config when connection string is provided', () => {
    const connectionstring = 'sqlitecloud://host:1234/database?apikey=xxx'
    const config = validateConfiguration({
      connectionstring,
      safe_integer_mode: 'mixed'
    })

    expect(config.safe_integer_mode).toBe('mixed')
    expect(config.connectionstring).toBe(connectionstring)
  })

  it('should use safe integer mode from connection string params', () => {
    const config = validateConfiguration({
      connectionstring: 'sqlitecloud://host:1234/database?apikey=xxx&safe_integer_mode=bigint'
    })

    expect(config.safe_integer_mode).toBe('bigint')
  })

  it('should prefer config safe integer mode over connection string params', () => {
    const config = validateConfiguration({
      connectionstring: 'sqlitecloud://host:1234/database?apikey=xxx&safe_integer_mode=bigint',
      safe_integer_mode: 'mixed'
    })

    expect(config.safe_integer_mode).toBe('mixed')
  })

  it('should prefer all explicit config values over connection string params', () => {
    const config = validateConfiguration({
      connectionstring: 'sqlitecloud://host:1234/database?apikey=xxx&timeout=123&insecure=1&maxrows=42',
      timeout: 456,
      insecure: false,
      maxrows: 84
    })

    expect(config.timeout).toBe(456)
    expect(config.insecure).toBe(false)
    expect(config.maxrows).toBe(84)
  })

  it('should default websocket blob transport config for new clients', () => {
    const config = validateConfiguration({
      connectionstring: 'sqlitecloud://host:1234/database?apikey=xxx'
    })

    expect(config.websocketBlobFormat).toBe('base64-blobs-v1')
    expect(config.websocketMaxAttachments).toBe(100000)
  })

  it('should allow unauthenticated configuration without credentials', () => {
    const config = validateConfiguration({
      host: 'host',
      unauthenticated: true
    })

    expect(config.host).toBe('host')
    expect(config.unauthenticated).toBe(true)
    expect(config.connectionstring).toBeUndefined()
  })

  it('should parse unauthenticated from connection string params', () => {
    const config = validateConfiguration({
      connectionstring: 'sqlitecloud://host:1234?unauthenticated=1'
    })

    expect(config.host).toBe('host')
    expect(config.unauthenticated).toBe(true)
  })
})

describe('safe integer marker utilities', () => {
  it('should parse safe integer mode', () => {
    expect(parseSafeIntegerMode('bigint')).toBe('bigint')
    expect(parseSafeIntegerMode('mixed')).toBe('mixed')
    expect(parseSafeIntegerMode('number')).toBe('number')
    expect(parseSafeIntegerMode('invalid')).toBe('number')
  })

  it('should encode bigint values as marker strings', () => {
    expect(encodeBigIntMarkers({ id: BigInt('9223372036854775807'), values: [1, BigInt(2)] })).toEqual({
      id: '9223372036854775807n',
      values: [1, '2n']
    })
  })

  it('should decode bigint markers only in lossless modes', () => {
    expect(decodeBigIntMarkers('9223372036854775807n', 'bigint')).toBe(BigInt('9223372036854775807'))
    expect(decodeBigIntMarkers({ id: '9223372036854775807n' }, 'mixed')).toEqual({ id: BigInt('9223372036854775807') })
    expect(decodeBigIntMarkers('9223372036854775807n', 'number')).toBe('9223372036854775807n')
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
    const identifier = 'a_colName1'
    const sanitized = sanitizeSQLiteIdentifier(identifier)
    expect(sanitized).toBe('"a_colName1"')
  })

  it('should double quotes for sql injection', () => {
    const identifier = ' chinook.sql; DROP TABLE "albums" '
    const sanitized = sanitizeSQLiteIdentifier(identifier)
    expect(sanitized).toBe('"chinook.sql; DROP TABLE \"\"albums\"\""')
  })
})

describe('getInitializationCommands()', () => {
  it('should return commands with auth token command', () => {
    const config = {
      token: 'mytoken',
      database: 'mydb'
    }

    const result = getInitializationCommands(config)

    expect(result).toContain('AUTH TOKEN mytoken;')
    expect(result).not.toContain('AUTH APIKEY')
  })

  it('should keep existing authenticated initialization behavior', () => {
    const config = {
      username: 'admin',
      password: 'secret',
      database: 'mydb',
      compression: true,
      non_linearizable: true
    }

    const result = getInitializationCommands(config)

    expect(result).toBe('SET CLIENT KEY NONLINEARIZABLE TO 1;AUTH USER admin PASSWORD secret;SET CLIENT KEY COMPRESSION TO 1;USE DATABASE mydb;')
  })

  it('should omit auth and database commands for unauthenticated initialization', () => {
    const config = {
      host: 'host',
      database: 'mydb',
      unauthenticated: true,
      compression: true,
      non_linearizable: true,
      noblob: true,
      maxdata: 128,
      maxrows: 256,
      maxrowset: 512
    }

    const result = getInitializationCommands(config)

    expect(result).toBe(
      'SET CLIENT KEY NONLINEARIZABLE TO 1;SET CLIENT KEY COMPRESSION TO 1;SET CLIENT KEY NOBLOB TO 1;SET CLIENT KEY MAXDATA TO 128;SET CLIENT KEY MAXROWS TO 256;SET CLIENT KEY MAXROWSET TO 512;'
    )
    expect(result).not.toContain('AUTH ')
    expect(result).not.toContain('USE DATABASE')
    expect(result).not.toContain('CREATE DATABASE')
  })
})
