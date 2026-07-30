import { getPortalSiteOrigin } from '../../brand/portalSiteMeta'

import type { PortalAnalyticsEnv } from '../types/portalAnalytics.types'

/** Only this hostname (and its www. alias) may enable Portal analytics. */
export const PORTAL_ANALYTICS_PRODUCTION_HOST = 'myprintrequest.com'

/**
 * Fail-closed production-hostname gate for analytics, independent of
 * `isPortalSearchIndexingEnabled` (a separate, SEO-specific concern) even though both
 * reuse the same underlying `getPortalSiteOrigin` hostname-resolution logic.
 */
export function isPortalAnalyticsHostAllowed(env: PortalAnalyticsEnv = process.env): boolean {
  try {
    const hostname = new URL(getPortalSiteOrigin(env)).hostname.toLowerCase()
    return (
      hostname === PORTAL_ANALYTICS_PRODUCTION_HOST ||
      hostname === `www.${PORTAL_ANALYTICS_PRODUCTION_HOST}`
    )
  } catch {
    return false
  }
}
