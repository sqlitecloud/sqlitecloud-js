//
// shared.ts - utility methods for tests
//

import { join } from 'path'
import { readFileSync } from 'fs'
import { Database } from '../src/drivers/database'
import { ResultsCallback, SQLiteCloudConfig, SQLiteCloudError } from '../src/drivers/types'
import { parseconnectionstring } from '../src/drivers/utilities'

import { SQLiteCloudTlsConnection } from '../src/drivers/connection-tls'
import { SQLiteCloudWebsocketConnection } from '../src/drivers/connection-ws'

import { SQLiteCloudConnection, SQLiteCloudRowset } from '../src'
import { expect } from '@jest/globals'
import * as dotenv from 'dotenv'
dotenv.config()

export const LONG_TIMEOUT = 1 * 60 * 1000 // 1 minute
export const EXTRA_LONG_TIMEOUT = 15 * 60 * 1000 // 15 minutes

/** Will warn if a query or other basic operation is slower than this */
export const WARN_SPEED_MS = 500
/** Will except queries to be quicker than this */
export const EXPECT_SPEED_MS = 6 * 1000

/** Number of times or size of stress (when repeated in sequence) */
export const SEQUENCE_TEST_SIZE = 150
/** Concurrency size for multiple connection tests */
export const SIMULTANEOUS_TEST_SIZE = 150

/** Testing database from .env file */
export const CHINOOK_DATABASE_URL = process.env.CHINOOK_DATABASE_URL as string
if (!CHINOOK_DATABASE_URL || CHINOOK_DATABASE_URL.indexOf('/chinook.sqlite') === -1) {
  throw new Error('CHINOOK_DATABASE_URL is not defined in .env file or is not a valid chinook.sqlite url')
}

// API key for chinook database used to test API key authentication
export const CHINOOK_API_KEY = process.env.CHINOOK_API_KEY as string

export const GATEWAY_URL = process.env.GATEWAY_URL as string
expect(CHINOOK_DATABASE_URL).toBeDefined()
expect(GATEWAY_URL).toBeDefined()

/** Url to insecure database used for testing */
export const INSECURE_DATABASE_URL = process.env.INSECURE_DATABASE_URL as string

export const SELF_SIGNED_CERTIFICATE = `-----BEGIN CERTIFICATE-----
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

//
// chinook - read only database
//

export const CHINOOK_DATABASE_FILE = join(__dirname, 'assets/chinook.sqlite')

export const CHINOOK_FIRST_TRACK = {
  AlbumId: 1,
  Bytes: 11170334,
  Composer: 'Angus Young, Malcolm Young, Brian Johnson',
  GenreId: 1,
  MediaTypeId: 1,
  Milliseconds: 343719,
  Name: 'For Those About To Rock (We Salute You)',
  TrackId: 1,
  UnitPrice: 0.99
}

export function getChinookConfig(url = CHINOOK_DATABASE_URL, extraConfig?: Partial<SQLiteCloudConfig>): SQLiteCloudConfig {
  let chinookConfig = parseconnectionstring(url)
  if (chinookConfig.host === 'localhost' && chinookConfig.tlsoptions === undefined) {
    chinookConfig.tlsoptions = {
      ca: SELF_SIGNED_CERTIFICATE
    }
  }
  chinookConfig.timeout = 10 * 1000 // 10 seconds
  if (extraConfig) {
    chinookConfig = { ...chinookConfig, ...extraConfig }
  }
  return chinookConfig
}

/** Returns a test connection url with an api key  */
export function getChinookApiKeyUrl(): string {
  const chinookConfig = getChinookConfig(CHINOOK_DATABASE_URL)
  if (!CHINOOK_API_KEY) {
    throw new Error('CHINOOK_API_KEY is not defined in .env file')
  }
  return `sqlitecloud://${chinookConfig.host}:${chinookConfig.port}/${chinookConfig.database || ''}?apikey=${CHINOOK_API_KEY}`
}

/** Returns connection to chinook via websocket gateway */
export function getChinookWebsocketConnection(callback?: ResultsCallback, extraConfig?: Partial<SQLiteCloudConfig>): SQLiteCloudConnection {
  let chinookConfig = getChinookConfig(CHINOOK_DATABASE_URL, extraConfig)
  chinookConfig = {
    ...chinookConfig,
    usewebsocket: true,
    gatewayurl: GATEWAY_URL
  }
  const chinookConnection = new SQLiteCloudWebsocketConnection(chinookConfig, callback)
  return chinookConnection
}

export function getChinookTlsConnection(callback?: ResultsCallback, extraConfig?: Partial<SQLiteCloudConfig>): SQLiteCloudConnection {
  const chinookConfig = getChinookConfig(CHINOOK_DATABASE_URL, extraConfig)
  return new SQLiteCloudTlsConnection(chinookConfig, callback)
}

