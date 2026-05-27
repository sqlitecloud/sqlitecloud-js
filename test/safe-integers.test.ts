import { describe, expect, test } from '@jest/globals'
import { decodeBigIntMarkers, encodeBigIntMarkers, parseSafeIntegerMode } from '../src/drivers/utilities'

describe('safe integer markers', () => {
  test('parseSafeIntegerMode validates supported values', () => {
    expect(parseSafeIntegerMode('bigint')).toBe('bigint')
    expect(parseSafeIntegerMode('mixed')).toBe('mixed')
    expect(parseSafeIntegerMode('number')).toBe('number')
    expect(parseSafeIntegerMode('invalid')).toBe('number')
  })

  test('decodeBigIntMarkers decodes marker strings only for lossless modes', () => {
    expect(decodeBigIntMarkers('9223372036854775807n', 'bigint')).toBe(BigInt('9223372036854775807'))
    expect(decodeBigIntMarkers({ id: '9223372036854775807n' }, 'mixed')).toEqual({ id: BigInt('9223372036854775807') })
    expect(decodeBigIntMarkers('9223372036854775807n', 'number')).toBe('9223372036854775807n')
  })

  test('encodeBigIntMarkers encodes bigint values and bigint-mode integer numbers', () => {
    expect(encodeBigIntMarkers({ id: BigInt('9223372036854775807'), count: 42 })).toEqual({ id: '9223372036854775807n', count: 42 })
    expect(encodeBigIntMarkers(9223372036854776000)).toBe(9223372036854776000)
  })
})
