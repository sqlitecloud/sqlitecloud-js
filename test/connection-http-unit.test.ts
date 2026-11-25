import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SQLiteCloudHttpConnection } from '../src/drivers/connection-http'
import { Database } from '../src/drivers/database'
import { OperationsQueue } from '../src/drivers/queue'
import { SQLiteCloudRowset } from '../src/drivers/rowset'
import { buildGatewaySqlUrl } from '../src/drivers/gateway-url'

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
      query: 'SELECT ?, ?, ?, ?, ?',
      parameters: [BigInt(9), Buffer.from([0, 255, 16]), new Int8Array([1, 2]), new DataView(Uint8Array.from([3, 4]).buffer), Uint8Array.from([5, 6]).buffer]
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8090/v2/weblite/sql',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' }
      })
    )
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body)).toEqual({
      sql: 'SELECT ?, ?, ?, ?, ?',
      bind: [{ __sqlitecloud_bigint: '9' }, 'AP8Q', 'AQI=', 'AwQ=', 'BQY='],
      database: 'test.sqlite',
      row: 'array',
      safe_integer_mode: 'number',
      capabilities: {
        blobTransferFormat: 'base64-blobs-v1',
        blobBindIndexes: [1, 2, 3, 4],
        bigIntMarkerFormat: 'tagged-v1'
      }
    })
  })

  it('revives JSON Buffer cells without BLOB metadata and decodes negotiated BLOB columns, keeping tagged TEXT as text', async () => {
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
          metadata: { version: 2, numberOfRows: 3, numberOfColumns: 1, columns: [{ name: 'payload', type: 'BLOB' }] },
          data: [['SGVsbG8='], [{ __sqlitecloud_text: 'Hello' }], [null]]
        })
      )
    const db = connection()

    const expression = await commandResult(db, 'SELECT x\'00ff10\'')
    const blobs = await commandResult(db, 'SELECT payload FROM t')

    expect(expression).toBeInstanceOf(SQLiteCloudRowset)
    expect(expression[0].expression).toEqual(Buffer.from([0, 255, 16]))
    expect(blobs[0].payload).toEqual(Buffer.from('Hello'))
    expect(blobs[1].payload).toBe('Hello')
    expect(blobs[2].payload).toBeNull()
  })

  it('throws the gateway sql error with its codes instead of a generic HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { errors: [{ status: '400', code: 'sqlite_error', detail: 'no such table: no_such_table', meta: { errorCode: '1', offsetCode: -1, externalErrorCode: '1' } }] },
        400
      )
    )

    await expect(commandResult(connection(), 'SELECT * FROM no_such_table')).rejects.toMatchObject({
      message: 'no such table: no_such_table',
      errorCode: '1',
      offsetCode: -1,
      externalErrorCode: '1'
    })
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
    const sendCommands = jest.fn((_command: unknown, callback: (error: Error | null, result?: any) => void) => callback(null, 1))
    const database = Object.create(Database.prototype) as any
    database.operations = new OperationsQueue()
    database.connection = { connected: true, concurrent: true, sendCommands }

    const callback = jest.fn(function (this: any) {
      expect(this).toBe(database)
    })
    database.enqueueCommand('SELECT 1', callback)
    database.enqueueCommand('SELECT 2')

    expect(sendCommands).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(null, 1)
  })

  it('maps non-JSON proxy failures to a stable gateway error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable', text: async () => 'upstream unavailable' })
    await expect(commandResult(connection(), 'SELECT 1')).rejects.toMatchObject({ errorCode: 'ERR_GATEWAY_UNAVAILABLE' })
  })

  it('maps JSON HTTP failures and rejected fetches to stable transport errors', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errors: [{ status: '401', detail: 'Unauthorized' }] }, 401))
      .mockResolvedValueOnce(jsonResponse({ errors: [{ status: '503', detail: 'Unavailable' }] }, 503))
      .mockRejectedValueOnce(new TypeError('fetch failed'))

    await expect(commandResult(connection(), 'SELECT 1')).rejects.toMatchObject({ errorCode: 'ERR_GATEWAY_UNAUTHORIZED' })
    await expect(commandResult(connection(), 'SELECT 1')).rejects.toMatchObject({ errorCode: 'ERR_GATEWAY_UNAVAILABLE' })
    await expect(commandResult(connection(), 'SELECT 1')).rejects.toMatchObject({ errorCode: 'ERR_CONNECTION_ERROR', message: 'fetch failed' })
  })

  it('decodes legacy bigint markers during transition but preserves strings in tagged responses', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: '42n' }))
      .mockResolvedValueOnce(jsonResponse({ bigIntMarkerFormat: 'tagged-v1', data: '42n' }))
    const db = new SQLiteCloudHttpConnection({ host: 'tenant.g4.sqlite.cloud', apikey: 'secret', gatewayurl: 'http://localhost:8090', safe_integer_mode: 'mixed' })

    await expect(commandResult(db, 'SELECT 1')).resolves.toBe(BigInt(42))
    await expect(commandResult(db, 'SELECT 1')).resolves.toBe('42n')
  })

  it('retains a local gateway path prefix when constructing the HTTP endpoint', () => {
    expect(buildGatewaySqlUrl('tenant.g4.sqlite.cloud', 'wss://localhost:8090/proxy')).toBe('https://localhost:8090/proxy/v2/weblite/sql')
  })
})
