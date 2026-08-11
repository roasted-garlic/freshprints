import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { shouldApplyCatalogUrlSearchToLocal } from './shouldApplyCatalogUrlSearchToLocal.ts'

describe('shouldApplyCatalogUrlSearchToLocal', () => {
  it('rejects stale self-authored URL echo while local input is ahead', () => {
    assert.equal(
      shouldApplyCatalogUrlSearchToLocal({
        urlQ: 'fun',
        lastSelfPushedQ: 'fun',
      }),
      false,
    )
  })

  it('applies genuine Back/Forward when URL differs from last self-push', () => {
    assert.equal(
      shouldApplyCatalogUrlSearchToLocal({
        urlQ: 'kill',
        lastSelfPushedQ: 'funny',
      }),
      true,
    )
  })

  it('applies initial / unknown navigation when lastSelfPushedQ is null', () => {
    assert.equal(
      shouldApplyCatalogUrlSearchToLocal({
        urlQ: 'halftone',
        lastSelfPushedQ: null,
      }),
      true,
    )
  })

  it('rejects echo of cleared search (empty q self-push)', () => {
    assert.equal(
      shouldApplyCatalogUrlSearchToLocal({
        urlQ: '',
        lastSelfPushedQ: '',
      }),
      false,
    )
  })
})
