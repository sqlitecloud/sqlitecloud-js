/**
 * benchmark.test.ts - test low level communication protocol with tls sockets and raw commands
 */

/*

@Gionata
 
@andrea
 ve lo scrivo qui, e se riuscite vi chiedo di fare questo test per lunedì. 
@andrea
 è riuscito a mettere 4 nodi su una t3.small, ogni nodo ha mezza vcpu e 485MB di RAM. Vorrei 
 capire se la RAM è sufficiente o meno, il core secondo me non ha grossi problemi ma non so la 
 parte del gateway. Se riusciste a far eseguire le queries del benchmark https://github.com/sqlitecloud/benchmark 
 sia al core che al gateway, ci possiamo rendere conto dell'effettiva richiesta di risorse. Per Andrea 
 basta eseguire il C, per Gio sequenza corretta degli statement SQL da eseguire è:
sql/sqlitecloud_init.sql
tutti i .sql contenuti nella cartella test (in ordine alfabetico) ad eccezioni di quelli che iniziano con __PostgreSQL
sql/sqlitecloud_cleanup.sql
Il tutto da ripetersi 3 volte.
Non mi interessano i numeri in se, ma solo capire se basta la memoria assegnata.
Un altro test importante sarebbe quello di aprire 50 connessioni parallele e fare una batteria di test
 (magari test_mini che richiedono meno risorse). Anche qui per testare l'utilizzo della memoria. 

*/

import { SQLiteCloudError } from '../src/index'
import { SQLiteCloudConnection } from '../src/drivers/connection'
import { SQLiteCloudTlsConnection } from '../src/drivers/connection-tls'
import { anonimizeCommand } from '../src/drivers/utilities'
import {
  CHINOOK_DATABASE_URL,
  INSECURE_DATABASE_URL,
  EXTRA_LONG_TIMEOUT,
  getTestingConfig,
  getChinookConfig,
  getChinookTlsConnection,
  getChinookWebsocketConnection,
  // clearTestingDatabasesAsync,
  WARN_SPEED_MS,
  EXPECT_SPEED_MS
} from './shared'
import { ResultsCallback } from '../src/drivers/types'
import { TLSSocket, TLSSocketOptions } from 'tls'

const fs = require('fs')
const path = require('path')

async function runScript<T>(connection: SQLiteCloudConnection, relativePathname: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // convert to absolute path, read contents of .sql script
    const absolutePathname = path.resolve(__dirname, relativePathname)
    const sql = fs.readFileSync(absolutePathname, 'utf8')

    // create connection and run script
    connection.sendCommands(sql, (error, results) => {
      if (error) {
        console.error(`runScript('${relativePathname}') - error running script ${error}`, relativePathname, error)
        reject(error)
      }
      resolve(results)
    })
  })
}

async function testScript<T>(connection: SQLiteCloudConnection, testName: string): Promise<T> {
  let results1 = await runScript(connection, './benchmark/sqlitecloud_init.sql')
  let results2 = await runScript<T>(connection, './benchmark/test/' + testName)
  let results3 = await runScript(connection, './benchmark/sqlitecloud_cleanup.sql')
  return results2
}

describe('benchmark', () => {
  describe('benchmark tests', () => {
    it('should run setup', async () => {
      console.debug(`Benchmark tests, setup database`)
      const connection = getChinookTlsConnection()
      const setupResults = await runScript(connection, './benchmark/sqlitecloud_init.sql')
      expect(setupResults).toBe('OK')
    })

    it(
      'should run benchmark scripts',
      async () => {
        // setup database used for testing
        const connection = getChinookTlsConnection()
        console.debug(`Benchmark tests, setup database`)
        const setupResults = await runScript(connection, './benchmark/sqlitecloud_init.sql')
        expect(setupResults).toBe('OK')

        // list contents of test folder
        const testFolder = path.resolve(__dirname, './benchmark/test')
        const files = fs.readdirSync(testFolder).sort()

        for (const testFile of files) {
          if (testFile.startsWith('__PostgreSQL')) {
            continue
          }
          try {
            console.debug(`Benchmark tests, run ${testFile}`)
            let results = await runScript(connection, './benchmark/test/' + testFile)
            if (!results) {
              console.warn(`Benchmark tests, no results from ${testFile}`)
            }
          } catch (error) {
            throw new Error(`Benchmark tests, error running ${testFile}: ${error}`)
          }
        }

        // cleanup database used for testing
        console.debug(`Benchmark tests, cleanup database`)
        const cleanupResults = await runScript(connection, './benchmark/sqlitecloud_cleanup.sql')
        expect(cleanupResults).toBe('OK')
      },
      EXTRA_LONG_TIMEOUT
    )
  })
})
