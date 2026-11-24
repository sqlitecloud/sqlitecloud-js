import { describe, expect, test } from '@jest/globals'
import { decodeBigIntMarkers, encodeBigIntMarkers, parseSafeIntegerMode } from '../src/drivers/utilities'

describe('safe integer markers', () => {
  test('parseSafeIntegerMode validates supported values', () => {
    expect(parseSafeIntegerMode('bigint')).toBe('bigint')
    expect(parseSafeIntegerMode('mixed')).toBe('mixed')
    expect(parseSafeIntegerMode('number')).toBe('number')
    expect(parseSafeIntegerMode('invalid')).toBe('number')
  })

  test('decodeBigIntMarkers decodes tagged markers only for lossless modes', () => {
    expect(decodeBigIntMarkers({ __sqlitecloud_bigint: '9223372036854775807' }, 'bigint')).toBe(BigInt('9223372036854775807'))
    expect(decodeBigIntMarkers({ id: { __sqlitecloud_bigint: '9223372036854775807' } }, 'mixed')).toEqual({ id: BigInt('9223372036854775807') })
    expect(decodeBigIntMarkers('9223372036854775807n', 'number')).toBe('9223372036854775807n')
    expect(decodeBigIntMarkers('9223372036854775807n', 'mixed')).toBe('9223372036854775807n')
  })

  test('encodeBigIntMarkers encodes bigint values and bigint-mode integer numbers', () => {
    expect(encodeBigIntMarkers({ id: BigInt('9223372036854775807'), count: 42 })).toEqual({ id: { __sqlitecloud_bigint: '9223372036854775807' }, count: 42 })
    expect(encodeBigIntMarkers(9223372036854776000)).toBe(9223372036854776000)
  })

  test('encodeBigIntMarkers preserves binary values for the transport to encode', () => {
    const bytes = new Uint8Array([0, 255, 16])
    expect(encodeBigIntMarkers(bytes)).toBe(bytes)
  })
})
