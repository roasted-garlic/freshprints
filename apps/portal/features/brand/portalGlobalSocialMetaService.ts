import { cache } from 'react'

import {
  resolvePortalSocialMetaSettings,
} from '@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants'

import { tryGetPortalAdminDb } from '../../lib/firebase/admin'

export interface PortalGlobalSocialMeta {
  ogTitle: string
  ogDescription: string
  /** Absolute HTTPS image URL for crawlers, or null to use brand logo path. */
  imageUrl: string | null
}

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
      cache: 'no-store',
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
  if (viaFunction) {
    return viaFunction
  }

  return loadPortalGlobalSocialMetaViaAdminSettings()
}

/**
 * Loads Studio-configured global OG title/description plus image URL from the
 * public Cloud Function (hourly library or logo). Deduped per request via React `cache`.
 */
export const loadPortalGlobalSocialMeta = cache(loadPortalGlobalSocialMetaUncached)
