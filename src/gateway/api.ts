//
// api.ts - implements various node api, eg: list databases, stats, etc
//

import packageJson from '../../package.json'
import { type ApiRequest, type ApiResponse, type SqlApiRequest, DEFAULT_PORT_HTTP, DEFAULT_PORT_SOCKET } from './shared'
import { VERBOSE, connectAsync, sendCommandsAsync, log, errorResponse } from './utilities'
import { SQLiteCloudBunConnection } from './connection-bun'
import { heapStats } from 'bun:jsc'
import { camelCase } from 'lodash'

const startedOn = new Date()

/** Server info for /v1/info endpoints */
export function getServerInfo(): ApiResponse {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { objectTypeCounts, protectedObjectTypeCounts, ...memory } = heapStats()
  return {
    data: {
      name: '@sqlitecloud/gateway',
      version: packageJson.version,
      started: startedOn.toISOString(),
      uptime: `${Math.floor(process.uptime() / 3600)}h:${Math.floor((process.uptime() % 3600) / 60)}m:${Math.floor(process.uptime() % 60)}s`,
      bun: {
        version: Bun.version,
        path: Bun.which('bun'),
        main: Bun.main
      },
      memory,
      cpuUsage: process.cpuUsage()
    }
  }
}

/**
 * Returns information on databases running on the connected node, eg: LIST DATABASES DETAILED
 * @see https://github.com/sqlitecloud/backend/blob/main/sqliteweb/doc/dashboard/v1/%7BprojectID%7D/databases/GET.md
 * @see https://github.com/sqlitecloud/backend/blob/a12cf5308c4eb09d90ec2a8f5a4f87d3200f477f/sqliteweb/dashboard/v1/%7BprojectID%7D/databases/GET.lua#L4
 * @param connection Database connection
 * @returns Information on databases available on node
 */
export async function getDatabases(connection: SQLiteCloudBunConnection): Promise<ApiResponse> {
  const results = await sendCommandsAsync(connection, 'LIST DATABASES DETAILED;')
  return { data: Array.isArray(results) ? results : [] }
}

/**
 * Returns node stats, eg: LIST STATS NODE ? MEMORY;
 * @see https://github.com/sqlitecloud/backend/blob/main/sqliteweb/doc/dashboard/v1/%7BprojectID%7D/node/%7BnodeID%7D/stat/GET.md
 * @see https://github.com/sqlitecloud/backend/blob/a12cf5308c4eb09d90ec2a8f5a4f87d3200f477f/sqliteweb/dashboard/v1/%7BprojectID%7D/node/%7BnodeID%7D/stat/GET.lua
 * @param connection Database connection
 * @returns Information on databases available on node
 */
export async function getStats(connection: SQLiteCloudBunConnection): Promise<ApiResponse> {
  // receives list of statistics, some may be duplicates, same may be missing, open ended keys
  const results = await sendCommandsAsync(connection, 'LIST STATS NODE ? MEMORY;')

  // reduce to dictionary of single most recent value for each key
  let data: Record<string, any> = {}
  if (Array.isArray(results)) {
    results.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
    data = results.reduce((acc, curr) => {
      const camelKey = camelCase(curr.key)
      if (!acc[camelKey]) {
        acc[camelKey] = numberIfPossible(curr.value)
      }
      return acc
    }, {})
  }

  return { data }
}

/** Converts CURRENT_CLIENTS to currentClients */
function camelCase(str: string): string {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
}

/** Converts "42" to 42 while leaving "Mickey" alone */
function numberIfPossible(value: string): number | string {
  const parsed = parseFloat(value)
  return isNaN(parsed) ? value : parsed
}
