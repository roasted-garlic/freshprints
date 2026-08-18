'use client'

import Script from 'next/script'

import type { PortalAnalyticsConfig } from '../types/portalAnalytics.types'

/**
 * The stub script's literal source. Extracted as a pure constant (tested directly,
 * per this repo's convention of unit-testing extracted logic rather than rendered
 * JSX) to prove it contains no `gtag('config'` / `gtag('set'` call of any kind — all
 * sequencing logic lives in `usePortalAnalyticsController` (Plan Section 4/5/7), never
 * here. The stub enqueues the standard `gtag('js', new Date())` bootstrap only — not
 * `config`, `event`, or route-aware calls. Sequencing logic lives in
 * `usePortalAnalyticsController` (Plan Section 4/5/7), never here. This component's
 * only responsibility beyond loading the scripts is reporting readiness via `onReady`,
 * never initiating `config`/page-view decisions itself.
 */
export const PORTAL_GA4_STUB_SCRIPT =
  "window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date());"

export function buildPortalGa4LoaderSrc(measurementId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
}

/**
 * Loads the external GA4 script and defines the minimal `dataLayer`/`gtag` stub only.
 * Contains no sequencing logic — no `gtag('config', ...)` call, no descriptor
 * computation, nothing route-aware. All of that lives in
 * `usePortalAnalyticsController` (see Plan Section 4/5/7).
 *
 * Reports readiness via `onReady` on the stub script — `next/script`'s documented
 * lifecycle callback — once the stub has actually executed and `window.gtag` exists.
 * `onReady` (not `onLoad`) is used because `next/script` fires `onReady` both on the
 * script's first successful load and on every subsequent mount of the component that
 * requested it, which correctly handles the (rare, but not excluded) case where this
 * component re-mounts after the browser has already cached/executed the script.
 */
export function PortalAnalyticsScript({
  config,
  onReady,
}: {
  config: PortalAnalyticsConfig
  onReady: () => void
}) {
  if (!config.enabled || !config.measurementId) return null

  return (
    <>
      <Script
        id="portal-ga4-loader"
        src={buildPortalGa4LoaderSrc(config.measurementId)}
        strategy="afterInteractive"
        onError={() => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[portal-analytics] gtag.js failed to load')
          }
        }}
      />
      <Script id="portal-ga4-stub" strategy="afterInteractive" onReady={onReady}>
        {PORTAL_GA4_STUB_SCRIPT}
      </Script>
    </>
  )
}
