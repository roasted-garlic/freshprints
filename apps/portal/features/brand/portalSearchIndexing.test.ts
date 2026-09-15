import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildPortalDisabledIndexingRobots,
  buildPortalEnabledIndexingRobots,
  isPortalSearchIndexingEnabled,
  portalRobotsAllowPaths,
  portalRobotsDisallowPaths,
  portalSitemapStaticPaths,
  PORTAL_DISABLED_INDEXING_X_ROBOTS_TAG,
  PORTAL_PRODUCTION_SEARCH_HOST,
  shouldShowPortalDevelopmentServerBanner,
  shouldShowPortalDevelopmentAuthOverlay,
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

describe('disabled indexing robots pack', () => {
  it('emits explicit noindex directives for DEV', () => {
    assert.deepEqual(buildPortalDisabledIndexingRobots(), {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    })
    assert.equal(
      PORTAL_DISABLED_INDEXING_X_ROBOTS_TAG,
      'noindex, nofollow, noarchive, nosnippet',
    )
  })

  it('keeps production indexing robots unchanged', () => {
    assert.deepEqual(buildPortalEnabledIndexingRobots(), { index: true, follow: true })
  })
})

describe('shouldShowPortalDevelopmentServerBanner', () => {
  it('shows on DEV origin', () => {
    assert.equal(
      shouldShowPortalDevelopmentServerBanner({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.dev',
      }),
      true,
    )
  })

  it('shows on fresh-prints-dev even if origin is mistakenly production', () => {
    assert.equal(
      shouldShowPortalDevelopmentServerBanner({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev',
      }),
      true,
    )
  })

  it('hides on production host without DEV project id', () => {
    assert.equal(
      shouldShowPortalDevelopmentServerBanner({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-prod',
      }),
      false,
    )
  })
})

describe('shouldShowPortalDevelopmentAuthOverlay', () => {
  it('shows only when Firebase project is fresh-prints-dev', () => {
    assert.equal(
      shouldShowPortalDevelopmentAuthOverlay({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.dev',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev',
      }),
      true,
    )
  })

  it('never mounts on production project id', () => {
    assert.equal(
      shouldShowPortalDevelopmentAuthOverlay({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-prod',
      }),
      false,
    )
    assert.equal(
      shouldShowPortalDevelopmentAuthOverlay({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'http://localhost:3100',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-prod',
      }),
      false,
    )
  })

  it('does not mount for production project even on DEV hostname', () => {
    assert.equal(
      shouldShowPortalDevelopmentAuthOverlay({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.dev',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-prod',
      }),
      false,
    )
  })

  it('falls back to DEV hostname when project id is unset', () => {
    assert.equal(
      shouldShowPortalDevelopmentAuthOverlay({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.dev',
      }),
      true,
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
