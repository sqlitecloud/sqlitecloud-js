import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SQLiteCloudHttpConnection } from '../src/drivers/connection-http'
import { Database } from '../src/drivers/database'
import { OperationsQueue } from '../src/drivers/queue'
import { SQLiteCloudRowset } from '../src/drivers/rowset'
import { buildGatewaySqlUrl } from '../src/drivers/gateway-url'
import { SQLiteCloudError } from '../src/drivers/types'

const fetchMock: any = jest.fn()

beforeEach(() => {
  ;(global as any).fetch = fetchMock
})

afterEach(() => {
  jest.clearAllMocks()
})

function connection(callback?: (error: Error | null) => void) {
  return new SQLiteCloudHttpConnection(
    {
      host: 'tenant.g4.sqlite.cloud',
      apikey: 'secret',
      database: 'test.sqlite',
      gatewayurl: 'http://localhost:8090'
    },
    callback
  )
}

/** Connection whose open callback has fired, so transportCommands is reached synchronously */
function openConnection(): Promise<SQLiteCloudHttpConnection> {
  return new Promise(resolve => {
    const db = connection(() => resolve(db))
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

describe('Database with usehttp', () => {
  const connectionstring = 'sqlitecloud://tenant.g4.sqlite.cloud/test.sqlite?apikey=secret&usehttp=true&gatewayurl=http://localhost:8090'
  const oneRow = { metadata: { version: 2, numberOfRows: 1, numberOfColumns: 1, columns: [{ name: 'one' }] }, data: [[1]] }

  it('selects the HTTP transport from the connection string and runs a query queued before opening completes', async () => {
    fetchMock.mockResolvedValue(jsonResponse(oneRow))
    const db = new Database(connectionstring)

    const rows = await db.sql`SELECT 1 AS one`

    expect(rows[0].one).toBe(1)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8090/v2/weblite/sql', expect.objectContaining({ method: 'POST' }))
    db.close()
  })

  it('ignores undefined config overrides when selecting the transport', async () => {
    fetchMock.mockResolvedValue(jsonResponse(oneRow))
    const db = new Database({ connectionstring, usehttp: undefined, gatewayurl: undefined })

    const rows = await db.sql`SELECT 1 AS one`

    expect(rows[0].one).toBe(1)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8090/v2/weblite/sql', expect.objectContaining({ method: 'POST' }))
    db.close()
  })

  it('close() waits for a request in flight and reports its result instead of failing it', async () => {
    let respond: (value: unknown) => void = () => {}
    fetchMock.mockReturnValueOnce(new Promise(resolve => (respond = resolve)))
    const db = new Database(connectionstring)
    const events: string[] = []

    const rows = db.sql`UPDATE t SET x = 1`.then(result => (events.push('result'), result))
    while (fetchMock.mock.calls.length === 0) await new Promise(resolve => setTimeout(resolve, 1))
    const closed = new Promise<void>(resolve => db.close(() => (events.push('closed'), resolve())))
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(events).toEqual([])

    respond(jsonResponse(oneRow))
    await expect(rows).resolves.toHaveLength(1)
    await closed
    expect(events.sort()).toEqual(['closed', 'result'])
  })

  it('runs a query issued from the open callback', async () => {
    fetchMock.mockResolvedValue(jsonResponse(oneRow))

    const rows = await new Promise<any>((resolve, reject) => {
      const db = new Database(connectionstring, error => {
        if (error) return reject(error)
        db.sql`SELECT 1 AS one`.then(resolve, reject).finally(() => db.close())
      })
    })

    expect(rows[0].one).toBe(1)
  })
})

describe('HTTP gateway transport', () => {
  it('close() lets a request in flight complete, drain() settles after it, and later commands are refused', async () => {
    let respond: (value: unknown) => void = () => {}
    fetchMock.mockReturnValueOnce(new Promise(resolve => (respond = resolve)))
    const db = await openConnection()

    const result = commandResult(db, 'UPDATE t SET x = 1')
    db.close()
    const drained = db.drain()
    expect(drained).toBeInstanceOf(Promise)
    expect(db.connected).toBe(false)

    respond(jsonResponse({ data: 'OK' }))
    await expect(result).resolves.toBe('OK')
    await drained
    expect(db.drain()).toBeUndefined()
    await expect(commandResult(db, 'SELECT 1')).rejects.toMatchObject({ errorCode: 'ERR_CONNECTION_CLOSED' })
  })

  it('reports an abort as a SQLiteCloudError with ERR_ABORTED whatever the signal reason is', async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init: any) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)))
    )
    const db = await openConnection()
    const controller = new AbortController()

    const result = commandResult(db, { query: 'SELECT 1', signal: controller.signal })
    controller.abort() // the reason is the runtime's own DOMException

    await expect(result).rejects.toBeInstanceOf(SQLiteCloudError)
    await expect(result).rejects.toMatchObject({ errorCode: 'ERR_ABORTED' })
  })

  it('sends no Authorization header when unauthenticated', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: 1 }))
    const db = new SQLiteCloudHttpConnection({
      host: 'tenant.g4.sqlite.cloud',
      apikey: 'secret',
      database: 'test.sqlite',
      gatewayurl: 'http://localhost:8090',
      unauthenticated: true
    })

    await commandResult(db, 'SELECT 1')

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('posts independent commands with tagged bigint and tagged base64 BLOB bindings', async () => {
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
      bind: [
        { __sqlitecloud_bigint: '9' },
        { __sqlitecloud_blob: 'AP8Q' },
        { __sqlitecloud_blob: 'AQI=' },
        { __sqlitecloud_blob: 'AwQ=' },
        { __sqlitecloud_blob: 'BQY=' }
      ],
      database: 'test.sqlite',
      row: 'array',
      safe_integer_mode: 'number',
      capabilities: {
        blobTransferFormat: 'base64-blobs-v2',
        bigIntMarkerFormat: 'tagged-v1'
      }
    })
  })

  it('decodes tagged BLOB cells whatever the metadata says and revives JSON Buffer cells from an older gateway', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          blobTransferFormat: 'base64-blobs-v2',
          metadata: { version: 1, numberOfRows: 3, numberOfColumns: 2, columns: [{ name: 'payload' }, { name: 'one' }] },
          data: [
            [{ __sqlitecloud_blob: 'SGVsbG8=' }, 1],
            ['Hello', 1],
            [null, 1]
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          metadata: { version: 2, numberOfRows: 1, numberOfColumns: 1, columns: [{ name: 'expression' }] },
          data: [[{ type: 'Buffer', data: [0, 255, 16] }]]
        })
      )
    const db = connection()

    const blobs = await commandResult(db, 'SELECT payload, 1 AS one FROM t')
    const expression = await commandResult(db, "SELECT x'00ff10'")

    expect(blobs).toBeInstanceOf(SQLiteCloudRowset)
    expect(blobs[0].payload).toEqual(Buffer.from('Hello'))
    expect(blobs[1].payload).toBe('Hello')
    expect(blobs[2].payload).toBeNull()
    expect(blobs[0].one).toBe(1)
    expect(expression[0].expression).toEqual(Buffer.from([0, 255, 16]))
  })

  it('throws the gateway sql error with its codes instead of a generic HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          errors: [
            { status: '400', code: 'sqlite_error', detail: 'no such table: no_such_table', meta: { errorCode: '1', offsetCode: -1, externalErrorCode: '1' } }
          ]
        },
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
    const db = await openConnection()

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
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: '42n' })).mockResolvedValueOnce(jsonResponse({ bigIntMarkerFormat: 'tagged-v1', data: '42n' }))
    const db = new SQLiteCloudHttpConnection({
      host: 'tenant.g4.sqlite.cloud',
      apikey: 'secret',
      gatewayurl: 'http://localhost:8090',
      safe_integer_mode: 'mixed'
    })

    await expect(commandResult(db, 'SELECT 1')).resolves.toBe(BigInt(42))
    await expect(commandResult(db, 'SELECT 1')).resolves.toBe('42n')
  })

  it('retains a local gateway path prefix when constructing the HTTP endpoint', () => {
    expect(buildGatewaySqlUrl('tenant.g4.sqlite.cloud', 'wss://localhost:8090/proxy')).toBe('https://localhost:8090/proxy/v2/weblite/sql')
  })
})