/** Returns a chinook.db connection, caller is responsible for closing the database */
export function getChinookDatabase(callback?: ResultsCallback, extraConfig?: Partial<SQLiteCloudConfig>): Database {
  const chinookConfig = getChinookConfig(CHINOOK_DATABASE_URL, extraConfig)
  return new Database(chinookConfig, callback)
}

//
// testing-xxx.db - read/write database
//

/** SQL used to setup testing database with some data */
export const TESTING_SQL = readFileSync(join(__dirname, 'assets/testing.sql'), 'utf8')

export function getTestingDatabaseName(prefix: string) {
  // create a unique id for this test run based on current time with
  // enough precision to avoid duplicate ids and be human readable
  function generateRandomId(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let randomId = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      randomId += characters.charAt(randomIndex)
    }
    return randomId
  }

  const date = new Date()
    .toISOString()
    .replace(/-|:|T|Z|\./g, '')
    .toLowerCase()

  return `${prefix}-${date.slice(0, 8)}-${date.slice(8, 12)}z-${generateRandomId(4).toLowerCase()}.sqlite`
}

export function getTestingConfig(url = CHINOOK_DATABASE_URL): SQLiteCloudConfig {
  const testingConfig = parseconnectionstring(url)

  if (testingConfig.host === 'localhost' && testingConfig.tlsoptions === undefined) {
    testingConfig.tlsoptions = {
      ca: SELF_SIGNED_CERTIFICATE
    }
  }

  // create database if it doesn't exist
  testingConfig.create = true

  if (!(testingConfig.database === 'chinook.sqlite')) {
    throw Error('testingConfig.database is not equal to chinook.sqlite')
  }

  testingConfig.database = testingConfig.database?.replace('chinook.sqlite', getTestingDatabaseName('testing'))
  return testingConfig
}

export function getTestingDatabase(callback?: ResultsCallback): Database {
  const testingConfig = getTestingConfig()
  const database = new Database(testingConfig, error => {
    if (error) {
      console.error(`getTestingDatabase - connection error: ${error}`)
      callback?.call(database, error)
    }
    database.run(TESTING_SQL, (error: SQLiteCloudError, results: SQLiteCloudRowset) => {
      if (error) {
        console.error(`getTestingDatabase - setup error: ${error}`)
        callback?.call(database, error)
      }
      expect(results).toBeDefined()
      expect(results[0][42]).toBe(42)
      callback?.call(database, null, database)
    })
  })

  // database.verbose()
  return database
}

export async function getTestingDatabaseAsync(): Promise<Database> {
  const testingConfig = getTestingConfig()
  return new Promise((resolve, reject) => {
    const database = new Database(testingConfig, error => {
      if (error) {
        reject(error)
      }
      database.run(TESTING_SQL, (error: SQLiteCloudError, results: SQLiteCloudRowset) => {
        if (error) {
          reject(error)
        }
        expect(results[0]['42']).toBe(42)
        resolve(database)
      })
    })
  })
}

/** Drop databases that are no longer in use */
export async function clearTestingDatabasesAsync() {
  const chinook = getChinookDatabase()

  let numDeleted = 0
  let databases = await chinook.sql`LIST DATABASES;`
  const testingPattern = /^testing-\d{16}\.db$/
  for (let i = 0; i < databases.length; i++) {
    const databaseName = databases[i]['name']
    if (testingPattern.test(databaseName)) {
      const result = await chinook.sql(`REMOVE DATABASE ${databaseName};`)
      console.assert(result)
      numDeleted++
    }
  }
  if (numDeleted > 0) {
    console.log(`Deleted ${numDeleted} testing databases`)
  }
}

//
// more utilities
//

export function removeDatabase(database: Database, callback?: ResultsCallback) {
  const databaseName = database.getConfiguration().database
  if (!databaseName && !databaseName?.startsWith('testing-')) {
    throw new Error(`removeDatabase - invalid database name: ${databaseName}`)
  }

  database.exec(`UNUSE DATABASE; REMOVE DATABASE ${databaseName};`, error => {
    expect(error).toBeNull()
    database.close()
    if (callback) {
      callback(null)
    }
  })
}

export async function removeDatabaseAsync(database?: Database) {
  if (database) {
    const databaseName = database.getConfiguration().database
    if (!databaseName && !databaseName?.startsWith('testing-')) {
      throw new Error(`removeDatabaseAsync - invalid database name: ${databaseName}`)
    }

    if (databaseName) {
      const result1 = await database.sql`UNUSE DATABASE;`
      console.assert(result1)
      const result2 = await database.sql`REMOVE DATABASE ${databaseName};`
      console.assert(result2)
    }
    database.close()
  }
}

export async function sendCommandsAsync<T>(connection: SQLiteCloudConnection, sql: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    connection.sendCommands(sql, (error, results) => {
      if (error) {
        console.error(`sendCommandsAsync - error running ${sql}, error: ${error}`, sql, error)
        reject(error)
      }
      resolve(results)
    })
  })
}
