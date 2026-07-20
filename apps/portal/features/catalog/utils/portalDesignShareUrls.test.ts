import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildPortalDesignDeepLinkPath,
  buildPortalDesignSharePath,
  buildPortalDesignShareUrl,
  isValidPortalDesignShareId,
  readPortalDesignDeepLinkId,
} from './portalDesignShareUrls'

describe('portalDesignShareUrls', () => {
  it('validates design ids', () => {
    assert.equal(isValidPortalDesignShareId('abc_123-X'), true)
    assert.equal(isValidPortalDesignShareId('../evil'), false)
    assert.equal(isValidPortalDesignShareId(''), false)
  })

  it('builds share and deep-link paths', () => {
    assert.equal(buildPortalDesignSharePath('design-1'), '/share/design/design-1')
    assert.equal(buildPortalDesignDeepLinkPath('design-1'), '/catalog?designId=design-1')
    // Node (no window): uses portal origin map
    assert.equal(
      buildPortalDesignShareUrl('design-1', {
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev',
      }),
      'https://myprintrequest.dev/share/design/design-1',
    )
  })

  it('reads designId from search params', () => {
    assert.equal(readPortalDesignDeepLinkId(new URLSearchParams('designId=abc')), 'abc')
    assert.equal(readPortalDesignDeepLinkId(new URLSearchParams('designId=../x')), null)
  })
})
