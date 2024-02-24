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

const fs = require('fs')
const path = require('path')

const BRC_UNIQUE_STATIONS = 41343
const BRC_INSERT_CHUNKS = 300_000 // insert this many rows per request

const BRC_TIMEOUT = 12 * 60 * 60 * 1000 // 12 hours
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
  it('should run 500_000 row challenge with a single insert statement', async () => {
    await testChallenge(500_000, 500_000)
  })

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

  console.log(`Wrote 1brc_${numberOfRows}_rows.csv in ${Date.now() - startedOn}ms`)
}

/** Read csv with measurements, insert in chunks, summarize and write out results to csv */
async function testChallenge(numberOfRows: number, insertChunks = BRC_INSERT_CHUNKS) {
  const startedOn = Date.now()

  const { connection, database } = await createDatabaseAsync(numberOfRows)
  try {
    const parseOn = Date.now()
    // parse csv into array of city/temperature
    const csvPathname = path.resolve(__dirname, 'assets/1brc', `1brc_${numberOfRows}_rows.csv`)
    const csvText = fs.readFileSync(csvPathname, 'utf8')
    const lines = csvText.trim().split('\n') // Split the CSV text by newline
    const data: { city: string; temp: number }[] = lines.map((line: string) => {
      const [city, temp] = line.split(';') // Split each line by semicolon
      return { city, temp: parseFloat(temp) } // Parse the temperature as a number
    })
    expect(lines.length).toBe(numberOfRows)
    const uniqueStations = new Set(data.map(item => item.city))
    expect(uniqueStations.size).toBe(BRC_UNIQUE_STATIONS)
    console.debug(`Read 1brc_${numberOfRows}_rows.csv in ${Date.now() - parseOn}ms`)

    // create database and table
    const createResult = await sendCommandsAsync(connection, `CREATE TABLE measurements(city VARCHAR(26), temp FLOAT);`)
    expect(createResult).toBe('OK')

    for (let chunk = 0, startRow = 0; startRow < numberOfRows; chunk++, startRow += BRC_INSERT_CHUNKS) {
      const insertOn = Date.now()
      // insert chunk of rows into sqlite database
      const dataChunk = data.slice(startRow, Math.min(numberOfRows, startRow + BRC_INSERT_CHUNKS))
      const values = dataChunk.map(({ city, temp }) => `('${city.replaceAll("'", "''")}', ${temp})`).join(',\n')
      const insertSql = `INSERT INTO measurements (city, temp) VALUES \n${values};`

      // const sqlPathname = path.resolve(__dirname, 'assets/1brc', `1brc_${numberOfRows}_rows_${chunk}.sql`)
      // fs.writeFileSync(sqlPathname, insertSql)

      // insert values into database
      const insertResult = (await sendCommandsAsync(connection, insertSql)) as Array<number>
      expect(Array.isArray(insertResult)).toBeTruthy()
      expect(insertResult[3] as number).toBe(dataChunk.length) // totalChanges
      console.debug(`Inserted ${dataChunk.length} rows (${Math.floor(insertSql.length / 1024)}KB) in ${Date.now() - insertOn}ms`)
    }

    // calculate averages, etc
    const selectOn = Date.now()
    const selectSql = 'SELECT city, MIN(temp), AVG(temp), MAX(temp) FROM measurements GROUP BY city'
    const selectResult = (await sendCommandsAsync(connection, selectSql)) as SQLiteCloudRowset
    expect(selectResult).toBeTruthy()
    expect(selectResult.length).toBe(BRC_UNIQUE_STATIONS)
    console.debug(`Selected ${numberOfRows} rows with aggregates in ${Date.now() - selectOn}ms`)

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
