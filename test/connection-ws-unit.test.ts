/**
 * connection-ws-unit.test.ts - websocket transport helpers
 */

import { describe, expect, it, jest } from '@jest/globals'
import { SQLiteCloudWebsocketConnection } from '../src/drivers/connection-ws'
import { decodeBigIntMarkers, encodeBigIntMarkers } from '../src/drivers/utilities'

describe('websocket bigint markers', () => {
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

  it('should send safe integer mode and encoded bind parameters to the gateway', done => {
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
            safe_integer_mode: 'bigint'
          },
          expect.any(Function)
        )
        done()
      } catch (error) {
        done(error as Error)
      }
    })
  })
})
