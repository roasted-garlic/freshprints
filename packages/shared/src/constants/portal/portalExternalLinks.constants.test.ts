import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  FRESH_PRINTS_WHATNOT_HANDLE,
  FRESH_PRINTS_WHATNOT_PROFILE_URL,
} from './portalExternalLinks.constants'

describe('portalExternalLinks.constants', () => {
  it('exports the canonical Fresh Prints Whatnot profile URL and handle', () => {
    assert.equal(FRESH_PRINTS_WHATNOT_PROFILE_URL, 'https://www.whatnot.com/user/funkyfreshprints')
    assert.equal(FRESH_PRINTS_WHATNOT_HANDLE, '@funkyfreshprints')
  })
})
