//
// utilities.ts - utility methods for SQLite Cloud Gateway
//

import { SQLiteCloudBunConnection } from './connection-bun'
import { SQLiteCloudRowset, SQLiteCloudError, validateConfiguration } from '../index'

import express from 'express'

// should we log verbose messages?
export const VERBOSE = process.env['VERBOSE']?.toLowerCase() === 'true'

/** Connects to given database asynchronously */
export async function connectAsync(connectionString: string): Promise<SQLiteCloudBunConnection> {
  return await new Promise((resolve, reject) => {
    const config = validateConfiguration({ connectionString })
    const connection = new SQLiteCloudBunConnection(config, (error: Error | null) => {
      if (error) {
        log('connectAsync | error', error)
        reject(error)
      } else {
        resolve(connection)
      }
    })
  })
}

/** Sends given sql commands asynchronously */
export async function sendCommandsAsync(connection: SQLiteCloudBunConnection, sql: string): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    connection.sendCommands(sql, (error: Error | null, results) => {
      // Explicitly type the 'error' parameter as 'Error'
      if (error) {
        log('sendCommandsAsync | error', error)
        reject(error)
      } else {
        // console.debug(JSON.stringify(results).substring(0, 140) + '...')
        resolve(results)
      }
    })
  })
}

/** Returns a json api compatibile error response */
export function errorResponse(response: express.Response, status: number, statusText: string, detail?: string | Error | any) {
  if (detail instanceof Error) {
    const error = detail as Error
    detail = `${error.name}: ${error.message}`
  }
  response.status(status).json({ error: { status: status.toString(), title: statusText, detail } })
}

/** Log only in verbose mode */
export function log(...args: unknown[]) {
  if (VERBOSE) {
    console.debug(...args)
  }
}
