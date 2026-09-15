import type { Metadata } from 'next'

import type { PortalSiteEnv } from './portalSiteMeta'
import { getPortalSiteOrigin } from './portalSiteMeta'

/** Only this hostname may opt into public search indexing. */
export const PORTAL_PRODUCTION_SEARCH_HOST = 'myprintrequest.com'

/** HTTP / meta robots directive when indexing is disabled (DEV / non-prod). */
export const PORTAL_DISABLED_INDEXING_X_ROBOTS_TAG =
  'noindex, nofollow, noarchive, nosnippet' as const

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

/**
 * Next.js `robots` metadata for non-indexable environments.
 * Explicit noindex is the authoritative DEV search-removal control (not robots.txt Disallow:/).
 */
export function buildPortalDisabledIndexingRobots(): NonNullable<Metadata['robots']> {
  return {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  }
}

export function buildPortalEnabledIndexingRobots(): NonNullable<Metadata['robots']> {
  return { index: true, follow: true }
}

/**
 * Persistent DEV banner gate: show when SEO indexing is disabled OR the Firebase project
 * is fresh-prints-dev (so a mistaken prod origin override on DEV still shows the banner).
 */
export function shouldShowPortalDevelopmentServerBanner(env: PortalSiteEnv = process.env): boolean {
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? ''
  return !isPortalSearchIndexingEnabled(env) || projectId === 'fresh-prints-dev'
}

/**
 * Full-screen auth overlay gate: true for the DEV Firebase project, or the known DEV
 * customer hostname. Production project / myprintrequest.com must never mount the overlay.
 */
export function shouldShowPortalDevelopmentAuthOverlay(env: PortalSiteEnv = process.env): boolean {
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? ''
  if (projectId === 'fresh-prints-dev') {
    return true
  }
  if (projectId.length > 0 && projectId !== 'fresh-prints-dev') {
    return false
  }
  try {
    const hostname = new URL(getPortalSiteOrigin(env)).hostname.toLowerCase()
    return hostname === 'myprintrequest.dev' || hostname === 'www.myprintrequest.dev'
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
