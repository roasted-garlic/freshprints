import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { pickHourlyRotatedIndex } from './pickHourlyRotatedIndex'

describe('pickHourlyRotatedIndex', () => {
  it('returns 0 for empty samples', () => {
    assert.equal(pickHourlyRotatedIndex(0), 0)
    assert.equal(pickHourlyRotatedIndex(-1), 0)
  })

  it('is stable within the same UTC hour', () => {
    const hourStart = Date.UTC(2026, 6, 20, 12, 0, 0)
    const laterSameHour = Date.UTC(2026, 6, 20, 12, 59, 59)
    assert.equal(pickHourlyRotatedIndex(40, hourStart), pickHourlyRotatedIndex(40, laterSameHour))
  })

  it('rotates across UTC hours', () => {
    const hourA = Date.UTC(2026, 6, 20, 12, 0, 0)
    const hourB = Date.UTC(2026, 6, 20, 13, 0, 0)
    const a = pickHourlyRotatedIndex(40, hourA)
    const b = pickHourlyRotatedIndex(40, hourB)
    assert.equal((a + 1) % 40, b)
  })
})
