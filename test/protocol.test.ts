/**
 * protocol.test.ts - test low level communication protocol
 */

import { SQLiteCloudConfig } from '../src/types/sqlitecloudconfig'
import { SQLiteCloudConnection, SQLiteCloudError, parseConnectionString } from '../src/protocol'

import * as dotenv from 'dotenv'
dotenv.config()

export const DATABASE_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIID6zCCAtOgAwIBAgIUI0lTm5CfVf3mVP8606CkophcyB4wDQYJKoZIhvcNAQEL
BQAwgYQxCzAJBgNVBAYTAklUMQswCQYDVQQIDAJNTjEQMA4GA1UEBwwHVmlhZGFu
YTEbMBkGA1UECgwSU1FMaXRlIENsb3VkLCBJbmMuMRQwEgYDVQQDDAtTUUxpdGVD
bG91ZDEjMCEGCSqGSIb3DQEJARYUbWFyY29Ac3FsaXRlY2xvdWQuaW8wHhcNMjEw
ODI1MTAwMTI0WhcNMzEwODIzMTAwMTI0WjCBhDELMAkGA1UEBhMCSVQxCzAJBgNV
BAgMAk1OMRAwDgYDVQQHDAdWaWFkYW5hMRswGQYDVQQKDBJTUUxpdGUgQ2xvdWQs
IEluYy4xFDASBgNVBAMMC1NRTGl0ZUNsb3VkMSMwIQYJKoZIhvcNAQkBFhRtYXJj
b0BzcWxpdGVjbG91ZC5pbzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
ALnqTqnKgXadcZb4bkHWIrF7BEaPzS8ADUMvrmlP4hVOwg6x4rw33aSTfcXSf6/U
6HzqUgW7lu/Qg/O1WyvdTyseCRbopysPLfU3Hg2bOpcP7ZmgsB3xmPm0tXB/QNvb
sHbMGOGvWVKNCTPuemBuMVLAYNyEC5DWAxOG7IVz+arK2/+QeBH0+PLstVTSvUVy
eu1dacjx9kPEWO0gEwgxyYAeTmgYMRSEcicLF7egxoSS2kzUOLyMkWeV92tP+mzC
NKGgQoG4WnSrsE9ZcY3MiIdb0EnN+nR0VOBFejsTyJm7A+Ab6edEuvNmUTbraKJL
jRKZzUt1r4x3GC+j+UVCQp0CAwEAAaNTMFEwHQYDVR0OBBYEFPGRk8InGXhigfm4
teCLDtYSGu7XMB8GA1UdIwQYMBaAFPGRk8InGXhigfm4teCLDtYSGu7XMA8GA1Ud
EwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAGPk14p4H6vtJsZdgY2sVS2G
T8Ir4ukue79zRFAoCYfkfSW1A+uZbOK/YIjC1CetMXIde1SGvIMcoo1NjrKiqLls
srUN9SmmLihVzurtnoC5ScoUdRQtae8NBWXJnObxK7uXGBYamfs/x0nq1j7DV6Qc
TkuTmJvkcWGcJ9fBOzHgzi+dV+7Y98LP48Pyj/mAzI2icw+I5+DMzn2IktzFf0G7
Sjox3HYOoj2uG2669CLAnw6rkHESbi5imasC9FxWBVxWrnNd0icyiDb1wfBc5W9N
otHL5/wB1MaAmCIcQjIxEshj8pSYTecthitmrneimikFf4KFK0YMvGgKrCLmJsg=
-----END CERTIFICATE-----`

export const testConfig: SQLiteCloudConfig = {
  clientId: 'test',
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOSTNAME,
  database: process.env.DATABASE_DATABASE || 'chinook.sqlite',
  port: (process.env.DATABASE_PORT || 9960) as number,
  compression: true,
  timeout: 100 * 1000,
  tlsOptions: {
    ca: DATABASE_CERTIFICATE
  }
}

describe('protocol', () => {
  let connection: SQLiteCloudConnection

  beforeEach(async () => {
    expect(process.env.DATABASE_USERNAME).toBeDefined()
    expect(process.env.DATABASE_PASSWORD).toBeDefined()
    expect(process.env.DATABASE_HOSTNAME).toBeDefined()

    if (!connection) {
      try {
        const connecting = new SQLiteCloudConnection(testConfig)
        expect(connecting).toBeDefined()
        connecting.verbose()

        await connecting.connect()
        connection = connecting
      } catch (error) {
        console.error(error)
        throw error
      }
    }
  })

  afterEach(async () => {
    if (connection) {
      await connection.close()
      // @ts-ignore
      connection = undefined
    }
  })

  describe('connect', () => {
    it('should connect', async () => {
      // ...in beforeEach
    })

    it('should connect with connection string', async () => {
      const connectionString = `sqlitecloud://${testConfig.username as string}:${testConfig.password as string}@${testConfig.host as string}`
      const connection = new SQLiteCloudConnection({
        connectionString,
        tlsOptions: {
          ca: DATABASE_CERTIFICATE
        }
      })

      expect(connection).toBeDefined()
      await connection.connect()
      expect(connection.connected).toBe(true)
      await connection.close()
      expect(connection.connected).toBe(false)
    })

    it('should throw when connection string lacks credentials', async () => {
      try {
        const connectionString = `sqlitecloud://${testConfig.host as string}`
        const connection = new SQLiteCloudConnection({
          connectionString,
          tlsOptions: {
            ca: DATABASE_CERTIFICATE
          }
        })

        expect(connection).toBeDefined()
        await connection.connect()
        // fail the test if the error is not thrown
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)
        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('The user, password and host arguments must be specified.')
        expect(sqliteCloudError.errorCode).toBe('ERR_MISSING_ARGS')
        expect(sqliteCloudError.externalErrorCode).toBeUndefined()
        expect(sqliteCloudError.offsetCode).toBeUndefined()
      }
    })
  })

  describe('send test commands', () => {
    it('should test integer', async () => {
      const rowset = await connection.sendCommands('TEST INTEGER')
      expect(rowset).toBe(123456)
    })

    it('should test null', async () => {
      const rowset = await connection.sendCommands('TEST NULL')
      expect(rowset).toBeNull()
    })

    it('should test float', async () => {
      const rowset = await connection.sendCommands('TEST FLOAT')
      expect(rowset).toBe(3.1415926)
    })

    it('should test string', async () => {
      const rowset = await connection.sendCommands('TEST STRING')
      expect(rowset).toBe('Hello World, this is a test string.')
    })

    it('should test zero string', async () => {
      const rowset = await connection.sendCommands('TEST ZERO_STRING')
      expect(rowset).toBe('Hello World, this is a zero-terminated test string.')
    })

    it('should test string0', async () => {
      const rowset = await connection.sendCommands('TEST STRING0')
      expect(rowset).toBe('')
    })

    it('should test command', async () => {
      const rowset = await connection.sendCommands('TEST COMMAND')
      expect(rowset).toBe('PING')
    })

    it('should test json', async () => {
      const rowset = await connection.sendCommands('TEST JSON')
      expect(rowset).toEqual({
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

    it('should test blob', async () => {
      const rowset = await connection.sendCommands('TEST BLOB')
      expect(typeof rowset).toBe('object')
      expect(rowset).toBeInstanceOf(Buffer)
      const bufferrowset = rowset as any as Buffer
      expect(bufferrowset.length).toBe(1000)
    })

    it('should test blob0', async () => {
      const rowset = await connection.sendCommands('TEST BLOB0')
      expect(typeof rowset).toBe('object')
      expect(rowset).toBeInstanceOf(Buffer)
      const bufferrowset = rowset as any as Buffer
      expect(bufferrowset.length).toBe(0)
    })

    it('should test error', async () => {
      await expect(connection.sendCommands('TEST ERROR')).rejects.toThrow(/* expected error */)
    })

    it('should test exterror', async () => {
      try {
        await connection.sendCommands('TEST EXTERROR')
        // Fail the test if the error is not thrown
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(SQLiteCloudError)

        const sqliteCloudError = error as SQLiteCloudError
        expect(sqliteCloudError.message).toBe('This is a test error message with an extcode and a devil error code.')
        expect(sqliteCloudError.errorCode).toBe('66666')
        expect(sqliteCloudError.externalErrorCode).toBe('333')
        expect(sqliteCloudError.offsetCode).toBe(-1)
      }
    })

    it('should test array', async () => {
      const rowset = await connection.sendCommands('TEST ARRAY')
      expect(Array.isArray(rowset)).toBe(true)

      const arrayrowset = rowset as any as Array<any>
      expect(arrayrowset.length).toBe(5)
      expect(arrayrowset[0]).toBe('Hello World')
      expect(arrayrowset[1]).toBe(12345)
      expect(arrayrowset[2]).toBe(3.141)
      expect(arrayrowset[3]).toBeNull()
    })

    it('should test rowset', async () => {
      const rowset = await connection.sendCommands('TEST ROWSET')
      expect(rowset.numberOfRows).toBe(41)
      expect(rowset.numberOfColumns).toBe(2)
      expect(rowset.version).toBe(1)
      expect(rowset.columnsNames).toEqual(['key', 'value'])
    })

    it(
      'should test rowset chunks',
      async () => {
        const rowset = await connection.sendCommands('TEST ROWSET_CHUNK')
        expect(rowset.numberOfRows).toBe(147)
        expect(rowset.numberOfColumns).toBe(1)
        expect(rowset.columnsNames).toEqual(['key'])
      },
      30 * 1000 // long timeout
    )

    it('should dump results', async () => {
      let rowset = await connection.sendCommands('USE DATABASE chinook.sqlite;')
      rowset = await connection.sendCommands('SELECT * FROM tracks LIMIT 3;')
      const dumped = rowset.dump()
      expect(dumped.toString()).toBe(
        '         |NaN |For Those About To Rock (We Salute You) |NaN |NaN |NaN |Angus Young, Malcolm Young, Brian Johnson |34371 |1117033 |0.9 |,         |NaN |Balls to the Wall |NaN |NaN |NaN |null |34256 |551042 |0.9 |,         |NaN |Fast As a Shark |NaN |NaN |NaN |F. Baltes, S. Kaufman, U. Dirkscneider & W. Hoffman |23061 |399099 |0.9 |'
      )
    })
  })

  describe('send select commands', () => {
    it('should select long formatted string', async () => {
      const rowset = await connection.sendCommands("USE DATABASE :memory:; select printf('%.*c', 1000, 'x') AS DDD")
      expect(rowset.numberOfColumns).toBe(1)
      expect(rowset.numberOfRows).toBe(1)
      expect(rowset.version).toBe(1)

      const stringrowset = rowset.getItem(0, 0) as string
      expect(stringrowset.startsWith('xxxxxxxxxxxxx')).toBeTruthy()
      expect(stringrowset).toHaveLength(1000)
    })

    it('should select database', async () => {
      const rowset = await connection.sendCommands('USE DATABASE chinook.sqlite;')
      expect(rowset.numberOfColumns).toBeUndefined()
      expect(rowset.numberOfRows).toBeUndefined()
      expect(rowset.version).toBeUndefined()
    })

    it('should select * from tracks limit 10 (no chunks)', async () => {
      let rowset = await connection.sendCommands('USE DATABASE chinook.sqlite;')
      rowset = await connection.sendCommands('SELECT * FROM tracks LIMIT 10;')
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(10)
    })

    it('should select * from tracks (with chunks)', async () => {
      let rowset = await connection.sendCommands('USE DATABASE chinook.sqlite;')
      rowset = await connection.sendCommands('SELECT * FROM tracks;')
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(3503)
    })

    it('should select * from albums', async () => {
      let rowset = await connection.sendCommands('USE DATABASE chinook.sqlite;')
      rowset = await connection.sendCommands('SELECT * FROM albums;')
      expect(rowset.numberOfColumns).toBe(3)
      expect(rowset.numberOfRows).toBe(347)
      expect(rowset.version).toBe(1)
    })
  })
})

describe('parseConnectionString', () => {
  it('should parse connection string', () => {
    const connectionString = 'sqlitecloud://user:password@host:1234/database?option1=xxx&option2=yyy'
    const config = parseConnectionString(connectionString)

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

  it('should throw SQLiteCloudError if the connection string is invalid', () => {
    const connectionString = 'not a valid url'

    expect(() => {
      parseConnectionString(connectionString)
    }).toThrow(SQLiteCloudError)
  })

  it('should handle connection strings without port', () => {
    const connectionString = 'sqlitecloud://user:password@host/database?option1=xxx&option2=yyy'
    const result = parseConnectionString(connectionString)

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
    const connectionString = 'sqlitecloud://user:password@host:1234/database'
    const config = parseConnectionString(connectionString)

    expect(config).toEqual({
      username: 'user',
      password: 'password',
      host: 'host',
      port: 1234,
      database: 'database'
    })
  })
})
