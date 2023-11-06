/**
 * protocol.test.ts - test low level communication protocol
 */

/* eslint-disable */

// https://github.com/jest-community/vscode-jest/blob/master/README.md#autorun

// published library
// var sqlitecloud = require('sqlitecloud-nodejs-sdk')

// code being refactored:
import sqlitecloud from '../src/protocol'

const cert = `-----BEGIN CERTIFICATE-----
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

const configDev1 = {
  clientId: 'dev1.sqlitecloud.io',
  user: 'admin', //required unless connectionString is provided
  password: 'admin', //required unless connectionString is provided
  host: 'dev1.sqlitecloud.io', //required unless connectionString is provided
  port: 9960, //required unless connectionString is provided
  compression: true,
  queryTimeout: 10000000,
  tlsOptions: {
    ca: cert
  }
}

describe('protocol', () => {
  let client: sqlitecloud

  beforeEach(async () => {
    if (!client) {
      try {
        const connectingClient = new sqlitecloud(configDev1, true)
        expect(connectingClient).toBeDefined()

        let connection = await connectingClient.connect()
        expect(connection).toBe('OK')
        client = connectingClient
      } catch (error) {
        console.error(error)
        throw error
      }
    }
  })

  afterEach(async () => {
    if (client) {
      await client.disconnect()
      console.log('afterEach: client.disconnect() OK')
      // @ts-ignore
      client = undefined
    }
  })

  describe('connect', () => {
    it('should connect', async () => {
      // ...in beforeEach
    })
  })

  describe('send test commands', () => {
    it('should test integer', async () => {
      const commandResponse = await client.sendCommands('TEST INTEGER')
      expect(commandResponse).toBe(123456)
    })

    it('should test null', async () => {
      const commandResponse = await client.sendCommands('TEST NULL')
      expect(commandResponse).toBeNull()
    })

    it('should test float', async () => {
      const commandResponse = await client.sendCommands('TEST FLOAT')
      expect(commandResponse).toBe(3.1415926)
    })

    it('should test string', async () => {
      const commandResponse = await client.sendCommands('TEST STRING')
      expect(commandResponse).toBe('Hello World, this is a test string.')
    })

    it('should test zero string', async () => {
      const commandResponse = await client.sendCommands('TEST ZERO_STRING')
      expect(commandResponse).toBe('Hello World, this is a zero-terminated test string.')
    })

    it('should test string0', async () => {
      const commandResponse = await client.sendCommands('TEST STRING0')
      expect(commandResponse).toBe('')
    })

    it('should test command', async () => {
      const commandResponse = await client.sendCommands('TEST COMMAND')
      expect(commandResponse).toBe('PING')
    })

    it('should test json', async () => {
      const commandResponse = await client.sendCommands('TEST JSON')
      expect(commandResponse).toEqual({
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
      const response = await client.sendCommands('TEST BLOB')
      expect(typeof response).toBe('object')
      expect(response).toBeInstanceOf(Buffer)
      const bufferResponse = response as any as Buffer
      expect(bufferResponse.length).toBe(1000)
    })

    it('should test blob0', async () => {
      const response = await client.sendCommands('TEST BLOB0')
      expect(typeof response).toBe('object')
      expect(response).toBeInstanceOf(Buffer)
      const bufferResponse = response as any as Buffer
      expect(bufferResponse.length).toBe(0)
    })

    it('should test error', async () => {
      await expect(client.sendCommands('TEST ERROR')).rejects.toThrow(/* expected error */)
    })

    it('should test exterror', async () => {
      await expect(client.sendCommands('TEST EXTERROR')).rejects.toThrow(/* expected extended error */)
    })

    it('should test array', async () => {
      const response = await client.sendCommands('TEST ARRAY')
      expect(Array.isArray(response)).toBe(true)

      const arrayResponse = response as any as Array<any>
      expect(arrayResponse.length).toBe(5)
      expect(arrayResponse[0]).toBe('Hello World')
      expect(arrayResponse[1]).toBe(12345)
      expect(arrayResponse[2]).toBe(3.141)
      expect(arrayResponse[3]).toBeNull()
    })

    it('should test rowset', async () => {
      const response = await client.sendCommands('TEST ROWSET')
      expect(response.nRows).toBe(41)
      expect(response.nCols).toBe(2)
      expect(response.version).toBe(1)
      expect(response.colsName).toEqual(['key', 'value'])
    })
    /*
    it('should test rowset chunk', async () => {
      const response = await client.sendCommands('TEST ROWSET_CHUNK')
      expect(response.nCols).toBe(1)
      expect(response.nRows).toBe(147)
      expect(response.colsName).toEqual(['key'])
    })
*/
  })

  describe('send select commands', () => {
    it('should select long formatted string', async () => {
      let response = await client.sendCommands("USE DATABASE :memory:; select printf('%.*c', 1000, 'x') AS DDD")
      expect(response.nCols).toBe(1)
      expect(response.nRows).toBe(1)
      expect(response.version).toBe(1)

      const stringResponse = response.getItem(0, 0) as string
      expect(stringResponse.startsWith('xxxxxxxxxxxxx')).toBeTruthy()
      expect(stringResponse).toHaveLength(1000)
    })

    it('should select database', async () => {
      let response = await client.sendCommands('USE DATABASE chinook.sqlite;')
      expect(response.nCols).toBeUndefined()
      expect(response.nRows).toBeUndefined()
      expect(response.version).toBeUndefined()
    })

    it('should select * from tracks limit 10 (no chunks)', async () => {
      let response = await client.sendCommands('USE DATABASE chinook.sqlite;')
      response = await client.sendCommands('SELECT * FROM tracks LIMIT 10;')
      expect(response.nCols).toBe(9)
      expect(response.nRows).toBe(10)
    })

    it('should select * from tracks (with chunks)', async () => {
      let response = await client.sendCommands('USE DATABASE chinook.sqlite;')
      response = await client.sendCommands('SELECT * FROM tracks;')
      expect(response.nCols).toBe(9)
      expect(response.nRows).toBe(3503)
    })

    it('should select * from albums', async () => {
      let response = await client.sendCommands('USE DATABASE chinook.sqlite;')
      response = await client.sendCommands('SELECT * FROM albums;')
      expect(response.nCols).toBe(3)
      expect(response.nRows).toBe(347)
      // expect(response.version).toBe(1)

      const dumped = response.dump()
    })
  })
})
