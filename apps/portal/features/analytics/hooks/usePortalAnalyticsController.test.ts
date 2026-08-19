import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createInitialControllerState,
  runPortalAnalyticsControllerTick,
} from './usePortalAnalyticsController.ts'

import type { PortalAnalyticsConfig, PortalShareAnalyticsReadiness } from '../types/portalAnalytics.types'

const ORIGIN = 'https://myprintrequest.com'
const ENABLED_CONFIG: PortalAnalyticsConfig = { enabled: true, measurementId: 'G-TEST' }
const DISABLED_CONFIG: PortalAnalyticsConfig = { enabled: false, measurementId: null }

function fakeService(overrides?: {
  initializeStreamResult?: boolean
  updatePageContextResult?: boolean
  trackPageViewResult?: boolean
}) {
  const calls: {
    initializeStream: unknown[][]
    updatePageContext: unknown[][]
    trackPageView: unknown[][]
  } = {
    initializeStream: [],
    updatePageContext: [],
    trackPageView: [],
  }
  return {
    calls,
    initializeStream: (...args: unknown[]) => {
      calls.initializeStream.push(args)
      return overrides?.initializeStreamResult ?? true
    },
    updatePageContext: (...args: unknown[]) => {
      calls.updatePageContext.push(args)
      return overrides?.updatePageContextResult ?? true
    },
    trackPageView: (...args: unknown[]) => {
      calls.trackPageView.push(args)
      return overrides?.trackPageViewResult ?? true
    },
  }
}

function tick(
  state: ReturnType<typeof createInitialControllerState>,
  service: ReturnType<typeof fakeService>,
  pathname: string,
  query = '',
  options?: {
    config?: PortalAnalyticsConfig
    scriptReady?: boolean
    shareReadiness?: PortalShareAnalyticsReadiness
  },
) {
  runPortalAnalyticsControllerTick({
    state,
    config: options?.config ?? ENABLED_CONFIG,
    scriptReady: options?.scriptReady ?? true,
    pathname,
    searchParams: new URLSearchParams(query),
    origin: ORIGIN,
    shareReadiness: options?.shareReadiness,
    service,
  })
}

describe('runPortalAnalyticsControllerTick — initialization (script already ready)', () => {
  it('one initial mount produces exactly one initializeStream and one trackPageView call', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog')
    assert.equal(service.calls.initializeStream.length, 1)
    assert.equal(service.calls.trackPageView.length, 1)
    assert.equal(service.calls.updatePageContext.length, 0)
  })

  it('Strict Mode replay (same pathname/query twice) still produces exactly one init', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog')
    tick(state, service, '/catalog') // simulated replay with identical state
    assert.equal(service.calls.initializeStream.length, 1)
    assert.equal(service.calls.trackPageView.length, 1)
  })

  it('a re-render with unrelated state changed but same pathname/query does not re-init', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog')
    tick(state, service, '/catalog') // simulates a sibling/provider re-render
    assert.equal(service.calls.initializeStream.length, 1)
  })

  it('the initial descriptor and the first trackPageView descriptor are the same object', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog')
    const initDescriptor = (service.calls.initializeStream[0][0] as { descriptor: unknown }).descriptor
    const trackedDescriptor = service.calls.trackPageView[0][0]
    assert.deepEqual(initDescriptor, trackedDescriptor)
  })

  it('never calls any service function when disabled', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', '', { config: DISABLED_CONFIG })
    tick(state, service, '/requests', '', { config: DISABLED_CONFIG })
    assert.equal(service.calls.initializeStream.length, 0)
    assert.equal(service.calls.trackPageView.length, 0)
    assert.equal(service.calls.updatePageContext.length, 0)
  })

  it('never calls any service function on /firebase-debug', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/firebase-debug')
    assert.equal(service.calls.initializeStream.length, 0)
    assert.equal(service.calls.trackPageView.length, 0)
  })
})

