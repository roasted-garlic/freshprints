import type { MetadataRoute } from 'next'

import {
  isPortalSearchIndexingEnabled,
  portalRobotsAllowPaths,
  portalRobotsDisallowPaths,
} from '../features/brand/portalSearchIndexing'
import { getPortalSiteOrigin } from '../features/brand/portalSiteMeta'

export default function robots(): MetadataRoute.Robots {
  const origin = getPortalSiteOrigin()
  const indexingEnabled = isPortalSearchIndexingEnabled()

  if (!indexingEnabled) {
    // DEV / non-prod: allow crawlers to fetch pages so they can observe noindex
    // (HTML robots meta + X-Robots-Tag). Do not use Disallow:/ as the primary
    // search-removal strategy — blocked URLs may remain as URL-only results.
    // No sitemap advertisement.
    return {
      rules: {
        userAgent: '*',
        allow: '/',
      },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: portalRobotsAllowPaths(),
      disallow: portalRobotsDisallowPaths(),
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}
