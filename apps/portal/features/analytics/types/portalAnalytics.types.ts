import type { PortalSiteEnv } from '../../brand/portalSiteMeta'

/** Subset of env keys used to resolve Portal analytics configuration. */
export type PortalAnalyticsEnv = PortalSiteEnv & {
  NEXT_PUBLIC_GA_MEASUREMENT_ID?: string
}

/** Resolved analytics configuration — inert unless both fields say otherwise. */
export type PortalAnalyticsConfig = {
  enabled: boolean
  measurementId: string | null
}

/** Sanitized values safe to send to Google Analytics for one page view. */
export type PortalAnalyticsPageDescriptor = {
  /**
   * Sanitized route template (e.g. "/requests/:id") or, for a successfully
   * resolved public catalog design, the approved virtual/share path that
   * includes that public catalog design ID (ADR-FP-138).
   */
  path: string
  /**
   * Page title: a sanitizer route title, `Share: {approved catalog title}` on a
   * resolved share page, or `Modal: {approved catalog title}` on a virtual Design
   * Details modal page_view. Never document.title.
   */
  title: string
  /** Full sanitized absolute URL built from the resolved origin + sanitized path + allowlisted query. */
  location: string
  /** Sanitized referrer: previous sanitized path only, or omitted — never raw document.referrer. */
  referrer: string | undefined
}

/** Local-only navigation identity: decides whether a meaningful navigation occurred. */
export type PortalAnalyticsNavigationIdentity = {
  /** Raw pathname (not sanitized) — never sent to gtag, never logged. */
  rawPathname: string
  /** Normalized, allowlisted categorical query state only — never sent to gtag as-is. */
  normalizedApprovedQuery: string
}

export type PortalDesignViewSurface = 'modal' | 'share_page'

export type PortalShareAnalyticsReadiness =
  | { kind: 'idle' }
  | { kind: 'ready'; title: string; designId: string }
  | { kind: 'unresolved' }

/** Minimal gtag.js command surface this codebase uses. Never a general parameter bag. */
export type Gtag = {
  (command: 'js', value: Date): void
  (command: 'config', measurementId: string, params: Record<string, string | boolean | undefined>): void
  (command: 'event', eventName: 'page_view', params: Record<string, string | undefined>): void
  (
    command: 'event',
    eventName: 'design_view',
    params: {
      design_title: string
      design_surface: PortalDesignViewSurface
      content_id: string
    },
  ): void
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}
