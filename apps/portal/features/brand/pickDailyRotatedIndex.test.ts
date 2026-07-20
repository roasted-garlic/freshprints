import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { pickDailyRotatedIndex } from './pickDailyRotatedIndex'

describe('pickDailyRotatedIndex', () => {
  it('returns 0 for empty samples', () => {
    assert.equal(pickDailyRotatedIndex(0), 0)
    assert.equal(pickDailyRotatedIndex(-1), 0)
  })

  it('is stable within the same UTC day', () => {
    const dayStart = Date.UTC(2026, 6, 20, 0, 0, 0)
    const laterSameDay = Date.UTC(2026, 6, 20, 23, 59, 59)
    assert.equal(pickDailyRotatedIndex(40, dayStart), pickDailyRotatedIndex(40, laterSameDay))
  })

  it('rotates across UTC days', () => {
    const dayA = Date.UTC(2026, 6, 20, 12, 0, 0)
    const dayB = Date.UTC(2026, 6, 21, 12, 0, 0)
    const a = pickDailyRotatedIndex(40, dayA)
    const b = pickDailyRotatedIndex(40, dayB)
    assert.equal((a + 1) % 40, b)
  })
})
