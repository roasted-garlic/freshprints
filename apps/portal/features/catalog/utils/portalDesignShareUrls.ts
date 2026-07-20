import { getPortalSiteOrigin, type PortalSiteEnv } from '../../brand/portalSiteMeta'

/** Query param that opens the catalog design details modal. */
export const PORTAL_DESIGN_DEEP_LINK_PARAM = 'designId'

export const PORTAL_DESIGN_SHARE_PATH_PREFIX = '/share/design'

const DESIGN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

export function isValidPortalDesignShareId(designId: string): boolean {
  return DESIGN_ID_PATTERN.test(designId.trim())
}

export function buildPortalDesignSharePath(designId: string): string {
  const id = designId.trim()
  return `${PORTAL_DESIGN_SHARE_PATH_PREFIX}/${encodeURIComponent(id)}`
}

/**
 * Absolute share URL. Pass `env` in tests / server; in the browser without `env`,
 * uses `window.location.origin` so local/tunnel shares match the current host.
 */
export function buildPortalDesignShareUrl(designId: string, env?: PortalSiteEnv): string {
  if (env) {
    return `${getPortalSiteOrigin(env)}${buildPortalDesignSharePath(designId)}`
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${buildPortalDesignSharePath(designId)}`
  }
  return `${getPortalSiteOrigin()}${buildPortalDesignSharePath(designId)}`
}

/** Authenticated deep link that opens the design modal on the library. */
export function buildPortalDesignDeepLinkPath(designId: string): string {
  const params = new URLSearchParams({
    [PORTAL_DESIGN_DEEP_LINK_PARAM]: designId.trim(),
  })
  return `/catalog?${params.toString()}`
}

export function readPortalDesignDeepLinkId(
  searchParams: URLSearchParams | { get(name: string): string | null },
): string | null {
  const raw = searchParams.get(PORTAL_DESIGN_DEEP_LINK_PARAM)?.trim() ?? ''
  if (!raw || !isValidPortalDesignShareId(raw)) {
    return null
  }
  return raw
}
