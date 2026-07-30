import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildPortalGa4LoaderSrc, PORTAL_GA4_STUB_SCRIPT } from './PortalAnalyticsScript.tsx'

describe('PORTAL_GA4_STUB_SCRIPT', () => {
  it('contains no gtag("config", ...) or gtag("set", ...) call of any kind', () => {
    assert.ok(!PORTAL_GA4_STUB_SCRIPT.includes("gtag('config'"))
    assert.ok(!PORTAL_GA4_STUB_SCRIPT.includes('gtag("config"'))
    assert.ok(!PORTAL_GA4_STUB_SCRIPT.includes("gtag('set'"))
    assert.ok(!PORTAL_GA4_STUB_SCRIPT.includes('gtag("set"'))
  })

  it('only defines dataLayer and the gtag stub function', () => {
    assert.ok(PORTAL_GA4_STUB_SCRIPT.includes('window.dataLayer'))
    assert.ok(PORTAL_GA4_STUB_SCRIPT.includes('function gtag('))
  })
})

describe('buildPortalGa4LoaderSrc', () => {
  it('builds the gtag.js loader URL with the given measurement id', () => {
    assert.equal(
      buildPortalGa4LoaderSrc('G-TEST123'),
      'https://www.googletagmanager.com/gtag/js?id=G-TEST123',
    )
  })
})

describe('thin-component guarantee (regression, per required correction)', () => {
  const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'PortalAnalyticsScript.tsx')
  const rawSource = readFileSync(sourcePath, 'utf8')
  // Strip /* */ and // comments before checking for actual call sites, since the
  // doc comments intentionally *describe* what must not appear here, which would
  // otherwise produce a false-positive match against their own prose.
  const codeOnly = rawSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

  it('the component source contains no gtag("config"/"set", ...) call, route sanitization, or identity logic', () => {
    assert.ok(!codeOnly.includes("gtag('config'"))
    assert.ok(!codeOnly.includes('gtag("config"'))
    assert.ok(!codeOnly.includes("gtag('set'"))
    assert.ok(!codeOnly.includes('gtag("set"'))
    assert.ok(!codeOnly.includes('buildSanitizedAnalyticsPageDescriptor'))
    assert.ok(!codeOnly.includes('buildNavigationIdentity'))
    assert.ok(!codeOnly.includes('navigationIdentityKey'))
  })

  it("its only new responsibility beyond loading scripts is reporting readiness via onReady, never deciding readiness's meaning itself", () => {
    assert.ok(codeOnly.includes('onReady'))
    // The component must not introduce its own readiness/initialized state — it only
    // forwards the next/script onReady callback it receives as a prop.
    assert.ok(!codeOnly.includes('useState'))
    assert.ok(!codeOnly.includes('useRef'))
  })
})
