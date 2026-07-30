import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolvePortalAnalyticsConfig } from './portalAnalyticsConfig.ts'

describe('resolvePortalAnalyticsConfig', () => {
  it('is disabled when the Measurement ID is missing', () => {
    const config = resolvePortalAnalyticsConfig({
      NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.com',
    })
    assert.equal(config.enabled, false)
    assert.equal(config.measurementId, null)
  })

  it('is disabled on the dev host even with a Measurement ID set', () => {
    const config = resolvePortalAnalyticsConfig({
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev',
    })
    assert.equal(config.enabled, false)
  })

  it('is disabled on a tunnel host even with a Measurement ID set', () => {
    const config = resolvePortalAnalyticsConfig({
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123',
      NEXT_PUBLIC_PORTAL_ORIGIN: 'https://random.trycloudflare.com',
    })
    assert.equal(config.enabled, false)
  })

  it('is enabled only on the production host with a Measurement ID set', () => {
    const config = resolvePortalAnalyticsConfig({
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123',
      NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.com',
    })
    assert.equal(config.enabled, true)
    assert.equal(config.measurementId, 'G-TEST123')
  })

  it('is enabled on the www. production alias', () => {
    const config = resolvePortalAnalyticsConfig({
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123',
      NEXT_PUBLIC_PORTAL_ORIGIN: 'https://www.myprintrequest.com',
    })
    assert.equal(config.enabled, true)
  })

  it('trims whitespace from the Measurement ID and treats blank as absent', () => {
    const config = resolvePortalAnalyticsConfig({
      NEXT_PUBLIC_GA_MEASUREMENT_ID: '   ',
      NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.com',
    })
    assert.equal(config.enabled, false)
    assert.equal(config.measurementId, null)
  })
})
