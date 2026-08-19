import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { approvePublicCatalogDesignId } from './approvePublicCatalogDesignId.ts'

describe('approvePublicCatalogDesignId', () => {
  it('accepts a trimmed public catalog design id', () => {
    assert.equal(approvePublicCatalogDesignId('  abc123xyz  '), 'abc123xyz')
    assert.equal(approvePublicCatalogDesignId('abc_123-X'), 'abc_123-X')
  })

  it('rejects empty, non-string, and non-catalog identifier shapes', () => {
    assert.equal(approvePublicCatalogDesignId(''), null)
    assert.equal(approvePublicCatalogDesignId('   '), null)
    assert.equal(approvePublicCatalogDesignId(null), null)
    assert.equal(approvePublicCatalogDesignId(12), null)
    assert.equal(approvePublicCatalogDesignId('../evil'), null)
    assert.equal(approvePublicCatalogDesignId('user@example.com'), null)
    assert.equal(approvePublicCatalogDesignId('file.png'), null)
    assert.equal(approvePublicCatalogDesignId('id with spaces'), null)
  })
})
