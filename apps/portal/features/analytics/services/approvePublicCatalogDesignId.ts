import { isValidPortalDesignShareId } from '../../catalog/utils/portalDesignShareUrls'

/**
 * Approve a PUBLIC catalog design ID for design-engagement analytics.
 * Reuses the existing share/catalog route-segment convention. Returns null
 * instead of guessing. Does not approve request, customer, auth, or upload IDs.
 */
export function approvePublicCatalogDesignId(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null
  }
  const designId = raw.trim()
  if (!designId || !isValidPortalDesignShareId(designId)) {
    return null
  }
  return designId
}
