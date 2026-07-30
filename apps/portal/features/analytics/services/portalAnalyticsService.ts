import type { PortalAnalyticsPageDescriptor } from '../types/portalAnalytics.types'

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
