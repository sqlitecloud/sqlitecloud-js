/**
 * clean.test.ts - clean test databases
 */

import { describe, it } from '@jest/globals'
import { getChinookDatabase } from './shared'

describe.skip('clean test suite', () => {
  it('should remove test databases from the project', async () => {
    let chinook
    try {
      chinook = getChinookDatabase()
      // Use the connect utility to execute SQL statements on the selected database
      const result = await chinook.sql(`LIST DATABASES`)
      const limit = 1000
      let removed = []
      let dbname = ''
      for (let i = 0; i < result.length; i++) {
        dbname = result[i].name
        if ((dbname.startsWith('1brc') && dbname.includes('-2025')) || dbname.startsWith('testing-2025')) {
          removed.push(dbname)
          // console.log("remove ${dbname}")
          const r = await chinook.sql(`REMOVE DATABASE ${dbname}`)
          if (removed.length >= limit) {
            break
          }
        }
      }

      // Build the object to be returned by your edge function
      const message = `Number of databases: ${result.length}, removed ${removed.length}`

      // Return the object from your edge function

      console.debug({ message, removed })
    } finally {
      chinook?.close()
    }
  })
})
