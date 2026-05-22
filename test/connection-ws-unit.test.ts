/**
 * connection-ws-unit.test.ts - focused websocket transport helpers
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { io } from 'socket.io-client'
import { SQLiteCloudWebsocketConnection } from '../src/drivers/connection-ws'
import { SQLiteCloudRowset } from '../src/drivers/rowset'
import { decodeBigIntMarkers, encodeBigIntMarkers } from '../src/drivers/utilities'

jest.mock('socket.io-client', () => ({
  io: jest.fn()
}))

afterEach(() => {
  jest.clearAllMocks()
})

describe('websocket transport helpers', () => {
  it('should connect with a parser that honors websocketMaxAttachments', () => {
    const socket = {
      connected: false,
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn()
    }
    const mockedIo = io as jest.MockedFunction<typeof io>
    mockedIo.mockReturnValue(socket as any)

    const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
    const connectionstring = 'sqlitecloud://host.sqlite.cloud/database?apikey=secret'
    connection.connectTransport({ connectionstring, host: 'host.sqlite.cloud', websocketMaxAttachments: 321 }, jest.fn())

    expect(mockedIo).toHaveBeenCalledWith('wss://host.sqlite.cloud:443', {
      auth: { token: connectionstring },
      parser: expect.objectContaining({
        Encoder: expect.any(Function),
        Decoder: expect.any(Function)
      })
    })

    const parser = mockedIo.mock.calls[0]?.[1]?.parser as { Decoder: new () => { opts?: { maxAttachments?: number } } }
    const decoder = new parser.Decoder()
    expect(decoder.opts?.maxAttachments).toBe(321)
  })

  it('should encode bigint values before sending JSON payloads', () => {
    expect(
      encodeBigIntMarkers({
        id: BigInt('9223372036854775807'),
        values: [1, BigInt(2)]
      })
    ).toEqual({
      id: '9223372036854775807n',
      values: [1, '2n']
    })
  })

  it('should decode bigint markers when safe integer mode is bigint or mixed', () => {
    expect(decodeBigIntMarkers('9223372036854775807n', 'bigint')).toBe(BigInt('9223372036854775807'))
    expect(decodeBigIntMarkers({ id: '9223372036854775807n' }, 'mixed')).toEqual({
      id: BigInt('9223372036854775807')
    })
  })

  it('should not decode bigint markers when safe integer mode is number', () => {
    expect(decodeBigIntMarkers('9223372036854775807n', 'number')).toBe('9223372036854775807n')
  })

  it('should send the default blob capability and encoded bind parameters to the gateway', done => {
    const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
    const emit = jest.fn((_event: string, _payload: any, callback: (response: any) => void) => {
      callback({ data: '123n' })
    })
    connection.socket = { connected: true, emit }
    connection.config = { safe_integer_mode: 'bigint' }

    connection.transportCommands({ query: 'SELECT ?', parameters: [BigInt(123)] }, (error: Error | null, results: any) => {
      try {
        expect(error).toBeNull()
        expect(results).toBe(BigInt(123))
        expect(emit).toHaveBeenCalledWith(
          'GET /v2/weblite/sql',
          {
            sql: 'SELECT ?',
            bind: ['123n'],
            row: 'array',
            safe_integer_mode: 'bigint',
            capabilities: {
              blobTransferFormat: 'base64-blobs-v1'
            }
          },
          expect.any(Function)
        )
        done()
      } catch (error) {
        done(error as Error)
      }
    })
  })

  it('should send an overridden websocket blob format capability', done => {
    const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
    const emit = jest.fn((_event: string, _payload: any, callback: (response: any) => void) => {
      callback({ data: [] })
    })
    connection.socket = { connected: true, emit }
    connection.config = { websocketBlobFormat: 'socketio-blobs-v1' }

    connection.transportCommands('SELECT 1', error => {
      try {
        expect(error).toBeNull()
        expect(emit).toHaveBeenCalledWith(
          'GET /v2/weblite/sql',
          expect.objectContaining({
            capabilities: {
              blobTransferFormat: 'socketio-blobs-v1'
            }
          }),
          expect.any(Function)
        )
        done()
      } catch (error) {
        done(error as Error)
      }
    })
  })

  it('should decode base64 blob columns using rowset metadata only', done => {
    const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
    const emit = jest.fn((_event: string, _payload: any, callback: (response: any) => void) => {
      callback({
        blobTransferFormat: 'base64-blobs-v1',
        metadata: {
          version: 2,
          numberOfRows: 1,
          numberOfColumns: 3,
          columns: [
            { name: 'id', type: 'INTEGER' },
            { name: 'payload', type: 'BLOB' },
            { name: 'note', type: 'TEXT' }
          ]
        },
        data: [[1, 'AQID', 'AQID']]
      })
    })
    connection.socket = { connected: true, emit }
    connection.config = {}

    connection.transportCommands('SELECT 1', (error: Error | null, results?: SQLiteCloudRowset) => {
      try {
        expect(error).toBeNull()
        expect(results).toBeInstanceOf(SQLiteCloudRowset)
        expect(results?.[0]?.id).toBe(1)
        expect(results?.[0]?.payload).toBeInstanceOf(Buffer)
        expect((results?.[0]?.payload as Buffer).equals(Buffer.from([1, 2, 3]))).toBe(true)
        expect(results?.[0]?.note).toBe('AQID')
        done()
      } catch (error) {
        done(error as Error)
      }
    })
  })

  it('should surface an actionable error when socket.io attachment limits are exceeded', () => {
    const handlers: Record<string, (...args: any[]) => void> = {}
    const socket = {
      connected: true,
      on: jest.fn((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler
      }),
      removeAllListeners: jest.fn(),
      close: jest.fn()
    }
    const mockedIo = io as jest.MockedFunction<typeof io>
    mockedIo.mockReturnValue(socket as any)

    const callback = jest.fn()
    const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
    connection.operations = { clear: jest.fn() }

    connection.connectTransport(
      {
        connectionstring: 'sqlitecloud://host.sqlite.cloud/database?apikey=secret',
        host: 'host.sqlite.cloud',
        websocketMaxAttachments: 7
      },
      callback
    )

    handlers.disconnect?.('parse error', new Error('Illegal attachments'))

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0]?.[0]).toMatchObject({
      errorCode: 'ERR_WEBSOCKET_MAX_ATTACHMENTS_EXCEEDED'
    })
    expect((callback.mock.calls[0]?.[0] as Error).message).toContain('websocketMaxAttachments')
  })
})
