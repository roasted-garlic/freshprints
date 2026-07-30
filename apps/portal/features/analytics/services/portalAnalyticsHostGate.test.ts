import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isPortalAnalyticsHostAllowed,
  PORTAL_ANALYTICS_PRODUCTION_HOST,
} from './portalAnalyticsHostGate.ts'

describe('isPortalAnalyticsHostAllowed', () => {
  it('fails closed for myprintrequest.dev', () => {
    assert.equal(
      isPortalAnalyticsHostAllowed({ NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.dev' }),
      false,
    )
  })

  it('fails closed for localhost', () => {
    assert.equal(
      isPortalAnalyticsHostAllowed({ NEXT_PUBLIC_PORTAL_ORIGIN: 'http://localhost:3100' }),
      false,
    )
  })

  it('fails closed for a tunnel host', () => {
    assert.equal(
      isPortalAnalyticsHostAllowed({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://random.trycloudflare.com',
      }),
      false,
    )
  })

  it('enables only for the production customer host', () => {
    assert.equal(
      isPortalAnalyticsHostAllowed({
        NEXT_PUBLIC_PORTAL_ORIGIN: `https://${PORTAL_ANALYTICS_PRODUCTION_HOST}`,
      }),
      true,
    )
    assert.equal(
      isPortalAnalyticsHostAllowed({
        NEXT_PUBLIC_PORTAL_ORIGIN: `https://www.${PORTAL_ANALYTICS_PRODUCTION_HOST}`,
      }),
      true,
    )
  })

  it('does not enable for non-production hosts even when NODE_ENV is production', () => {
    assert.equal(
      isPortalAnalyticsHostAllowed({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://staging.example.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-prod',
        NODE_ENV: 'production',
      }),
      false,
    )
  })
})
