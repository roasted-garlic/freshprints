import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { isPortalDevelopmentAuthOverlayHost } from './components/PortalDevelopmentAuthOverlay'

const here = path.dirname(fileURLToPath(import.meta.url))
const loginSource = readFileSync(path.join(here, '../../app/login/page.tsx'), 'utf8')
const registerSource = readFileSync(path.join(here, '../../app/register/page.tsx'), 'utf8')
const overlaySource = readFileSync(
  path.join(here, 'components/PortalDevelopmentAuthOverlay.tsx'),
  'utf8',
)
const authProviderSource = readFileSync(path.join(here, 'context/AuthProvider.tsx'), 'utf8')

describe('Portal DEV auth overlay contracts', () => {
  it('mounts overlay on login and register with server-enabled prop', () => {
    assert.match(loginSource, /PortalDevelopmentAuthOverlay/)
    assert.match(registerSource, /PortalDevelopmentAuthOverlay/)
    assert.match(loginSource, /enabled=\{showDevAuthOverlay\}/)
    assert.match(registerSource, /enabled=\{showDevAuthOverlay\}/)
    assert.match(loginSource, /shouldShowPortalDevelopmentAuthOverlay/)
    assert.match(registerSource, /shouldShowPortalDevelopmentAuthOverlay/)
  })

  it('gates overlay for localhost and tunnel .dev hosts; never production', () => {
    assert.equal(isPortalDevelopmentAuthOverlayHost('localhost'), true)
    assert.equal(isPortalDevelopmentAuthOverlayHost('127.0.0.1'), true)
    assert.equal(isPortalDevelopmentAuthOverlayHost('myprintrequest.dev'), true)
    assert.equal(isPortalDevelopmentAuthOverlayHost('www.myprintrequest.dev'), true)
    assert.equal(isPortalDevelopmentAuthOverlayHost('myprintrequest.com'), false)
    assert.equal(isPortalDevelopmentAuthOverlayHost('www.myprintrequest.com'), false)
  })

  it('shows on every /login or /register visit (ack is visit-only, not sessionStorage)', () => {
    assert.match(overlaySource, /THIS IS A DEVELOPMENT SERVER/)
    assert.match(overlaySource, /will not be fulfilled/)
    assert.match(overlaySource, /PORTAL_PRODUCTION_CUSTOMER_SITE_HOST|MyPrintRequest\.com/)
    assert.match(overlaySource, /I understand/)
    assert.match(overlaySource, /setVisible\(true\)/)
    assert.doesNotMatch(overlaySource, /sessionStorage/)
    assert.doesNotMatch(overlaySource, /localStorage/)
    assert.doesNotMatch(overlaySource, /portalDevelopmentAuthOverlayAck/)
  })

  it('AuthProvider checks DEV access and signs out with generic copy', () => {
    assert.match(authProviderSource, /portalDevCustomerAccessService\.checkAccess/)
    assert.match(authProviderSource, /PORTAL_DEV_CUSTOMER_ACCESS_RESTRICTED_MESSAGE/)
    assert.match(authProviderSource, /shouldShowPortalDevelopmentAuthOverlay/)
    assert.doesNotMatch(authProviderSource, /not on the list/i)
    assert.doesNotMatch(
      authProviderSource,
      /your email is not|email is not approved|not on the allow/i,
    )
  })
})
