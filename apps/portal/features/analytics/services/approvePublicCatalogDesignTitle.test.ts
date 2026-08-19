import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  PUBLIC_CATALOG_DESIGN_TITLE_MAX_LENGTH,
  approvePublicCatalogDesignTitle,
  formatPublicCatalogDesignPageTitle,
} from './approvePublicCatalogDesignTitle.ts'

describe('approvePublicCatalogDesignTitle', () => {
  it('accepts a trimmed public catalog title', () => {
    assert.equal(approvePublicCatalogDesignTitle('  Fresh Prints Logo  '), 'Fresh Prints Logo')
  })

  it('rejects empty, blank, non-string, and overlong values', () => {
    assert.equal(approvePublicCatalogDesignTitle(''), null)
    assert.equal(approvePublicCatalogDesignTitle('   '), null)
    assert.equal(approvePublicCatalogDesignTitle(null), null)
    assert.equal(approvePublicCatalogDesignTitle(12), null)
    assert.equal(
      approvePublicCatalogDesignTitle('x'.repeat(PUBLIC_CATALOG_DESIGN_TITLE_MAX_LENGTH + 1)),
      null,
    )
  })

  it('accepts a title at the Studio max length', () => {
    const title = 'x'.repeat(PUBLIC_CATALOG_DESIGN_TITLE_MAX_LENGTH)
    assert.equal(approvePublicCatalogDesignTitle(title), title)
  })
})

describe('formatPublicCatalogDesignPageTitle', () => {
  it('uses the exact colon surface prefixes on page_title only', () => {
    assert.equal(
      formatPublicCatalogDesignPageTitle('modal', 'Alpha Male'),
      'Modal: Alpha Male',
    )
    assert.equal(
      formatPublicCatalogDesignPageTitle('share_page', 'Alpha Male'),
      'Share: Alpha Male',
    )
  })
})
