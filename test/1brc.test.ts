/**
 * 1brc.test.ts - insert lots of data, syntesize, extract, benchmark
 * https://github.com/gunnarmorling/1brc/tree/main
 */

import { SQLiteCloudRowset } from '../src'
import { SQLiteCloudConnection } from '../src/drivers/connection'
import { EXTRA_LONG_TIMEOUT, LONG_TIMEOUT, getChinookTlsConnection, getTestingDatabaseName, sendCommandsAsync } from './shared'
import * as util from 'util'

const fs = require('fs')
const path = require('path')

const BRC_UNIQUE_STATIONS = 41343

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

const BRC_TIMEOUT = 15 * 60 * 1000 // 15 minutes
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
  it('should run 500_000 row challenge', async () => {
    await testChallenge(500_000)
  })
})

//
// generate data on the fly
//

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
  for (let i = stations.length; i < numberOfRows; i++) {
    if (i > 0 && i % 50_000_000 === 0) {
      console.log(`Wrote ${i} measurements in ${Date.now() - startedOn}ms`)
    }
    let station = stations[Math.floor(Math.random() * stations.length)]
    await write(`${station.id};${station.measurement()}\n`)
  }

  console.log(`Wrote 1brc_${numberOfRows}_rows.csv in ${Date.now() - startedOn}ms`)
}

async function testChallenge(numberOfRows: number) {
  const startedOn = Date.now()

  try {
    const csvPathname = path.resolve(__dirname, 'assets/1brc', `1brc_${numberOfRows}_rows.csv`)
    const csvText = fs.readFileSync(csvPathname, 'utf8')

    // parse into array of city/temperature
    const lines = csvText.trim().split('\n') // Split the CSV text by newline
    const data: { city: string; temp: number }[] = lines.map((line: string) => {
      const [city, temp] = line.split(';') // Split each line by semicolon
      return { city, temp: parseFloat(temp) } // Parse the temperature as a number
    })
    expect(lines.length).toBe(numberOfRows)

    const uniqueStations = new Set(data.map(item => item.city))
    expect(uniqueStations.size).toBe(BRC_UNIQUE_STATIONS)

    // create database and table
    const { connection, database } = await createDatabaseAsync(lines.length)
    const createResult = await sendCommandsAsync(connection, `CREATE TABLE measurements(city VARCHAR(26), temp FLOAT);`)
    expect(createResult).toBe('OK')

    // insert into sqlite database
    const values = data.map(({ city, temp }) => `('${city.replaceAll("'", "''")}', ${temp})`).join(',\n')
    const insertSql = `INSERT INTO measurements (city, temp) VALUES \n${values};`
    const sqlPathname = path.resolve(__dirname, 'assets/1brc', `1brc_${numberOfRows}_rows.sql`)
    fs.writeFileSync(sqlPathname, insertSql)

    // insert values into database
    const insertResult = (await sendCommandsAsync(connection, insertSql)) as Array<number>
    expect(Array.isArray(insertResult)).toBeTruthy()
    expect(insertResult[2] as number).toBe(numberOfRows)

    // calculate averages, etc
    const selectSql = 'SELECT city, MIN(temp), AVG(temp), MAX(temp) FROM measurements GROUP BY city'
    const selectResult = (await sendCommandsAsync(connection, selectSql)) as SQLiteCloudRowset
    expect(selectResult).toBeTruthy()
    expect(selectResult.length).toBe(BRC_UNIQUE_STATIONS)

    console.log(`Ran ${numberOfRows} challenge in ${Date.now() - startedOn}ms`)
    debugger
  } catch (error) {
    console.error(`An error occoured while running 1brc, error: ${error}`)
    throw error
  } finally {
    // await destroyDatabaseAsync(connection, database)
  }
}
