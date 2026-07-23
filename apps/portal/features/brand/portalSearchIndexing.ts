import type { PortalSiteEnv } from './portalSiteMeta'
import { getPortalSiteOrigin } from './portalSiteMeta'

/** Only this hostname may opt into public search indexing. */
export const PORTAL_PRODUCTION_SEARCH_HOST = 'myprintrequest.com'

/**
 * Fail-closed search indexing gate.
 * True only when the resolved Portal origin hostname is the production customer domain.
 * Dev (myprintrequest.dev), localhost, tunnels, and unknown hosts never index.
 */
export function isPortalSearchIndexingEnabled(env: PortalSiteEnv = process.env): boolean {
  try {
    const hostname = new URL(getPortalSiteOrigin(env)).hostname.toLowerCase()
    return (
      hostname === PORTAL_PRODUCTION_SEARCH_HOST ||
      hostname === `www.${PORTAL_PRODUCTION_SEARCH_HOST}`
    )
  } catch {
    return false
  }
}

export function portalRobotsDisallowPaths(): string[] {
  return [
    '/requests',
    '/dashboard',
    '/favorites',
    '/custom-designs',
    '/donate',
    '/login',
    '/register',
    '/complete-profile',
    '/login-required',
  ]
}

export function portalRobotsAllowPaths(): string[] {
  return ['/', '/catalog', '/help', '/share/design']
}

/** Static public paths always listed in `/sitemap.xml` (indexing still gated by robots). */
export function portalSitemapStaticPaths(): string[] {
  return ['/', '/catalog', '/catalog/library', '/help']
}