describe('runPortalAnalyticsControllerTick — script readiness handshake (required regression tests)', () => {
  it('controller run before script readiness: no initializeStream, no trackPageView, remains uninitialized', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', '', { scriptReady: false })
    assert.equal(service.calls.initializeStream.length, 0)
    assert.equal(service.calls.trackPageView.length, 0)
    assert.equal(state.initialized, false)
    assert.equal(state.lastIdentityKey, null)
    assert.equal(state.previousSanitizedPath, null)
  })

  it('readiness changes false -> true without navigation: exactly one init + one page view, same descriptor', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', '', { scriptReady: false })
    assert.equal(service.calls.initializeStream.length, 0)

    tick(state, service, '/catalog', '', { scriptReady: true })
    assert.equal(service.calls.initializeStream.length, 1)
    assert.equal(service.calls.trackPageView.length, 1)
    const initDescriptor = (service.calls.initializeStream[0][0] as { descriptor: unknown }).descriptor
    const trackedDescriptor = service.calls.trackPageView[0][0]
    assert.deepEqual(initDescriptor, trackedDescriptor)
    assert.equal(state.initialized, true)
  })

  it('readiness remains false across repeated renders: never initializes, no page view, no state committed', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', '', { scriptReady: false })
    tick(state, service, '/catalog', '', { scriptReady: false })
    tick(state, service, '/requests', '', { scriptReady: false })
    assert.equal(service.calls.initializeStream.length, 0)
    assert.equal(service.calls.trackPageView.length, 0)
    assert.equal(state.initialized, false)
  })

  it('Strict-Mode-style replay AFTER readiness still produces exactly one init + one page view', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', '', { scriptReady: true })
    tick(state, service, '/catalog', '', { scriptReady: true }) // replay, same identity
    assert.equal(service.calls.initializeStream.length, 1)
    assert.equal(service.calls.trackPageView.length, 1)
  })

  it('readiness callback firing more than once (still true) does not duplicate init or the initial page view', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', '', { scriptReady: true })
    // Represents the effect re-running because `scriptReady` "changed" to `true`
    // again (identical value) — same-value dependency changes should not resurrect
    // an already-initialized state machine.
    tick(state, service, '/catalog', '', { scriptReady: true })
    tick(state, service, '/catalog', '', { scriptReady: true })
    assert.equal(service.calls.initializeStream.length, 1)
    assert.equal(service.calls.trackPageView.length, 1)
  })

  it('navigation occurs before readiness: no update/config/page view sent while unready; the current route becomes the one initial page view once ready, not a stale earlier route', () => {
    const state = createInitialControllerState()
    const service = fakeService()

    // Two navigations happen while the script is not yet ready.
    tick(state, service, '/catalog', '', { scriptReady: false })
    tick(state, service, '/requests', '', { scriptReady: false })
    assert.equal(service.calls.initializeStream.length, 0)
    assert.equal(service.calls.updatePageContext.length, 0)
    assert.equal(service.calls.trackPageView.length, 0)

    // Readiness arrives while the user is now on /requests/abc123 — the current route,
    // not /catalog or /requests, must be the one initial sanitized page view.
    tick(state, service, '/requests/abc123', '', { scriptReady: true })
    assert.equal(service.calls.initializeStream.length, 1)
    assert.equal(service.calls.trackPageView.length, 1)
    const initDescriptor = (service.calls.initializeStream[0][0] as {
      descriptor: { path: string }
    }).descriptor
    assert.equal(initDescriptor.path, '/requests/:id')
  })

  it('navigation occurs after successful initialization: updatePageContext runs with update:true before trackPageView; initial configuration is not repeated', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', '', { scriptReady: true })
    tick(state, service, '/requests', '', { scriptReady: true })
    assert.equal(service.calls.initializeStream.length, 1) // not repeated
    assert.equal(service.calls.updatePageContext.length, 1)
    assert.equal(service.calls.trackPageView.length, 2)
    const updateDescriptor = (service.calls.updatePageContext[0][0] as { descriptor: unknown }).descriptor
    const trackedDescriptor = service.calls.trackPageView[1][0]
    assert.deepEqual(updateDescriptor, trackedDescriptor)
  })

  it('initializeStream reporting failure: controller remains uninitialized, no identity/referrer state committed, a later retry can still initialize', () => {
    const state = createInitialControllerState()
    const failingService = fakeService({ initializeStreamResult: false })
    tick(state, failingService, '/catalog', '', { scriptReady: true })
    assert.equal(failingService.calls.initializeStream.length, 1)
    assert.equal(failingService.calls.trackPageView.length, 0) // never reached on failure
    assert.equal(state.initialized, false)
    assert.equal(state.lastIdentityKey, null)
    assert.equal(state.previousSanitizedPath, null)

    // A later opportunity (e.g. readiness re-evaluated, or any dependency change)
    // can still succeed and commit state correctly.
    const succeedingService = fakeService({ initializeStreamResult: true })
    tick(state, succeedingService, '/catalog', '', { scriptReady: true })
    assert.equal(succeedingService.calls.initializeStream.length, 1)
    assert.equal(succeedingService.calls.trackPageView.length, 1)
    assert.equal(state.initialized, true)
  })

  it('permanently blocked script (scriptReady never true): no initialization, no page view, no false initialized state, ever', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    for (const pathname of ['/catalog', '/requests', '/donate', '/help']) {
      tick(state, service, pathname, '', { scriptReady: false })
    }
    assert.equal(service.calls.initializeStream.length, 0)
    assert.equal(service.calls.updatePageContext.length, 0)
    assert.equal(service.calls.trackPageView.length, 0)
    assert.equal(state.initialized, false)
  })
})

