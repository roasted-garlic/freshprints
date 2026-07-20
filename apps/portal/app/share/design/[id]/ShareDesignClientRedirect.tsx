'use client'

import { useEffect } from 'react'

import { buildPortalDesignDeepLinkPath } from '../../../../features/catalog/utils/portalDesignShareUrls'

interface ShareDesignClientRedirectProps {
  designId: string
}

/**
 * Hard-navigate to the catalog deep link so AuthGate + `?designId=` open effects
 * always see a full URL (App Router soft replace from `/share/...` was unreliable).
 * No HTTP redirect from the server — crawlers keep this page's OG tags.
 */
export function ShareDesignClientRedirect({ designId }: ShareDesignClientRedirectProps) {
  const deepLinkHref = buildPortalDesignDeepLinkPath(designId)

  useEffect(() => {
    window.location.replace(deepLinkHref)
  }, [deepLinkHref])

  return (
    <main className="portal-shell portal-shell-narrow">
      <p className="portal-muted">Opening design…</p>
      <p>
        <a className="portal-link-button" href={deepLinkHref}>
          Continue to design library
        </a>
      </p>
    </main>
  )
}
