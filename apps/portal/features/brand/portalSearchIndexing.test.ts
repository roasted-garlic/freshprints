import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isPortalSearchIndexingEnabled,
  portalRobotsAllowPaths,
  portalRobotsDisallowPaths,
  portalSitemapStaticPaths,
  PORTAL_PRODUCTION_SEARCH_HOST,
} from './portalSearchIndexing.ts'

describe('isPortalSearchIndexingEnabled', () => {
  it('fails closed for myprintrequest.dev', () => {
    assert.equal(
      isPortalSearchIndexingEnabled({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.dev',
      }),
      false,
    )
  })

  it('fails closed for localhost', () => {
    assert.equal(
      isPortalSearchIndexingEnabled({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'http://localhost:3100',
      }),
      false,
    )
  })

  it('enables only for production customer host', () => {
    assert.equal(
      isPortalSearchIndexingEnabled({
        NEXT_PUBLIC_PORTAL_ORIGIN: `https://${PORTAL_PRODUCTION_SEARCH_HOST}`,
      }),
      true,
    )
    assert.equal(
      isPortalSearchIndexingEnabled({
        NEXT_PUBLIC_PORTAL_ORIGIN: `https://www.${PORTAL_PRODUCTION_SEARCH_HOST}`,
      }),
      true,
    )
  })

  it('does not enable for non-production hosts even when NODE_ENV is production', () => {
    assert.equal(
      isPortalSearchIndexingEnabled({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://staging.example.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-prod',
        NODE_ENV: 'production',
      }),
      false,
    )
  })
})

describe('portal robots path lists', () => {
  it('allows public browse, help, and share prefixes', () => {
    const allow = portalRobotsAllowPaths()
    assert.ok(allow.includes('/'))
    assert.ok(allow.includes('/catalog'))
    assert.ok(allow.includes('/help'))
    assert.ok(allow.includes('/share/design'))
  })

  it('disallows gated routes', () => {
    const disallow = portalRobotsDisallowPaths()
    for (const path of [
      '/requests',
      '/dashboard',
      '/favorites',
      '/custom-designs',
      '/donate',
      '/login',
      '/register',
    ]) {
      assert.ok(disallow.includes(path), `expected disallow ${path}`)
    }
  })
})

describe('portalSitemapStaticPaths', () => {
  it('includes home, catalog, library, and help', () => {
    const paths = portalSitemapStaticPaths()
    assert.ok(paths.includes('/'))
    assert.ok(paths.includes('/catalog'))
    assert.ok(paths.includes('/catalog/library'))
    assert.ok(paths.includes('/help'))
  })
})
