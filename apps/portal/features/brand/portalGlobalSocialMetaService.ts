import {
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  resolvePortalSocialMetaSettings,
} from '@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants'
import { createBoundedAsyncCache } from '@fresh-prints/shared/utils/boundedAsyncCache'

import { tryGetPortalAdminDb } from '../../lib/firebase/admin'

export interface PortalGlobalSocialMeta {
  ogTitle: string
  ogDescription: string
  /** Absolute HTTPS image URL for crawlers, or null to use brand logo path. */
  imageUrl: string | null
  /** Settings updatedAt millis when known — used for Function ?v= cache bust. */
  updatedAtMs: number | null
}

/** Short revalidate so Studio Save is visible on Portal without hour-long sticky meta. */
export const PORTAL_GLOBAL_SOCIAL_META_REVALIDATE_SECONDS = 60
const socialMetaCache = createBoundedAsyncCache<PortalGlobalSocialMeta>({
  maxEntries: 4,
  ttlMs: PORTAL_GLOBAL_SOCIAL_META_REVALIDATE_SECONDS * 1000,
})

function defaultPortalGlobalSocialMeta(): PortalGlobalSocialMeta {
  const defaults = resolvePortalSocialMetaSettings(undefined)
  return {
    ogTitle: defaults.ogTitle,
    ogDescription: defaults.ogDescription,
    imageUrl: null,
    updatedAtMs: null,
  }
}

function toMillis(value: unknown): number | null {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds: unknown }).seconds === 'number'
  ) {
    const nanos =
      'nanoseconds' in value && typeof (value as { nanoseconds: unknown }).nanoseconds === 'number'
        ? (value as { nanoseconds: number }).nanoseconds
        : 0
    return (value as { seconds: number }).seconds * 1000 + Math.floor(nanos / 1e6)
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return null
}

function resolveGlobalOpenGraphFunctionUrl(versionMs: number | null): string | null {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ''
  if (!projectId) {
    return null
  }
  const base = `https://us-central1-${projectId}.cloudfunctions.net/getPortalGlobalOpenGraph`
  if (versionMs === null) {
    return base
  }
  return `${base}?v=${encodeURIComponent(String(versionMs))}`
}

async function readPortalSocialMetaUpdatedAtMs(): Promise<number | null> {
  const db = tryGetPortalAdminDb()
  if (!db) {
    return null
  }
  try {
    const settingsSnap = await db
      .collection('settings')
      .doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID)
      .get()
    return toMillis(settingsSnap.data()?.updatedAt) ?? toMillis(settingsSnap.updateTime)
  } catch {
    return null
  }
}

async function loadPortalGlobalSocialMetaViaFunction(
  versionMs: number | null,
): Promise<PortalGlobalSocialMeta | null> {
  const url = resolveGlobalOpenGraphFunctionUrl(versionMs)
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
    const payload = (await response.json()) as Partial<PortalGlobalSocialMeta> & {
      updatedAtMs?: unknown
    }
    if (
      typeof payload.ogTitle !== 'string' ||
      !payload.ogTitle.trim() ||
      typeof payload.ogDescription !== 'string' ||
      !payload.ogDescription.trim()
    ) {
      return null
    }
    const responseUpdatedAtMs = toMillis(payload.updatedAtMs)
    return {
      ogTitle: payload.ogTitle.trim(),
      ogDescription: payload.ogDescription.trim(),
      imageUrl:
        typeof payload.imageUrl === 'string' && payload.imageUrl.trim()
          ? payload.imageUrl.trim()
          : null,
      updatedAtMs: responseUpdatedAtMs ?? versionMs,
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
    const settingsSnap = await db
      .collection('settings')
      .doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID)
      .get()
    const resolved = resolvePortalSocialMetaSettings(settingsSnap.data())
    return {
      ogTitle: resolved.ogTitle,
      ogDescription: resolved.ogDescription,
      // Image requires Function (or compositor); do not re-query library here.
      imageUrl: null,
      updatedAtMs: toMillis(resolved.updatedAt) ?? toMillis(settingsSnap.updateTime),
    }
  } catch {
    return defaults
  }
}

/**
 * Loads Studio-configured global OG title/description plus image URL from the
 * public Cloud Function. Bounded short TTL + `?v=updatedAt` so Save activates coherently.
 * Failed Function loads are evicted and use the lightweight Admin/default fallback for that call.
 */
export async function loadPortalGlobalSocialMeta(): Promise<PortalGlobalSocialMeta> {
  try {
    const versionMs = await readPortalSocialMetaUpdatedAtMs()
    const cacheKey = `global:${versionMs ?? 'default'}`
    return await socialMetaCache.get(cacheKey, async () => {
      const viaFunction = await loadPortalGlobalSocialMetaViaFunction(versionMs)
      if (!viaFunction) throw new Error('portal-global-social-meta-unavailable')
      return viaFunction
    })
  } catch {
    return loadPortalGlobalSocialMetaViaAdminSettings()
  }
}
