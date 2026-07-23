import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PORTAL_PRODUCTION_SEARCH_HOST } from '../../brand/portalSearchIndexing.ts'
import { buildPortalHelpPageMetadata } from './portalHelpMeta.ts'

describe('buildPortalHelpPageMetadata', () => {
  it('sets noindex on non-production hosts (fail-closed)', () => {
    const meta = buildPortalHelpPageMetadata({
      env: { NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.dev' },
    })

    assert.equal(meta.title, 'FAQ and How To')
    assert.deepEqual(meta.robots, { index: false, follow: true })
    assert.equal(
      meta.alternates && 'canonical' in meta.alternates ? meta.alternates.canonical : undefined,
      'https://myprintrequest.dev/help',
    )
  })

  it('allows index only on production customer host', () => {
    const meta = buildPortalHelpPageMetadata({
      env: { NEXT_PUBLIC_PORTAL_ORIGIN: `https://${PORTAL_PRODUCTION_SEARCH_HOST}` },
    })

    assert.deepEqual(meta.robots, { index: true, follow: true })
    assert.equal(
      meta.alternates && 'canonical' in meta.alternates ? meta.alternates.canonical : undefined,
      `https://${PORTAL_PRODUCTION_SEARCH_HOST}/help`,
    )
  })
})
