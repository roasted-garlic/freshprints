import {
  resolvePortalSocialMetaSettings,
} from '@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants'
import { createBoundedAsyncCache } from '@fresh-prints/shared/utils/boundedAsyncCache'

import { tryGetPortalAdminDb } from '../../lib/firebase/admin'

export interface PortalGlobalSocialMeta {
  ogTitle: string
  ogDescription: string
  /** Absolute HTTPS image URL for crawlers, or null to use brand logo path. */
  imageUrl: string | null
}

export const PORTAL_GLOBAL_SOCIAL_META_REVALIDATE_SECONDS = 3600
const socialMetaCache = createBoundedAsyncCache<PortalGlobalSocialMeta>({
  maxEntries: 1,
  ttlMs: PORTAL_GLOBAL_SOCIAL_META_REVALIDATE_SECONDS * 1000,
})

function defaultPortalGlobalSocialMeta(): PortalGlobalSocialMeta {
  const defaults = resolvePortalSocialMetaSettings(undefined)
  return {
    ogTitle: defaults.ogTitle,
    ogDescription: defaults.ogDescription,
    imageUrl: null,
  }
}

function resolveGlobalOpenGraphFunctionUrl(): string | null {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ''
  if (!projectId) {
    return null
  }
  return `https://us-central1-${projectId}.cloudfunctions.net/getPortalGlobalOpenGraph`
}

async function loadPortalGlobalSocialMetaViaFunction(): Promise<PortalGlobalSocialMeta | null> {
  const url = resolveGlobalOpenGraphFunctionUrl()
  if (!url) {
    return null
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: PORTAL_GLOBAL_SOCIAL_META_REVALIDATE_SECONDS },
    })
    if (!response.ok) {
      return null
    }
    const payload = (await response.json()) as Partial<PortalGlobalSocialMeta>
    if (
      typeof payload.ogTitle !== 'string' ||
      !payload.ogTitle.trim() ||
      typeof payload.ogDescription !== 'string' ||
      !payload.ogDescription.trim()
    ) {
      return null
    }
    return {
      ogTitle: payload.ogTitle.trim(),
      ogDescription: payload.ogDescription.trim(),
      imageUrl:
        typeof payload.imageUrl === 'string' && payload.imageUrl.trim()
          ? payload.imageUrl.trim()
          : null,
    }
  } catch {
    return null
  }
}

/**
 * Optional Admin fallback only when Function is unavailable.
 * Intentionally lightweight: settings title/description only — no library query
 * (avoids the old 1.5s budget race that caused logo fallback).
 */
async function loadPortalGlobalSocialMetaViaAdminSettings(): Promise<PortalGlobalSocialMeta> {
  const defaults = defaultPortalGlobalSocialMeta()
  const db = tryGetPortalAdminDb()
  if (!db) {
    return defaults
  }

  try {
    const settingsSnap = await db.collection('settings').doc('portalSocialMeta').get()
    const resolved = resolvePortalSocialMetaSettings(settingsSnap.data())
    return {
      ogTitle: resolved.ogTitle,
      ogDescription: resolved.ogDescription,
      // Image requires Function (or compositor); do not re-query library here.
      imageUrl: null,
    }
  } catch {
    return defaults
  }
}

async function loadPortalGlobalSocialMetaUncached(): Promise<PortalGlobalSocialMeta> {
  const viaFunction = await loadPortalGlobalSocialMetaViaFunction()
  if (!viaFunction) throw new Error('portal-global-social-meta-unavailable')
  return viaFunction
}

/**
 * Loads Studio-configured global OG title/description plus image URL from the
 * public Cloud Function. One bounded one-hour cache is shared by every metadata caller in this
 * server process; Next's fetch cache provides the same one-hour revalidation across processes.
 * Failed Function loads are evicted and use the lightweight Admin/default fallback for that call.
 */
export async function loadPortalGlobalSocialMeta(): Promise<PortalGlobalSocialMeta> {
  try {
    return await socialMetaCache.get('global', loadPortalGlobalSocialMetaUncached)
  } catch {
    return loadPortalGlobalSocialMetaViaAdminSettings()
  }
}
