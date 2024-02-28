/**
 * 1brc.test.ts - insert lots of data, syntesize, extract, benchmark
 * https://github.com/gunnarmorling/1brc/tree/main
 *
 * To run:
 * npm test 1brc.test.ts
 */

import { SQLiteCloudRowset } from '../src'
import { SQLiteCloudConnection } from '../src/drivers/connection'
import { getChinookTlsConnection, getTestingDatabaseName, sendCommandsAsync } from './shared'
import * as util from 'util'
import * as readline from 'readline'

const fs = require('fs')
const path = require('path')

const BRC_UNIQUE_STATIONS = 41343
const BRC_INSERT_CHUNKS = 350_000 // insert this many rows per request

const BRC_TIMEOUT = 24 * 60 * 60 * 1000 // 1 day
jest.setTimeout(BRC_TIMEOUT) // Set global timeout

describe('1 billion row challenge', () => {
  it('should create 50_000 measurements', async () => {
    await createMeasurements(50_000)
  })

  it('should run 50_000 row challenge', async () => {
    await testChallenge(50_000)
  })

  it('should create 500_000 measurements', async () => {
    await createMeasurements(500_000)
  })

  it('should run 500_000 row challenge with chunked inserts', async () => {
    await testChallenge(500_000)
  })

  //  it('should run 500_000 row challenge with a single insert statement', async () => {
  //    await testChallenge(500_000, 500_000)
  // })
  /*
  it('should create 10_000_000 measurements', async () => {
    await createMeasurements(10_000_000)
  })

  it('should run 10_000_000 row challenge', async () => {
    await testChallenge(10_000_000)
  })

  it('should create 50_000_000 measurements', async () => {
    await createMeasurements(50_000_000)
  })

  it('should run 50_000_000 row challenge', async () => {
    await testChallenge(50_000_000)
  })

  it('should create 200_000_000 measurements', async () => {
    await createMeasurements(200_000_000)
  })

  it('should run 200_000_000 row challenge', async () => {
    await testChallenge(200_000_000)
  })
*/
})

//
// utility methods
//

async function createDatabaseAsync(numberOfRows: number): Promise<{ connection: SQLiteCloudConnection; database: string }> {
  const connection = getChinookTlsConnection()
  const database = getTestingDatabaseName(`1brc-${numberOfRows}`)
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

class WeatherStation {
  constructor(public id: string, public meanTemperature: number) {}

  measurement(): number {
    let m = this.randomGaussian(this.meanTemperature, 10)
    return Math.round(m * 10.0) / 10.0
  }

  private randomGaussian(mean: number, stdDev: number): number {
    let u1 = Math.random()
    let u2 = Math.random()
    let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2)
    return mean + stdDev * randStdNormal
  }
}

/** Create csv file with random measurements starting from list of stations and base temperature */
async function createMeasurements(numberOfRows: number = 1000000) {
  let startedOn = Date.now()

  const srcPathname = path.resolve(__dirname, 'assets/1brc', 'weather_stations.csv')
  const srcText = fs.readFileSync(srcPathname, 'utf8')

  // parse into array of city/temperature
  const lines = srcText.trim().split('\n') // Split the CSV text by newline
  const stations: WeatherStation[] = lines.map((line: string) => {
    const [city, temp] = line.split(';') // Split each line by semicolon
    return new WeatherStation(city, parseFloat(temp)) // Parse the temperature as a number
  })
  const uniqueStations = new Set(stations.map(station => station.id))
  expect(uniqueStations.size).toBe(BRC_UNIQUE_STATIONS)

  const csvPathname = path.resolve(__dirname, 'assets/1brc', `1brc_${numberOfRows}_rows.csv`)
  let writeStream = fs.createWriteStream(csvPathname)
  let write = util.promisify(writeStream.write).bind(writeStream)

  // write initial data (otherwise some stations may be missing in the random selection)
  for (let station of stations) {
    await write(`${station.id};${station.measurement()}\n`)
  }

  // make up the rest of the data
  for (let i = stations.length; i < numberOfRows; i += 10_000) {
    if (i > 0 && i % 10_000_000 === 0) {
      console.log(`Wrote ${i} measurements in ${Date.now() - startedOn}ms`)
    }

    let chunkCsv = ''
    for (let j = 0; j < Math.min(10_000, numberOfRows - i); j++) {
      let station = stations[Math.floor(Math.random() * stations.length)]
      chunkCsv += `${station.id};${station.measurement()}\n`
    }
    await write(chunkCsv)
  }

  console.log(`Created 1brc_${numberOfRows}_rows.csv in ${Date.now() - startedOn}ms`)
}

/** Read csv with measurements, insert in chunks, summarize and write out results to csv */
async function testChallenge(numberOfRows: number, insertChunks = BRC_INSERT_CHUNKS) {
  const startedOn = Date.now()

  const { connection, database } = await createDatabaseAsync(numberOfRows)
  try {
    const parseOn = Date.now()

    // create database and table
    const createResult = await sendCommandsAsync(connection, `CREATE TABLE measurements(city VARCHAR(26), temp FLOAT);`)
    expect(createResult).toBe('OK')

    const csvPathname = path.resolve(__dirname, 'assets/1brc', `1brc_${numberOfRows}_rows.csv`)
    const fileStream = fs.createReadStream(csvPathname)

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })

    let dataChunk = []
    let rowCount = 0
    for await (const line of rl) {
      const [city, temp] = line.split(';') // Split each line by semicolon
      dataChunk.push({ city, temp: parseFloat(temp) }) // Parse the temperature as a number

      if (dataChunk.length === insertChunks || rowCount + 1 === numberOfRows) {
        const insertOn = Date.now()
        const values = dataChunk.map(({ city, temp }) => `('${city.replaceAll("'", "''")}', ${temp})`).join(',\n')
        const insertSql = `INSERT INTO measurements (city, temp) VALUES \n${values};`

        // insert values into database
        const insertResult = (await sendCommandsAsync(connection, insertSql)) as Array<number>
        expect(Array.isArray(insertResult)).toBeTruthy()
        expect(insertResult[3] as number).toBe(dataChunk.length) // totalChanges
        console.debug(`Inserted ${dataChunk.length} rows (${Math.floor(insertSql.length / 1024)}KB) in ${Date.now() - insertOn}ms`)

        dataChunk = [] // reset data chunk
      }

      rowCount++
    }

    // calculate averages, etc
    const selectOn = Date.now()
    const selectSql = 'SELECT city, MIN(temp), AVG(temp), MAX(temp) FROM measurements GROUP BY city'
    const selectResult = (await sendCommandsAsync(connection, selectSql)) as SQLiteCloudRowset
    expect(selectResult).toBeTruthy()
    expect(selectResult.length).toBe(BRC_UNIQUE_STATIONS)

    console.log(`Ran ${numberOfRows} challenge in ${Date.now() - startedOn}ms`)

    // write results to csv
    const selectCsvPathname = path.resolve(__dirname, 'assets/1brc', `1brc_${numberOfRows}_rows_results.csv`)
    const selectCsv = selectResult.map(row => `"${row.city}",${row['MIN(temp)']},${(row['AVG(temp)'] as number).toFixed(2)},${row['MAX(temp)']}`).join('\n')
    fs.writeFileSync(selectCsvPathname, selectCsv)
  } catch (error) {
    console.error(`Error: ${error}`)
    throw error
  } finally {
    // await destroyDatabaseAsync(connection, database)
    connection?.close()
  }
}
