import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import {
  initializeStream,
  trackCatalogDesignModalView,
  trackDesignView,
  trackPageView,
  updatePageContext,
} from './portalAnalyticsService.ts'

import type { PortalAnalyticsPageDescriptor } from '../types/portalAnalytics.types'

const DESCRIPTOR: PortalAnalyticsPageDescriptor = {
  path: '/catalog',
  title: 'Catalog',
  location: 'https://myprintrequest.com/catalog',
  referrer: undefined,
}

const DESCRIPTOR_WITH_REFERRER: PortalAnalyticsPageDescriptor = {
  ...DESCRIPTOR,
  referrer: '/',
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('initializeStream', () => {
  it('no-ops and returns false when gtag is unavailable', () => {
    let result: boolean | undefined
    assert.doesNotThrow(() => {
      result = initializeStream({ measurementId: 'G-TEST', descriptor: DESCRIPTOR })
    })
    assert.equal(result, false)
  })

  it('returns true and calls gtag(config, ...) with exactly the required fields', () => {
    const calls: unknown[] = []
    ;(globalThis as { window: unknown }).window = { gtag: (...args: unknown[]) => calls.push(args) }

    const result = initializeStream({ measurementId: 'G-TEST', descriptor: DESCRIPTOR })

    assert.equal(result, true)
    assert.equal(calls.length, 1)
    const [command, measurementId, params] = calls[0] as [string, string, Record<string, unknown>]
    assert.equal(command, 'config')
    assert.equal(measurementId, 'G-TEST')
    assert.deepEqual(Object.keys(params).sort(), [
      'allow_ad_personalization_signals',
      'allow_google_signals',
      'page_location',
      'page_title',
      'send_page_view',
    ])
    assert.equal(params.send_page_view, false)
    assert.equal(params.allow_google_signals, false)
    assert.equal(params.allow_ad_personalization_signals, false)
    assert.equal(params.page_location, DESCRIPTOR.location)
    assert.equal(params.page_title, DESCRIPTOR.title)
  })

  it('includes page_referrer only when the descriptor provides one', () => {
    const calls: unknown[] = []
    ;(globalThis as { window: unknown }).window = { gtag: (...args: unknown[]) => calls.push(args) }

    initializeStream({ measurementId: 'G-TEST', descriptor: DESCRIPTOR_WITH_REFERRER })

    const [, , params] = calls[0] as [string, string, Record<string, unknown>]
    assert.equal(params.page_referrer, '/')
  })
})

describe('updatePageContext', () => {
  it('no-ops and returns false when gtag is unavailable', () => {
    let result: boolean | undefined
    assert.doesNotThrow(() => {
      result = updatePageContext({ measurementId: 'G-TEST', descriptor: DESCRIPTOR })
    })
    assert.equal(result, false)
  })

  it('returns true and calls gtag(config, ..., { update: true, ... }) and never sends send_page_view', () => {
    const calls: unknown[] = []
    ;(globalThis as { window: unknown }).window = { gtag: (...args: unknown[]) => calls.push(args) }

    const result = updatePageContext({ measurementId: 'G-TEST', descriptor: DESCRIPTOR })

    assert.equal(result, true)
    assert.equal(calls.length, 1)
    const [command, measurementId, params] = calls[0] as [string, string, Record<string, unknown>]
    assert.equal(command, 'config')
    assert.equal(measurementId, 'G-TEST')
    assert.equal(params.update, true)
    assert.ok(!('send_page_view' in params))
    assert.ok(!('allow_google_signals' in params))
    assert.deepEqual(Object.keys(params).sort(), ['page_location', 'page_title', 'update'])
  })
})

describe('trackPageView', () => {
  it('no-ops and returns false when gtag is unavailable', () => {
    let result: boolean | undefined
    assert.doesNotThrow(() => {
      result = trackPageView(DESCRIPTOR)
    })
    assert.equal(result, false)
  })

  it('returns true and calls gtag(event, page_view, ...) with exactly the descriptor fields', () => {
    const calls: unknown[] = []
    ;(globalThis as { window: unknown }).window = { gtag: (...args: unknown[]) => calls.push(args) }

    const result = trackPageView(DESCRIPTOR)

    assert.equal(result, true)
    assert.equal(calls.length, 1)
    const [command, eventName, params] = calls[0] as [string, string, Record<string, unknown>]
    assert.equal(command, 'event')
    assert.equal(eventName, 'page_view')
    assert.deepEqual(Object.keys(params).sort(), ['page_location', 'page_path', 'page_title'])
  })
})

describe('trackDesignView', () => {
  it('no-ops when gtag is unavailable or the title or content id is not approved', () => {
    assert.equal(
      trackDesignView({ title: 'Fresh Prints Logo', surface: 'modal', contentId: 'abc123xyz' }),
      false,
    )
    const calls: unknown[] = []
    ;(globalThis as { window: unknown }).window = { gtag: (...args: unknown[]) => calls.push(args) }
    assert.equal(trackDesignView({ title: '   ', surface: 'modal', contentId: 'abc123xyz' }), false)
    assert.equal(
      trackDesignView({ title: 'Fresh Prints Logo', surface: 'modal', contentId: 'user@example.com' }),
      false,
    )
    assert.equal(calls.length, 0)
  })

  it('sends unprefixed design_title, design_surface, and content_id', () => {
    const calls: unknown[] = []
    ;(globalThis as { window: unknown }).window = { gtag: (...args: unknown[]) => calls.push(args) }
    const result = trackDesignView({
      title: 'Fresh Prints Logo',
      surface: 'share_page',
      contentId: 'def456xyz',
    })
    assert.equal(result, true)
    const [command, eventName, params] = calls[0] as [string, string, Record<string, unknown>]
    assert.equal(command, 'event')
    assert.equal(eventName, 'design_view')
    assert.deepEqual(Object.keys(params).sort(), ['content_id', 'design_surface', 'design_title'])
    assert.equal(params.design_title, 'Fresh Prints Logo')
    assert.equal(params.design_surface, 'share_page')
    assert.equal(params.content_id, 'def456xyz')
    assert.equal(String(params.design_title).includes('Share:'), false)
  })
})

describe('trackCatalogDesignModalView', () => {
  it('no-ops when gtag is unavailable or the title or design id is not approved', () => {
    assert.equal(
      trackCatalogDesignModalView({
        title: 'School Is Important But Fishing Is Importanter',
        designId: 'abc123xyz',
        origin: 'https://myprintrequest.com',
        parentPathname: '/catalog',
        parentSearchParams: new URLSearchParams(),
      }),
      false,
    )
    const calls: unknown[] = []
    ;(globalThis as { window: unknown }).window = { gtag: (...args: unknown[]) => calls.push(args) }
    assert.equal(
      trackCatalogDesignModalView({
        title: '   ',
        designId: 'abc123xyz',
        origin: 'https://myprintrequest.com',
        parentPathname: '/catalog',
        parentSearchParams: new URLSearchParams(),
      }),
      false,
    )
    assert.equal(
      trackCatalogDesignModalView({
        title: 'School Is Important But Fishing Is Importanter',
        designId: '../evil',
        origin: 'https://myprintrequest.com',
        parentPathname: '/catalog',
        parentSearchParams: new URLSearchParams(),
      }),
      false,
    )
    assert.equal(calls.length, 0)
  })

  it('sends one prefixed virtual page_view then one unprefixed modal design_view with content_id', () => {
    const calls: unknown[] = []
    ;(globalThis as { window: unknown }).window = { gtag: (...args: unknown[]) => calls.push(args) }
    const publicId = 'abc123xyz'
    const queryLeak = 'firestoreDesignIdAbc123'
    const result = trackCatalogDesignModalView({
      title: 'School Is Important But Fishing Is Importanter',
      designId: publicId,
      origin: 'https://myprintrequest.com',
      parentPathname: '/catalog',
      parentSearchParams: new URLSearchParams(`q=shirt&designId=${queryLeak}`),
    })
    assert.equal(result, true)
    assert.equal(calls.length, 2)

    const [pageCommand, pageEvent, pageParams] = calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ]
    assert.equal(pageCommand, 'event')
    assert.equal(pageEvent, 'page_view')
    assert.equal(
      pageParams.page_title,
      'Modal: School Is Important But Fishing Is Importanter',
    )
    assert.equal(pageParams.page_path, `/catalog/design/${publicId}`)
    assert.equal(
      pageParams.page_location,
      `https://myprintrequest.com/catalog/design/${publicId}`,
    )
    assert.equal(pageParams.page_referrer, '/catalog')
    assert.equal(JSON.stringify(pageParams).includes(queryLeak), false)
    assert.equal(JSON.stringify(pageParams).includes('q='), false)

    const [designCommand, designEvent, designParams] = calls[1] as [
      string,
      string,
      Record<string, unknown>,
    ]
    assert.equal(designCommand, 'event')
    assert.equal(designEvent, 'design_view')
    assert.deepEqual(Object.keys(designParams).sort(), [
      'content_id',
      'design_surface',
      'design_title',
    ])
    assert.equal(
      designParams.design_title,
      'School Is Important But Fishing Is Importanter',
    )
    assert.equal(String(designParams.design_title).includes('Modal:'), false)
    assert.equal(designParams.design_surface, 'modal')
    assert.equal(designParams.content_id, publicId)

    assert.equal(
      calls.some((call) => Array.isArray(call) && call[0] === 'config'),
      false,
    )
  })
})
