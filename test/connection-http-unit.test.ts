import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SQLiteCloudHttpConnection } from '../src/drivers/connection-http'
import { Database } from '../src/drivers/database'
import { OperationsQueue } from '../src/drivers/queue'
import { SQLiteCloudRowset } from '../src/drivers/rowset'

const fetchMock: any = jest.fn()

beforeEach(() => {
  ;(global as any).fetch = fetchMock
})

afterEach(() => {
  jest.clearAllMocks()
})

function connection() {
  return new SQLiteCloudHttpConnection({
    host: 'tenant.g4.sqlite.cloud',
    apikey: 'secret',
    database: 'test.sqlite',
    gatewayurl: 'http://localhost:8090'
  })
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Service Unavailable',
    text: async () => JSON.stringify(payload)
  }
}

function commandResult(connection: SQLiteCloudHttpConnection, command: any): Promise<any> {
  return new Promise((resolve, reject) => {
    connection.transportCommands(command, (error, result) => {
      if (error) reject(error)
      else resolve(result)
    })
  })
}

describe('HTTP gateway transport', () => {
  it('posts independent commands with tagged bigint and indexed base64 BLOB bindings', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: 1 }))
    const db = connection()

    await commandResult(db, {
      query: 'SELECT ?, ?, ?',
      parameters: [BigInt(9), Buffer.from([0, 255, 16]), new Uint8Array([1, 2])]
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8090/v2/weblite/sql',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret', 'Content-Type': 'application/json', Host: 'tenant.g4.sqlite.cloud' })
      })
    )
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body)).toEqual({
      sql: 'SELECT ?, ?, ?',
      bind: [{ __sqlitecloud_bigint: '9' }, 'AP8Q', 'AQI='],
      database: 'test.sqlite',
      row: 'array',
      safe_integer_mode: 'number',
      capabilities: {
        blobTransferFormat: 'base64-blobs-v1',
        blobBindIndexes: [1, 2]
      }
    })
  })

  it('revives JSON Buffer cells without BLOB metadata and leaves text that is not canonical base64 alone', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          metadata: { version: 2, numberOfRows: 1, numberOfColumns: 1, columns: [{ name: 'expression' }] },
          data: [[{ type: 'Buffer', data: [0, 255, 16] }]]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          blobTransferFormat: 'base64-blobs-v1',
          metadata: { version: 2, numberOfRows: 1, numberOfColumns: 1, columns: [{ name: 'payload', type: 'BLOB' }] },
          data: [['Hello']]
        })
      )
    const db = connection()

    const expression = await commandResult(db, 'SELECT x\'00ff10\'')
    const text = await commandResult(db, 'SELECT b')

    expect(expression).toBeInstanceOf(SQLiteCloudRowset)
    expect(expression[0].expression).toEqual(Buffer.from([0, 255, 16]))
    expect(text[0].payload).toBe('Hello')
  })

  it('runs commands in parallel and rejects a command that was already aborted', async () => {
    const resolveFetches: Array<(response: any) => void> = []
    fetchMock.mockImplementation(() => new Promise(resolve => resolveFetches.push(resolve)))
    const db = connection()

    db.sendCommands('SELECT 1')
    db.sendCommands('SELECT 2')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    resolveFetches.forEach(resolve => resolve(jsonResponse({ data: 1 })))
    const controller = new AbortController()
    controller.abort()
    await expect(commandResult(db, { query: 'SELECT 3', signal: controller.signal })).rejects.toMatchObject({ errorCode: 'ERR_ABORTED' })
    db.close()
  })

  it('does not re-serialize concurrent transport commands in Database', () => {
    const sendCommands = jest.fn()
    const database = Object.create(Database.prototype) as any
    database.operations = new OperationsQueue()
    database.connection = { connected: true, concurrent: true, sendCommands }

    database.enqueueCommand('SELECT 1')
    database.enqueueCommand('SELECT 2')

    expect(sendCommands).toHaveBeenCalledTimes(2)
  })

  it('maps non-JSON proxy failures to a stable gateway error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable', text: async () => 'upstream unavailable' })
    await expect(commandResult(connection(), 'SELECT 1')).rejects.toMatchObject({ errorCode: 'ERR_GATEWAY_UNAVAILABLE' })
  })
})
