import type { Metadata } from 'next'

import { isPortalSearchIndexingEnabled } from '../../brand/portalSearchIndexing'
import {
  buildPortalPageMetadata,
  getPortalSiteOrigin,
  type PortalSiteEnv,
  type PortalSocialMetaOverrides,
} from '../../brand/portalSiteMeta'
import {
  PORTAL_HELP_PAGE_DESCRIPTION,
  PORTAL_HELP_PAGE_TITLE,
  PORTAL_HELP_PATH,
} from '../portalHelpContent'

/**
 * Metadata for `/help` — canonical URL + ADR-FP-116 fail-closed robots gate.
 */
export function buildPortalHelpPageMetadata(input?: {
  env?: PortalSiteEnv
  social?: PortalSocialMetaOverrides
}): Metadata {
  const env = input?.env ?? process.env
  const origin = getPortalSiteOrigin(env)
  const pageUrl = `${origin}${PORTAL_HELP_PATH}`
  const indexingEnabled = isPortalSearchIndexingEnabled(env)

  return {
    ...buildPortalPageMetadata({
      title: PORTAL_HELP_PAGE_TITLE,
      description: PORTAL_HELP_PAGE_DESCRIPTION,
      path: PORTAL_HELP_PATH,
      env,
      social: input?.social,
    }),
    alternates: { canonical: pageUrl },
    robots: indexingEnabled
      ? { index: true, follow: true }
      : { index: false, follow: true },
  }
}
