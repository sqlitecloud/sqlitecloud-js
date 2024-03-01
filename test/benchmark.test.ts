/**
 * benchmark.test.ts - test low level communication protocol with tls sockets and raw commands
 */

import { SQLiteCloudConnection } from '../src/drivers/connection'
import { EXTRA_LONG_TIMEOUT, getChinookTlsConnection, getTestingDatabaseName, sendCommandsAsync } from './shared'

const fs = require('fs')
const path = require('path')

async function createDatabaseAsync(): Promise<{ connection: SQLiteCloudConnection; database: string }> {
  const connection = getChinookTlsConnection()
  const database = getTestingDatabaseName('benchmark')
  const createSql = `UNUSE DATABASE; CREATE DATABASE ${database}; USE DATABASE ${database};`
  const createResults = await sendCommandsAsync(connection, createSql)
  expect(createResults).toBe('OK')
  return { database, connection }
}

async function destroyDatabaseAsync(connection: SQLiteCloudConnection, database: string) {
  const cleanupResults = await sendCommandsAsync(connection, `UNUSE DATABASE; REMOVE DATABASE ${database}`)
  expect(cleanupResults).toBe('OK')
  connection.close()
}

async function runScript(connection: SQLiteCloudConnection, database: string, relativePathname: string) {
  // convert to absolute path, read contents of .sql script
  const absolutePathname = path.resolve(__dirname, 'benchmark/test', relativePathname)
  const sql = fs.readFileSync(absolutePathname, 'utf8')
  try {
    return await sendCommandsAsync(connection, sql)
  } catch (error) {
    const errorMsg = `runScript - database: ${database}, script: ${relativePathname}, returned: ${error}`
    debugger
    throw new Error(errorMsg)
  }
}

describe('benchmark', () => {
  it('should run setup', async () => {
    const { connection, database } = await createDatabaseAsync()
    await destroyDatabaseAsync(connection, database)
  })

  it(
    'should run script 090.sql',
    async () => {
      const { connection, database } = await createDatabaseAsync()
      await runScript(connection, database, '090.sql')
      await destroyDatabaseAsync(connection, database)
    },
    EXTRA_LONG_TIMEOUT
  )

  it(
    'should run script 120.sql',
    async () => {
      const { connection, database } = await createDatabaseAsync()
      await runScript(connection, database, '120.sql')
      await destroyDatabaseAsync(connection, database)
    },
    EXTRA_LONG_TIMEOUT
  )
  /*
    it(
      'should run scripts with new connection for each script',
      async () => {
        // setup database used for testing
        const { connection, database } = await createDatabaseAsync()

        // list contents of test folder
        const testFolder = path.resolve(__dirname, './benchmark/test')
        const files = fs.readdirSync(testFolder).sort()

        for (const testFile of files) {
          const scriptConnection = getChinookTlsConnection(undefined, { database })
          console.debug(`Benchmark tests, run ${testFile}`)
          try {
            await runScript(scriptConnection, database, testFile)
          } catch (error) {
            console.debug(`failed while running ${testFile}, error: ${error}`)
            throw error
          }
        }

        await destroyDatabaseAsync(connection, database)
      },
      EXTRA_LONG_TIMEOUT
    )
*/
  it(
    'should run benchmark scripts with same connection',
    async () => {
      // setup database used for testing
      const { connection, database } = await createDatabaseAsync()
      // list contents of test folder
      const testFolder = path.resolve(__dirname, './benchmark/test')
      const files = fs.readdirSync(testFolder).sort()

      for (const testFile of files) {
        const startedOn = new Date()
        const result = await runScript(connection, database, testFile)
        const elapsedMs = new Date().getTime() - startedOn.getTime()
        console.debug(`${testFile} on ${database} took ${elapsedMs}ms\n`, result)
      }

      await destroyDatabaseAsync(connection, database)
    },
    2 * EXTRA_LONG_TIMEOUT
  )
})
