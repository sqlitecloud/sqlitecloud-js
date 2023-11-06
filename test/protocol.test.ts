//
// index.ts

/* eslint-disable */

//var sqlitecloud = require('sqlitecloud')
//var sqlitecloud = require('sqlitecloud-nodejs-sdk')
//var sqlitecloud = require('sqlitecloud')

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

async function testSDK() {
  try {
    console.log('START TEST')
    const client = new sqlitecloud(configDev1, false)
    const connection = await client.connect()
    console.log(connection) //TOGLi
    /*
     TEST INTEGER
     TEST FLOAT
     TEST NULL
     
     TEST STRING
     TEST ZERO_STRING
     TEST STRING0
     
     TEST COMMAND
     TEST JSON
     TEST BLOB
     TEST BLOB0
     TEST ERROR
     TEST EXTERROR
     TEST ARRAY
     
     TEST ROWSET
     TEST ROWSET_CHUNK
     TEST ARRAY0 //NON FUNZIONA
    */
    let commandResponse = await client.sendCommands('TEST FLOAT')
    console.log(commandResponse)
    // const responseCompression = await client.sendCommands("SET CLIENT KEY COMPRESSION TO 1;");
    // const responseCommand = await client.sendCommands("USE DATABASE :memory:; select printf('%.*c', 50000, 'x') AS AAA");

    commandResponse = await client.sendCommands("USE DATABASE :memory:; select printf('%.*c', 10000000, 'x') AS DDD")
    console.log(commandResponse)

    commandResponse = await client.sendCommands('USE DATABASE chinook.sqlite;')
    console.log(commandResponse)

    commandResponse = await client.sendCommands('SELECT * FROM tracks UNION ALL SELECT * FROM tracks;')
    console.log(commandResponse)

    commandResponse = await client.sendCommands('USE DATABASE chinook.sqlite; SELECT * FROM tracks UNION ALL SELECT * FROM tracks;')
    console.log('---10 ', commandResponse)

    const version = commandResponse.version
    const numberOfRows = commandResponse.nRows
    const numberOfColumns = commandResponse.nCols
    console.log(`---10 version: ${version} numberOfRows: ${numberOfRows} x numberOfColumns: ${numberOfColumns}`)

    const dumped = commandResponse.dump()
    console.log('---10 dumped ', dumped)

    //    console.log(responseCommand2.dumped);
    //		responseCommand2.dump = responseCommand.dump();
    //   console.log(responseCommand2.dump);
  } catch (error) {
    console.error('--------error', error)
  }
}

//testSDK()

describe('protocol', () => {
  describe('connect', () => {
    it('should connect', async () => {
      const client = new sqlitecloud(configDev1, false)
      const connection = await client.connect()
      expect(connection).toBeDefined()
    })
  })

  describe('sendCommands', () => {
    let client: sqlitecloud
    let connection

    beforeEach(async () => {
      client = new sqlitecloud(configDev1, false)
      connection = await client.connect()
    })

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
      const commandResponse = await client.sendCommands('TEST BLOB')
      expect(commandResponse).toBe(3)
    })

    it('should test blob0', async () => {
      const commandResponse = await client.sendCommands('TEST BLOB0')
      expect(commandResponse).toBe(3)
    })

    it('should test error', async () => {
      await expect(client.sendCommands('TEST ERROR')).rejects.toThrow(/* expected error */)
    })

    it('should test exterror', async () => {
      await expect(client.sendCommands('TEST EXTERROR')).rejects.toThrow(/* expected extended error */)
    })

    it('should test array', async () => {
      const commandResponse = await client.sendCommands('TEST ARRAY')
      expect(commandResponse).toEqual(3)
    })

    it('should test rowset', async () => {
      const commandResponse = await client.sendCommands('TEST ROWSET')
      expect(commandResponse).toEqual(3)
    })

    it('should test rowset chunk', async () => {
      const commandResponse = await client.sendCommands('TEST ROWSET_CHUNK')
      expect(commandResponse).toEqual(3)
    })

    it('should test array0', async () => {
      const commandResponse = await client.sendCommands('TEST ARRAY0')
      expect(commandResponse).toEqual(3)
    })

    /*

TEST INTEGER
		 TEST FLOAT
		 TEST NULL
		 
		 TEST STRING
		 TEST ZERO_STRING
		 TEST STRING0
		 
		 TEST COMMAND
		 TEST JSON
		 TEST BLOB
		 TEST BLOB0
		 TEST ERROR
		 TEST EXTERROR
		 TEST ARRAY
		 
		 TEST ROWSET
		 TEST ROWSET_CHUNK
		 TEST ARRAY0 //NON FUNZIONA
     */

    it('should select long formatted string', async () => {
      let response = await client.sendCommands("USE DATABASE :memory:; select printf('%.*c', 1000, 'x') AS DDD")
      expect(response.nCols).toBe(1)
      expect(response.nRows).toBe(1)
      expect(response.version).toBe(1)
      const item = response.getItem(0, 0)
      expect(item).toBe(
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      )
    })

    it('should select database', async () => {
      let response = await client.sendCommands('USE DATABASE chinook.sqlite;')
      expect(response.nCols).toBeUndefined()
      expect(response.nRows).toBeUndefined()
      expect(response.version).toBeUndefined()
    })

    it('should select * from tracks', async () => {
      //      let response = await client.sendCommands('USE DATABASE chinook.sqlite;')

      let response = await client.sendCommands('USE DATABASE chinook.sqlite; ')
      //response = await client.sendCommands('SELECT * FROM tracks UNION ALL SELECT * FROM tracks;')
      response = await client.sendCommands('SELECT * FROM tracks;')

      //      let response = await client.sendCommands('USE DATABASE chinook.sqlite; SELECT * FROM tracks UNION ALL SELECT * FROM tracks;')
      expect(response.nCols).toBe(9)
      expect(response.nRows).toBe(7006)
      expect(response.version).toBe(1)

      console.log(response)

      response = await client.sendCommands('USE DATABASE chinook.sqlite; SELECT * FROM tracks UNION ALL SELECT * FROM tracks;')
      console.log('---10 ', response)

      const version = response.version
      const numberOfRows = response.nRows
      const numberOfColumns = response.nCols
      console.log(`---10 version: ${version} numberOfRows: ${numberOfRows} x numberOfColumns: ${numberOfColumns}`)

      const dumped = response.dump()
      console.log('---10 dumped ', dumped)
    })
  })
})
