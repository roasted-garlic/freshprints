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
    // Fail closed for .dev / local / staging — still a real robots.txt for testing.
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
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
