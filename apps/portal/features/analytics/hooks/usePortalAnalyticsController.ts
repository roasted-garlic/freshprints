'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import {
  buildNavigationIdentity,
  buildSanitizedAnalyticsPageDescriptor,
  navigationIdentityKey,
} from '../services/portalAnalyticsSanitizer'
import * as portalAnalyticsService from '../services/portalAnalyticsService'

import type { PortalAnalyticsConfig } from '../types/portalAnalytics.types'

const EXCLUDED_ROUTE = '/firebase-debug'

/** Mutable lifecycle state held across renders — a `useRef`-backed state machine. */
export type PortalAnalyticsControllerState = {
  initialized: boolean
  lastIdentityKey: string | null
  previousSanitizedPath: string | null
}

export function createInitialControllerState(): PortalAnalyticsControllerState {
  return { initialized: false, lastIdentityKey: null, previousSanitizedPath: null }
}

/**
 * Pure decision function — the entire single-controller lifecycle (Plan Section 5.1),
 * extracted so it is unit-testable with `node:test` without rendering a React hook,
 * per this repo's established testing convention (see
 * `apps/portal/features/catalog/hooks/useCatalogDesigns.test.ts`).
 *
 * Mutates `state` in place and calls the provided service functions exactly as the
 * single-controller architecture requires: at most one successful `initializeStream`
 * + `trackPageView` pair for the document lifetime, and for every later meaningful
 * navigation (evaluated only after a successful initialization), one
 * `updatePageContext` + `trackPageView` pair (in that order).
 *
 * Requires an explicit `scriptReady` signal in addition to `config`: the GA loader
 * script and `dataLayer`/`gtag` stub load asynchronously (`next/script`
 * `strategy="afterInteractive"`), so this effect can genuinely run before `window.gtag`
 * exists. `state.initialized`/`lastIdentityKey`/`previousSanitizedPath` are committed
 * ONLY when `initializeStream` reports success (`true`) — never merely because it was
 * called. An unready or permanently-blocked script therefore leaves `state` untouched,
 * so a later effect run (triggered by `scriptReady` flipping to `true`, or by any other
 * dependency change) can still initialize correctly; the current route's descriptor is
 * used at whichever run actually succeeds, not a stale earlier one.
 */
export function runPortalAnalyticsControllerTick(input: {
  state: PortalAnalyticsControllerState
  config: PortalAnalyticsConfig
  scriptReady: boolean
  pathname: string
  searchParams: URLSearchParams
  origin: string
  service?: Pick<
    typeof portalAnalyticsService,
    'initializeStream' | 'updatePageContext' | 'trackPageView'
  >
}): void {
  const { state, config, scriptReady, pathname, searchParams, origin } = input
  const service = input.service ?? portalAnalyticsService

  if (!config.enabled || !config.measurementId) return
  if (pathname === EXCLUDED_ROUTE) return

  if (!state.initialized) {
    // Never attempt initialization until the script/stub is actually ready — doing so
    // would silently no-op and (if state were committed regardless) permanently lose
    // the initial configuration and page view.
    if (!scriptReady) return

    const descriptor = buildSanitizedAnalyticsPageDescriptor({
      pathname,
      searchParams,
      previousSanitizedPath: null,
      origin,
    })

    const initialized = service.initializeStream({
      measurementId: config.measurementId,
      descriptor,
    })
    if (!initialized) return // do not commit any state on failure

    service.trackPageView(descriptor)

    const identity = buildNavigationIdentity(pathname, searchParams)
    state.initialized = true
    state.lastIdentityKey = navigationIdentityKey(identity)
    state.previousSanitizedPath = descriptor.path
    return
  }

  // Initialization already succeeded — `updatePageContext`/`trackPageView` below are
  // never reached until that happened at least once, satisfying "update:true must
  // never run before successful initial configuration."
  const identity = buildNavigationIdentity(pathname, searchParams)
  const identityKey = navigationIdentityKey(identity)
  if (identityKey === state.lastIdentityKey) return

  const descriptor = buildSanitizedAnalyticsPageDescriptor({
    pathname,
    searchParams,
    previousSanitizedPath: state.previousSanitizedPath,
    origin,
  })

  service.updatePageContext({ measurementId: config.measurementId, descriptor })
  service.trackPageView(descriptor)

  state.lastIdentityKey = identityKey
  state.previousSanitizedPath = descriptor.path
}

/**
 * The single authoritative owner of the Portal analytics lifecycle (Plan Section 5).
 * Mounted once, at the root, inside `PortalAnalyticsBoundary`'s `<Suspense>` boundary.
 *
 * `scriptReady` is a boolean signal (owned by `PortalAnalyticsBoundary`, sourced from
 * `next/script`'s `onReady` callback on the GA stub script) proving `window.gtag`
 * actually exists — never inferred merely from this component having rendered.
 */
export function usePortalAnalyticsController(
  config: PortalAnalyticsConfig,
  scriptReady: boolean,
): void {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stateRef = useRef<PortalAnalyticsControllerState>(createInitialControllerState())

  useEffect(() => {
    if (typeof window === 'undefined') return
    runPortalAnalyticsControllerTick({
      state: stateRef.current,
      config,
      scriptReady,
      pathname,
      searchParams,
      origin: window.location.origin,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString(), config.enabled, config.measurementId, scriptReady])
}
