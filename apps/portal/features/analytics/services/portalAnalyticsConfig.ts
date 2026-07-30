import { isPortalAnalyticsHostAllowed } from './portalAnalyticsHostGate'

import type { PortalAnalyticsConfig, PortalAnalyticsEnv } from '../types/portalAnalytics.types'

/**
 * Resolves whether Portal analytics is active. Inert unless a Measurement ID is
 * configured AND the resolved origin is the production customer host.
 */
export function resolvePortalAnalyticsConfig(
  env: PortalAnalyticsEnv = process.env,
): PortalAnalyticsConfig {
  const measurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || null
  if (!measurementId) return { enabled: false, measurementId: null }
  if (!isPortalAnalyticsHostAllowed(env)) return { enabled: false, measurementId: null }
  return { enabled: true, measurementId }
}