describe('runPortalAnalyticsControllerTick — navigation identity (unchanged behavior, re-verified with the readiness gate present)', () => {
  it('a dropped-parameter-only change does NOT fire a second event', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', 'q=shirt')
    tick(state, service, '/catalog', 'q=shirts')
    assert.equal(service.calls.trackPageView.length, 1)
    assert.equal(service.calls.updatePageContext.length, 0)
  })

  it('a different dynamic-segment value under the same template DOES fire', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/requests/abc123')
    tick(state, service, '/requests/xyz789')
    assert.equal(service.calls.trackPageView.length, 2)
    assert.equal(service.calls.updatePageContext.length, 1)
  })

  it('a different dynamic design ID under the same template DOES fire', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/share/design/abc123', '', {
      shareReadiness: { kind: 'ready', title: 'Public Catalog Title', designId: 'abc123' },
    })
    tick(state, service, '/share/design/xyz789', '', {
      shareReadiness: { kind: 'ready', title: 'Public Catalog Title', designId: 'xyz789' },
    })
    assert.equal(service.calls.trackPageView.length, 2)
    const second = service.calls.trackPageView[1][0] as { path: string }
    assert.equal(second.path, '/share/design/xyz789')
  })

  it('a different allowlisted categorical value DOES fire', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/catalog', 'discover=new')
    tick(state, service, '/catalog', 'discover=popular')
    assert.equal(service.calls.trackPageView.length, 2)
  })

  it('parameter-ordering changes do NOT fire', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/requests', 'tab=working&from=discover')
    tick(state, service, '/requests', 'from=discover&tab=working')
    assert.equal(service.calls.trackPageView.length, 1)
  })
})

describe('runPortalAnalyticsControllerTick — share title wait', () => {
  it('does not emit page_view while the share title is still idle', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/share/design/abc123')
    assert.equal(service.calls.trackPageView.length, 0)
    assert.equal(state.initialized, false)
  })

  it('emits exactly one page_view with Share: title and the approved public catalog id', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/share/design/abc123')
    tick(state, service, '/share/design/abc123', '', {
      shareReadiness: { kind: 'ready', title: 'Public Catalog Title', designId: 'abc123' },
    })
    tick(state, service, '/share/design/abc123', '', {
      shareReadiness: { kind: 'ready', title: 'Public Catalog Title', designId: 'abc123' },
    })
    assert.equal(service.calls.initializeStream.length, 1)
    assert.equal(service.calls.trackPageView.length, 1)
    const descriptor = service.calls.trackPageView[0][0] as {
      path: string
      title: string
      location: string
    }
    assert.equal(descriptor.path, '/share/design/abc123')
    assert.equal(descriptor.title, 'Share: Public Catalog Title')
    assert.equal(descriptor.location, `${ORIGIN}/share/design/abc123`)
  })

  it('does not promote an arbitrary share route parameter as the public catalog id', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/share/design/not-the-catalog-id', '', {
      shareReadiness: {
        kind: 'ready',
        title: 'Alpha Male',
        designId: 'abc123xyz',
      },
    })
    const descriptor = service.calls.trackPageView[0][0] as {
      path: string
      title: string
      location: string
    }
    assert.equal(descriptor.path, '/share/design/abc123xyz')
    assert.equal(descriptor.title, 'Share: Alpha Male')
    assert.equal(descriptor.location.includes('not-the-catalog-id'), false)
  })

  it('unresolved share keeps the sanitizer Shared Design title and still one page_view', () => {
    const state = createInitialControllerState()
    const service = fakeService()
    tick(state, service, '/share/design/abc123', '', { shareReadiness: { kind: 'unresolved' } })
    assert.equal(service.calls.trackPageView.length, 1)
    const descriptor = service.calls.trackPageView[0][0] as {
      title: string
      path: string
      location: string
    }
    assert.equal(descriptor.title, 'Shared Design')
    assert.equal(descriptor.path, '/share/design/:id')
    assert.equal(descriptor.location.includes('abc123'), false)
    assert.equal(descriptor.title.includes('Share:'), false)
  })
})
