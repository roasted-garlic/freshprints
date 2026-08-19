import type {
  PortalAnalyticsPageDescriptor,
  PortalDesignViewSurface,
} from '../types/portalAnalytics.types'
import { approvePublicCatalogDesignId } from './approvePublicCatalogDesignId'
import {
  approvePublicCatalogDesignTitle,
  formatPublicCatalogDesignPageTitle,
} from './approvePublicCatalogDesignTitle'
import { buildCatalogDesignModalPageDescriptor } from './portalAnalyticsSanitizer'

function descriptorToPageParams(
  descriptor: PortalAnalyticsPageDescriptor,
): Record<string, string | undefined> {
  return {
    page_location: descriptor.location,
    page_title: descriptor.title,
    ...(descriptor.referrer ? { page_referrer: descriptor.referrer } : {}),
  }
}

/**
 * Initializes the GA4 stream exactly once for the document lifetime. Sets
 * `send_page_view: false` (manual page views only) and explicitly disables both
 * advertising-signal features, since both default to `true` at the platform level.
 *
 * Returns `true` only if `gtag` actually existed and the call was made — the caller
 * (the controller's state machine) must not commit "initialized" state on a `false`
 * result, since a `false` result means nothing was sent to Google at all.
 */
export function initializeStream(input: {
  measurementId: string
  descriptor: PortalAnalyticsPageDescriptor
}): boolean {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  window.gtag('config', input.measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...descriptorToPageParams(input.descriptor),
  })
  return true
}

/**
 * Updates the stream's page context on a later navigation using the official
 * `update: true` mechanism — merges values and suppresses the automatic duplicate
 * page view a second bare `config` call would otherwise send. Never re-initializes
 * the stream, never sends `send_page_view`. Returns `true` only if the call was made.
 */
export function updatePageContext(input: {
  measurementId: string
  descriptor: PortalAnalyticsPageDescriptor
}): boolean {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  window.gtag('config', input.measurementId, {
    update: true,
    ...descriptorToPageParams(input.descriptor),
  })
  return true
}

/**
 * Sends one manual `page_view` event using only the sanitized descriptor's fields.
 * Returns `true` only if the call was made.
 */
export function trackPageView(descriptor: PortalAnalyticsPageDescriptor): boolean {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  window.gtag('event', 'page_view', {
    page_location: descriptor.location,
    page_path: descriptor.path,
    page_title: descriptor.title,
    ...(descriptor.referrer ? { page_referrer: descriptor.referrer } : {}),
  })
  return true
}

/**
 * Narrow typed design-engagement event. Allowed params: design_title,
 * design_surface, content_id (approved public catalog design ID only).
 */
export function trackDesignView(input: {
  title: unknown
  surface: PortalDesignViewSurface
  contentId: unknown
}): boolean {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  if (input.surface !== 'modal' && input.surface !== 'share_page') return false
  const title = approvePublicCatalogDesignTitle(input.title)
  const contentId = approvePublicCatalogDesignId(input.contentId)
  if (!title || !contentId) return false
  window.gtag('event', 'design_view', {
    design_title: title,
    design_surface: input.surface,
    content_id: contentId,
  })
  return true
}

/**
 * Amendment 1/2: one virtual design page_view + one modal design_view.
 * Does not update the GA stream config and does not go through the navigation controller.
 */
export function trackCatalogDesignModalView(input: {
  title: unknown
  designId: unknown
  origin: string
  parentPathname: string
  parentSearchParams: URLSearchParams
}): boolean {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  const title = approvePublicCatalogDesignTitle(input.title)
  const designId = approvePublicCatalogDesignId(input.designId)
  if (!title || !designId) return false
  const descriptor = buildCatalogDesignModalPageDescriptor({
    title: formatPublicCatalogDesignPageTitle('modal', title),
    designId,
    origin: input.origin,
    parentPathname: input.parentPathname,
    parentSearchParams: input.parentSearchParams,
  })
  const pageViewSent = trackPageView(descriptor)
  const designViewSent = trackDesignView({ title, surface: 'modal', contentId: designId })
  return pageViewSent && designViewSent
}
