import { describe, expect, it } from '@jest/globals'
import { Database, SQLiteCloudRowset } from '../src'
import { GATEWAY_URL, LONG_TIMEOUT, getChinookDatabase } from './shared'

const BLOB_TRANSPORT_TABLE = 'blob_transport_probe'
const BLOB_ROW_COUNT = 100
const BLOB_SIZE = 32

async function assertBlobRowsRoundTrip(database: Database) {
  await database.sql(`DROP TABLE IF EXISTS ${BLOB_TRANSPORT_TABLE};`)
  await database.sql(`
    CREATE TABLE ${BLOB_TRANSPORT_TABLE} (
      id INTEGER PRIMARY KEY,
      label TEXT NOT NULL,
      payload BLOB NOT NULL
    );
  `)
  await database.sql(
    `
      WITH RECURSIVE seq(n) AS (
        SELECT 1
        UNION ALL
        SELECT n + 1 FROM seq WHERE n < ?
      )
      INSERT INTO ${BLOB_TRANSPORT_TABLE} (id, label, payload)
      SELECT n, 'row-' || n, randomblob(?)
      FROM seq;
    `,
    BLOB_ROW_COUNT,
    BLOB_SIZE
  )

  const rows = (await database.sql(`
    SELECT
      id,
      label,
      length(payload) AS payloadLength,
      payload
    FROM ${BLOB_TRANSPORT_TABLE}
    ORDER BY id
    LIMIT ${BLOB_ROW_COUNT};
  `)) as SQLiteCloudRowset

  expect(rows).toHaveLength(BLOB_ROW_COUNT)

  rows.forEach((row, index) => {
    expect(row.id).toBe(index + 1)
    expect(row.label).toBe(`row-${index + 1}`)
    expect(row.payloadLength).toBe(BLOB_SIZE)
    expect(row.payload).toBeInstanceOf(Buffer)
    expect((row.payload as Buffer).length).toBe(BLOB_SIZE)
  })
}

describe('blob rowsets across transports', () => {
  it(
    'should return more than 12 rows with small blobs over tls',
    async () => {
      let database: Database | undefined

      try {
        database = getChinookDatabase()
        await assertBlobRowsRoundTrip(database)
      } finally {
        database?.close()
      }
    },
    LONG_TIMEOUT
  )

  it(
    'should return more than 12 rows with small blobs over websocket',
    async () => {
      let database: Database | undefined

      try {
        database = getChinookDatabase(undefined, {
          usewebsocket: true,
          gatewayurl: GATEWAY_URL
        })
        await assertBlobRowsRoundTrip(database)
      } finally {
        database?.close()
      }
    },
    LONG_TIMEOUT
  )
})
