import type { MetadataRoute } from 'next'

import { buildPortalDesignSharePath } from '../features/catalog/utils/portalDesignShareUrls'
import { loadReadyDesignSitemapEntries } from '../features/catalog/services/portalSitemapService'
import { portalSitemapStaticPaths } from '../features/brand/portalSearchIndexing'
import { getPortalSiteOrigin } from '../features/brand/portalSiteMeta'

/** Newly approved designs appear in the sitemap within this window (seconds). */
export const revalidate = 3600

function staticPriority(path: string): number {
  if (path === '/') return 1
  if (path === '/catalog') return 0.9
  if (path === '/catalog/library') return 0.8
  if (path === '/help') return 0.7
  return 0.6
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPortalSiteOrigin()
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = portalSitemapStaticPaths().map((path) => ({
    url: `${origin}${path === '/' ? '/' : path}`,
    lastModified: now,
    changeFrequency: path === '/help' ? ('monthly' as const) : ('daily' as const),
    priority: staticPriority(path),
  }))

  const designs = await loadReadyDesignSitemapEntries()
  const designEntries: MetadataRoute.Sitemap = designs.map((entry) => ({
    url: `${origin}${buildPortalDesignSharePath(entry.id)}`,
    lastModified: entry.lastModified ?? now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticEntries, ...designEntries]
}
