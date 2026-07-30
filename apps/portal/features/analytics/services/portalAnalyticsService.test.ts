import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import { initializeStream, trackPageView, updatePageContext } from './portalAnalyticsService.ts'

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
