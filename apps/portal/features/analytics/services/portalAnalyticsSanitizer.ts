import type {
  PortalAnalyticsNavigationIdentity,
  PortalAnalyticsPageDescriptor,
} from '../types/portalAnalytics.types'
import { buildPortalDesignSharePath } from '../../catalog/utils/portalDesignShareUrls'

/** One fixed route pattern this sanitizer knows how to template. */
type RouteRule = {
  /** Matches the raw pathname. Capture group 1, if present, is the dynamic segment. */
  pattern: RegExp
  /** Sanitized route template to report, e.g. "/requests/:id". */
  template: string
  /** Fixed, non-PII page title for this route template. */
  title: string
}

/**
 * Exhaustive, verified Portal route inventory (Plan Section 6a.1). Order matters only
 * in that more specific patterns must precede more general ones; none currently overlap.
 */
const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/$/, template: '/', title: 'Discover' },
  { pattern: /^\/catalog\/library$/, template: '/catalog/library', title: 'Catalog' },
  { pattern: /^\/catalog$/, template: '/catalog', title: 'Catalog' },
  { pattern: /^\/favorites$/, template: '/favorites', title: 'Favorites' },
  { pattern: /^\/custom-designs(?:\/.*)?$/, template: '/custom-designs', title: 'Custom Designs' },
  { pattern: /^\/requests\/artwork$/, template: '/requests/artwork', title: 'Upload Artwork' },
  { pattern: /^\/requests\/[^/]+$/, template: '/requests/:id', title: 'Print Request Detail' },
  { pattern: /^\/requests$/, template: '/requests', title: 'Print Requests' },
  { pattern: /^\/donate$/, template: '/donate', title: 'Donate' },
  { pattern: /^\/dashboard$/, template: '/dashboard', title: 'Dashboard' },
  { pattern: /^\/help$/, template: '/help', title: 'FAQ and How To' },
  { pattern: /^\/share\/design\/[^/]+$/, template: '/share/design/:id', title: 'Shared Design' },
  { pattern: /^\/complete-profile$/, template: '/complete-profile', title: 'Complete Profile' },
  { pattern: /^\/register$/, template: '/register', title: 'Sign Up' },
  { pattern: /^\/login-required$/, template: '/login-required', title: 'Sign In Required' },
  { pattern: /^\/login$/, template: '/login', title: 'Sign In' },
]

const FALLBACK_TEMPLATE = '/other'
const FALLBACK_TITLE = 'Page'

/**
 * Fixed allowlist of categorical query parameters (Plan Section 6a.2). Every parameter
 * not listed here is dropped by default, both by the descriptor and by the navigation
 * identity — this is the single shared source of truth for both.
 */
const ALLOWED_ENUM_PARAMS: readonly string[] = [
  'tab',
  'upload',
  'from',
  'mode',
  'discover',
  'detailTab',
  'flow',
  'step',
]

/** `category` is never sent by raw ID — only whether it is present. */
const CATEGORY_PARAM = 'category'

function matchRoute(pathname: string): RouteRule | null {
  for (const rule of ROUTE_RULES) {
    if (rule.pattern.test(pathname)) return rule
  }
  return null
}

/** Builds the fixed-order, allowlisted query string shared by the descriptor and the
 *  navigation identity, so the two can never drift out of sync. */
function buildApprovedQueryEntries(searchParams: URLSearchParams): Array<[string, string]> {
  const entries: Array<[string, string]> = []
  for (const key of ALLOWED_ENUM_PARAMS) {
    const value = searchParams.get(key)
    if (value !== null) entries.push([key, value])
  }
  if (searchParams.has(CATEGORY_PARAM)) entries.push([CATEGORY_PARAM, 'present'])
  return entries
}

/**
 * The single mandatory choke point between raw navigation state and `gtag`. Replaces
 * dynamic identifiers with route templates, strips all query parameters by default
 * (re-adding only the fixed allowlist), never reads `document.title`/`document.referrer`,
 * and fails closed on unknown routes.
 */
export function buildSanitizedAnalyticsPageDescriptor(input: {
  pathname: string
  searchParams: URLSearchParams
  previousSanitizedPath: string | null
  origin: string
}): PortalAnalyticsPageDescriptor {
  const rule = matchRoute(input.pathname)
  const path = rule ? rule.template : FALLBACK_TEMPLATE
  const title = rule ? rule.title : FALLBACK_TITLE

  // The /other fallback drops all query parameters unconditionally — the standing
  // allowlist is only for routes this sanitizer actually reviewed.
  const approvedEntries = rule ? buildApprovedQueryEntries(input.searchParams) : []
  const query = new URLSearchParams(approvedEntries).toString()

  const location = `${input.origin}${path}${query ? `?${query}` : ''}`

  return {
    path,
    title,
    location,
    referrer: input.previousSanitizedPath ?? undefined,
  }
}

/**
 * Local-only navigation identity: decides whether a meaningful navigation occurred.
 * Never passed to `gtag`, never logged, never persisted beyond the caller's own ref.
 */
export function buildNavigationIdentity(
  pathname: string,
  searchParams: URLSearchParams,
): PortalAnalyticsNavigationIdentity {
  const approvedEntries = buildApprovedQueryEntries(searchParams)
  const normalizedApprovedQuery = new URLSearchParams(approvedEntries).toString()
  return { rawPathname: pathname, normalizedApprovedQuery }
}

/** Collapses a navigation identity into one comparable string for a `useRef` guard. */
export function navigationIdentityKey(identity: PortalAnalyticsNavigationIdentity): string {
  return `${identity.rawPathname}?${identity.normalizedApprovedQuery}`
}

export function isPortalShareDesignPathname(pathname: string): boolean {
  return /^\/share\/design\/[^/]+$/.test(pathname)
}

/** Virtual content-path prefix for Design Details modal views. Not a real Portal route. */
export const CATALOG_DESIGN_MODAL_VIRTUAL_PATH_PREFIX = '/catalog/design'

export function buildCatalogDesignModalVirtualPath(approvedDesignId: string): string {
  return `${CATALOG_DESIGN_MODAL_VIRTUAL_PATH_PREFIX}/${encodeURIComponent(approvedDesignId)}`
}

/**
 * Analytics-only descriptor for an intentional Design Details open.
 * Interpolates only an already-approved public catalog design ID.
 */
export function buildCatalogDesignModalPageDescriptor(input: {
  title: string
  designId: string
  origin: string
  parentPathname: string
  parentSearchParams: URLSearchParams
}): PortalAnalyticsPageDescriptor {
  const parent = buildSanitizedAnalyticsPageDescriptor({
    pathname: input.parentPathname,
    searchParams: input.parentSearchParams,
    previousSanitizedPath: null,
    origin: input.origin,
  })
  const path = buildCatalogDesignModalVirtualPath(input.designId)
  return {
    path,
    title: input.title,
    location: `${input.origin}${path}`,
    referrer: parent.path,
  }
}

export function buildResolvedShareDesignPageOverride(input: {
  title: string
  designId: string
  origin: string
  referrer: string | undefined
}): PortalAnalyticsPageDescriptor {
  const path = buildPortalDesignSharePath(input.designId)
  return {
    path,
    title: input.title,
    location: `${input.origin}${path}`,
    referrer: input.referrer,
  }
}
