'use client'

import { Suspense, useCallback, useState } from 'react'

import { usePortalAnalyticsController } from '../hooks/usePortalAnalyticsController'
import type { PortalAnalyticsConfig } from '../types/portalAnalytics.types'

import { PortalAnalyticsScript } from './PortalAnalyticsScript'

function PortalAnalyticsControllerMount({
  config,
  scriptReady,
}: {
  config: PortalAnalyticsConfig
  scriptReady: boolean
}) {
  usePortalAnalyticsController(config, scriptReady)
  return null
}

/**
 * Mounts the analytics script loader and the controller hook, and owns the small
 * boolean readiness handshake between them: `next/script`'s `onReady` callback (fired
 * once the `dataLayer`/`gtag` stub has actually executed) flips `scriptReady` to
 * `true`, which the controller depends on before attempting initialization (Plan
 * Section 5/6c — `usePortalAnalyticsController` remains the sole owner of the
 * initialization/page-view decisions; this component only reports readiness, it does
 * not decide anything about `gtag` calls itself).
 *
 * Wraps the controller in `<Suspense>` because it calls `useSearchParams()`, which
 * Next.js requires to be wrapped in a Suspense boundary for any Client Component under
 * prerendering (Plan Section 4.2). Renders nothing when analytics is disabled.
 */
export function PortalAnalyticsBoundary({ config }: { config: PortalAnalyticsConfig }) {
  const [scriptReady, setScriptReady] = useState(false)
  const handleReady = useCallback(() => setScriptReady(true), [])

  if (!config.enabled) return null

  return (
    <>
      <PortalAnalyticsScript config={config} onReady={handleReady} />
      <Suspense fallback={null}>
        <PortalAnalyticsControllerMount config={config} scriptReady={scriptReady} />
      </Suspense>
    </>
  )
}
