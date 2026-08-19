import type { PortalDesignViewSurface } from '../types/portalAnalytics.types'

/** Staff-approved public catalog titles are capped at 200 characters in Studio. */
export const PUBLIC_CATALOG_DESIGN_TITLE_MAX_LENGTH = 200

/**
 * The only dynamic analytics text this goal may send: a canonical public catalog
 * design title. Returns null instead of guessing.
 */
export function approvePublicCatalogDesignTitle(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null
  }
  const title = raw.trim()
  if (!title) {
    return null
  }
  if (title.length > PUBLIC_CATALOG_DESIGN_TITLE_MAX_LENGTH) {
    return null
  }
  return title
}

/**
 * Reporting title for GA4 page_title only. Do not use this for design_title,
 * document.title, or catalog data.
 */
export function formatPublicCatalogDesignPageTitle(
  surface: PortalDesignViewSurface,
  canonicalTitle: string,
): string {
  if (surface === 'modal') {
    return `Modal: ${canonicalTitle}`
  }
  return `Share: ${canonicalTitle}`
}
