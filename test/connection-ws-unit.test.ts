/**
 * connection-ws-unit.test.ts - focused websocket transport helpers
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { io } from 'socket.io-client'
import { SQLiteCloudWebsocketConnection } from '../src/drivers/connection-ws'
import { OperationsQueue } from '../src/drivers/queue'
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
    connection.connectTransport({ connectionstring, host: 'host.sqlite.cloud', apikey: 'secret', websocketMaxAttachments: 321 }, jest.fn())

    expect(mockedIo).toHaveBeenCalledWith('wss://host.gateway.sqlite.cloud:443', {
      auth: { token: 'secret' },
      parser: expect.objectContaining({
        Encoder: expect.any(Function),
        Decoder: expect.any(Function)
      })
    })

    const parser = mockedIo.mock.calls[0]?.[1]?.parser as { Decoder: new () => { opts?: { maxAttachments?: number } } }
    const decoder = new parser.Decoder()
    expect(decoder.opts?.maxAttachments).toBe(321)
  })

  it('should connect to localhost gateway with the marker-augmented Host header', () => {
    const socket = {
      connected: false,
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn()
    }
    const mockedIo = io as jest.MockedFunction<typeof io>
    mockedIo.mockReturnValue(socket as any)

    const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
    connection.connectTransport(
      {
        connectionstring: 'sqlitecloud://host.sqlite.cloud/database?apikey=secret',
        host: 'host.sqlite.cloud',
        apikey: 'secret',
        gatewayurl: 'ws://localhost:8090'
      },
      jest.fn()
    )

    expect(mockedIo).toHaveBeenCalledWith(
      'ws://localhost:8090',
      expect.objectContaining({
        extraHeaders: { Host: 'host.gateway.sqlite.cloud' },
        transports: ['websocket']
      })
    )
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
            database: undefined,
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

  it('should read gateway errors from the errors array response field', done => {
    const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
    const emit = jest.fn((_event: string, _payload: any, callback: (response: any) => void) => {
      callback({
        errors: [
          {
            detail: 'Gateway validation failed.',
            errorCode: '40001',
            externalErrorCode: '0',
            offsetCode: -1
          }
        ]
      })
    })
    connection.socket = { connected: true, emit }
    connection.config = {}

    connection.transportCommands('SELECT 1', (error: any, results?: SQLiteCloudRowset) => {
      try {
        expect(results).toBeUndefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('Gateway validation failed.')
        expect(error.errorCode).toBe('40001')
        expect(error.externalErrorCode).toBe('0')
        expect(error.offsetCode).toBe(-1)
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

  describe('in-flight commands', () => {
    function connectMockedSocket(config: Record<string, any> = {}) {
      const handlers: Record<string, (...args: any[]) => void> = {}
      let onceHandlers: { event: string; handler: (...args: any[]) => void }[] = []
      const socket = {
        connected: true,
        active: true,
        on: jest.fn((event: string, handler: (...args: any[]) => void) => {
          handlers[event] = handler
        }),
        once: jest.fn((event: string, handler: (...args: any[]) => void) => {
          onceHandlers.push({ event, handler })
        }),
        off: jest.fn((event: string, handler: (...args: any[]) => void) => {
          onceHandlers = onceHandlers.filter(once => once.event !== event || once.handler !== handler)
        }),
        emit: jest.fn(),
        connect: jest.fn(),
        removeAllListeners: jest.fn(() => {
          onceHandlers = []
        }),
        close: jest.fn()
      }
      const mockedIo = io as jest.MockedFunction<typeof io>
      mockedIo.mockReturnValue(socket as any)

      // what socket.io does on a (re)connection
      const reconnect = () => {
        socket.connected = true
        handlers.connect?.()
        const pending = onceHandlers.filter(once => once.event === 'connect')
        onceHandlers = onceHandlers.filter(once => once.event !== 'connect')
        pending.forEach(once => once.handler())
      }
      // what socket.io does when the connection drops and it is going to reconnect
      const drop = (reason = 'transport close') => {
        socket.connected = false
        handlers.disconnect?.(reason)
      }

      const connectCallback = jest.fn()
      const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
      connection.operations = { clear: jest.fn() }
      connection.connectTransport(
        { connectionstring: 'sqlitecloud://host.sqlite.cloud/database?apikey=secret', host: 'host.sqlite.cloud', apikey: 'secret', ...config },
        connectCallback
      )
      reconnect()

      return { connection, socket, handlers, connectCallback, reconnect, drop }
    }

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should fail the command in flight and close when the connection drops without websocketReconnect', () => {
      const { connection, socket, handlers, connectCallback } = connectMockedSocket({ websocketReconnect: false })
      const commandCallback = jest.fn()

      connection.transportCommands('SELECT 1', commandCallback)
      expect(socket.emit).toHaveBeenCalledTimes(1)
      expect(commandCallback).not.toHaveBeenCalled()

      handlers.disconnect?.('transport error')

      expect(commandCallback).toHaveBeenCalledTimes(1)
      expect(commandCallback.mock.calls[0]?.[0]).toMatchObject({ message: 'Disconnected', errorCode: 'ERR_CONNECTION_ENDED', cause: 'transport error' })
      expect(socket.close).toHaveBeenCalled()
      expect(connection.connected).toBe(false)

      // the connect callback already reported a successful connection and must not be called again
      expect(connectCallback).toHaveBeenCalledTimes(1)
      expect(connectCallback).toHaveBeenCalledWith(null)
    })

    it('should report a disconnection before connect to the connect callback', () => {
      const handlers: Record<string, (...args: any[]) => void> = {}
      const socket = {
        connected: false,
        on: jest.fn((event: string, handler: (...args: any[]) => void) => {
          handlers[event] = handler
        }),
        removeAllListeners: jest.fn(),
        close: jest.fn()
      }
      ;(io as jest.MockedFunction<typeof io>).mockReturnValue(socket as any)

      const connectCallback = jest.fn()
      const connection = Object.create(SQLiteCloudWebsocketConnection.prototype) as any
      connection.operations = { clear: jest.fn() }
      connection.connectTransport({ connectionstring: 'sqlitecloud://host.sqlite.cloud/database', host: 'host.sqlite.cloud' }, connectCallback)

      handlers.disconnect?.('transport close')

      expect(connectCallback).toHaveBeenCalledTimes(1)
      expect(connectCallback.mock.calls[0]?.[0]).toMatchObject({ errorCode: 'ERR_CONNECTION_ENDED' })
    })

    it('should fail the command in flight when the connection is closed', () => {
      const { connection } = connectMockedSocket()
      const commandCallback = jest.fn()

      connection.transportCommands('SELECT 1', commandCallback)
      connection.close()

      expect(commandCallback).toHaveBeenCalledTimes(1)
      expect(commandCallback.mock.calls[0]?.[0]).toMatchObject({ errorCode: 'ERR_CONNECTION_CLOSED' })
    })

    it('should fail the command in flight after the configured timeout and ignore a late response', () => {
      jest.useFakeTimers()
      const { connection, socket } = connectMockedSocket({ timeout: 1000 })
      const commandCallback = jest.fn()

      connection.transportCommands('SELECT 1', commandCallback)

      jest.advanceTimersByTime(999)
      expect(commandCallback).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(commandCallback).toHaveBeenCalledTimes(1)
      expect(commandCallback.mock.calls[0]?.[0]).toMatchObject({ errorCode: 'ERR_CONNECTION_TIMEOUT' })

      const ack = socket.emit.mock.calls[0]?.[2] as (response: any) => void
      ack({ data: 1 })
      expect(commandCallback).toHaveBeenCalledTimes(1)
    })

    it('should not fail a completed command when the connection drops later', () => {
      jest.useFakeTimers()
      const { connection, socket, handlers } = connectMockedSocket({ timeout: 1000 })
      const commandCallback = jest.fn()

      connection.transportCommands('SELECT 1', commandCallback)
      const ack = socket.emit.mock.calls[0]?.[2] as (response: any) => void
      ack({ data: 1 })

      handlers.disconnect?.('transport close')
      jest.advanceTimersByTime(1000)

      expect(commandCallback).toHaveBeenCalledTimes(1)
      expect(commandCallback).toHaveBeenCalledWith(null, 1)
    })
    it('should reconnect after the connection drops and send later commands on the new connection', () => {
      const { connection, socket, connectCallback, reconnect, drop } = connectMockedSocket()
      const inFlight = jest.fn()
      connection.transportCommands('INSERT INTO t VALUES (1)', inFlight)

      drop()

      // the command in flight may or may not have run, so it fails and is not sent again
      expect(inFlight).toHaveBeenCalledTimes(1)
      expect(inFlight.mock.calls[0]?.[0]).toMatchObject({ errorCode: 'ERR_CONNECTION_ENDED', cause: 'transport close' })
      expect(socket.close).not.toHaveBeenCalled()
      expect(connection.connected).toBe(false)
      expect(connection.reconnecting).toBe(true)

      const later = jest.fn()
      connection.transportCommands('SELECT 1', later)
      expect(socket.emit).toHaveBeenCalledTimes(1)

      reconnect()
      expect(socket.emit).toHaveBeenCalledTimes(2)
      const ack = socket.emit.mock.calls[1]?.[2] as (response: any) => void
      ack({ data: 1 })

      expect(later).toHaveBeenCalledWith(null, 1)
      expect(connectCallback).toHaveBeenCalledTimes(1)
    })

    it('should fail a command that waits too long for the reconnection', () => {
      jest.useFakeTimers()
      const { connection, socket, reconnect, drop } = connectMockedSocket({ timeout: 60_000 })
      drop()

      const command = jest.fn()
      connection.transportCommands('SELECT 1', command)
      jest.advanceTimersByTime(20_000)

      expect(command).toHaveBeenCalledTimes(1)
      expect(command.mock.calls[0]?.[0]).toMatchObject({ errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' })

      reconnect()
      expect(socket.emit).not.toHaveBeenCalled()
    })

    it('should reconnect when the server disconnects the socket', () => {
      const { socket, drop } = connectMockedSocket()
      drop('io server disconnect')
      expect(socket.connect).toHaveBeenCalledTimes(1)
      expect(socket.close).not.toHaveBeenCalled()
    })

    it('should ignore failed reconnection attempts while socket.io keeps trying', () => {
      const { connection, socket, handlers, drop } = connectMockedSocket()
      drop()
      handlers.connect_error?.(new Error('xhr poll error'))
      expect(socket.close).not.toHaveBeenCalled()
      expect(connection.reconnecting).toBe(true)
    })

    it('should fail commands waiting for the reconnection when the connection is closed', () => {
      const { connection, drop } = connectMockedSocket()
      drop()
      const command = jest.fn()
      connection.transportCommands('SELECT 1', command)
      connection.close()
      expect(command).toHaveBeenCalledTimes(1)
      expect(command.mock.calls[0]?.[0]).toMatchObject({ errorCode: 'ERR_CONNECTION_CLOSED' })
    })

    it('should not send a command whose signal is already aborted', () => {
      const { connection, socket } = connectMockedSocket()
      const controller = new AbortController()
      controller.abort()
      const command = jest.fn()

      connection.transportCommands({ query: 'SELECT 1', signal: controller.signal }, command)

      expect(socket.emit).not.toHaveBeenCalled()
      expect(command.mock.calls[0]?.[0]).toMatchObject({ name: 'AbortError' })
    })

    it('should fail a running command when its signal aborts and ignore the late response', () => {
      const { connection, socket } = connectMockedSocket()
      const controller = new AbortController()
      const command = jest.fn()

      connection.transportCommands({ query: 'SELECT 1', signal: controller.signal }, command)
      const reason = new Error('stop')
      controller.abort(reason)

      expect(command).toHaveBeenCalledTimes(1)
      expect(command).toHaveBeenCalledWith(reason, undefined)

      const ack = socket.emit.mock.calls[0]?.[2] as (response: any) => void
      ack({ data: 1 })
      expect(command).toHaveBeenCalledTimes(1)
    })

    it('should send commands one at a time by default', () => {
      const { connection, socket } = connectMockedSocket()
      connection.operations = new OperationsQueue()

      connection.sendCommands('SELECT 1')
      connection.sendCommands('SELECT 2')
      expect(socket.emit).toHaveBeenCalledTimes(1)

      const ack = socket.emit.mock.calls[0]?.[2] as (response: any) => void
      ack({ data: 1 })
      expect(socket.emit).toHaveBeenCalledTimes(2)
    })

    it('should send commands without waiting for the previous ones with websocketConcurrent', () => {
      const { connection, socket } = connectMockedSocket({ websocketConcurrent: true })
      connection.operations = new OperationsQueue()
      const first = jest.fn()
      const second = jest.fn()

      connection.sendCommands('SELECT 1', first)
      connection.sendCommands('SELECT 2', second)
      expect(socket.emit).toHaveBeenCalledTimes(2)
      expect(socket.emit.mock.calls.map(call => (call[1] as any).sql)).toEqual(['SELECT 1', 'SELECT 2'])

      // responses can arrive in any order
      ;(socket.emit.mock.calls[1]?.[2] as (response: any) => void)({ data: 2 })
      ;(socket.emit.mock.calls[0]?.[2] as (response: any) => void)({ data: 1 })
      expect(second).toHaveBeenCalledWith(null, 2)
      expect(first).toHaveBeenCalledWith(null, 1)
    })
  })
})
