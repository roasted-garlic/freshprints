'use client'

import { useEffect, useState } from 'react'

import {
  PORTAL_PRODUCTION_CUSTOMER_SITE_HOST,
  PORTAL_PRODUCTION_CUSTOMER_SITE_URL,
} from '@fresh-prints/shared/constants/portal/portalDevCustomerAccess.constants'

/**
 * Runtime host check for localhost + tunnel (.dev). Never trusts production customer host.
 * `myprintrequest.dev` is the DEV tunnel to local Portal — not a separate App Hosting deploy.
 */
export function isPortalDevelopmentAuthOverlayHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase()
  if (!host) {
    return false
  }
  if (host === 'myprintrequest.com' || host === 'www.myprintrequest.com') {
    return false
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    return true
  }
  return host === 'myprintrequest.dev' || host.endsWith('.myprintrequest.dev')
}

/**
 * Full-screen DEV warning on /login and /register only.
 * `enabled` is the authoritative server gate (`fresh-prints-dev` project signal).
 * Client also verifies localhost or tunneled `myprintrequest.dev`.
 * Acknowledgement dismisses only this visit; navigating to /login or /register again shows it.
 */
export function PortalDevelopmentAuthOverlay({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setVisible(false)
      return
    }
    if (!isPortalDevelopmentAuthOverlayHost(window.location.hostname)) {
      setVisible(false)
      return
    }
    setVisible(true)
  }, [enabled])

  if (!visible) {
    return null
  }

  return (
    <div
      aria-labelledby="portal-development-auth-overlay-heading"
      aria-modal="true"
      className="portal-development-auth-overlay"
      data-testid="portal-development-auth-overlay"
      role="dialog"
    >
      <div className="portal-development-auth-overlay-panel">
        <h2
          className="portal-development-auth-overlay-heading"
          id="portal-development-auth-overlay-heading"
        >
          THIS IS A DEVELOPMENT SERVER
        </h2>
        <p className="portal-development-auth-overlay-body">
          Requests submitted here will not be fulfilled. For real print requests, go to{' '}
          <a
            className="portal-development-auth-overlay-link"
            href={PORTAL_PRODUCTION_CUSTOMER_SITE_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            {PORTAL_PRODUCTION_CUSTOMER_SITE_HOST}
          </a>
          .
        </p>
      </div>
      <button
        className="portal-development-auth-overlay-ack"
        onClick={() => setVisible(false)}
        type="button"
      >
        I understand
      </button>
    </div>
  )
}
