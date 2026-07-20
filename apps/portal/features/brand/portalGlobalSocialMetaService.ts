import { cache } from 'react'

import {
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  resolvePortalSocialMetaSettings,
} from '@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants'

import { tryGetPortalAdminDb, tryGetPortalAdminStorage } from '../../lib/firebase/admin'
import { PORTAL_FIRESTORE_COLLECTIONS } from '../../lib/firebase/collections'
import {
  pickDailyRotatedIndex,
  PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE,
} from './pickDailyRotatedIndex'

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface PortalGlobalSocialMeta {
  ogTitle: string
  ogDescription: string
  /** Absolute HTTPS image URL for crawlers, or null to use brand logo path. */
  imageUrl: string | null
}

function normalizeStorageObjectPath(path: string): string {
  return path.trim().replace(/^\/+/, '')
}

async function resolveSignedImageUrl(storagePath: string): Promise<string | null> {
  const storage = tryGetPortalAdminStorage()
  if (!storage) {
    return null
  }

  const objectPath = normalizeStorageObjectPath(storagePath)
  if (!objectPath) {
    return null
  }

  try {
    const file = storage.bucket().file(objectPath)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
    })
    return url
  } catch {
    return null
  }
}

async function loadDailyRotatedLibraryImageUrl(): Promise<string | null> {
  const db = tryGetPortalAdminDb()
  if (!db) {
    return null
  }

  try {
    const snapshot = await db
      .collection(PORTAL_FIRESTORE_COLLECTIONS.designs)
      .where('status', '==', 'ready')
      .orderBy('createdAt', 'desc')
      .limit(PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE)
      .get()

    if (snapshot.empty) {
      return null
    }

    const docs = snapshot.docs
    const index = pickDailyRotatedIndex(docs.length)
    const data = docs[index]?.data() ?? {}
    const imagePath =
      (typeof data.previewPath === 'string' && data.previewPath.trim()) ||
      (typeof data.thumbnailPath === 'string' && data.thumbnailPath.trim()) ||
      ''

    return imagePath ? resolveSignedImageUrl(imagePath) : null
  } catch {
    return null
  }
}

async function loadPortalGlobalSocialMetaUncached(): Promise<PortalGlobalSocialMeta> {
  const defaults = resolvePortalSocialMetaSettings(undefined)
  const db = tryGetPortalAdminDb()

  let ogTitle = defaults.ogTitle
  let ogDescription = defaults.ogDescription

  if (db) {
    try {
      const settingsSnap = await db.collection('settings').doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID).get()
      const resolved = resolvePortalSocialMetaSettings(settingsSnap.data())
      ogTitle = resolved.ogTitle
      ogDescription = resolved.ogDescription
    } catch {
      // Keep defaults when Admin/settings read fails.
    }
  }

  const imageUrl = await loadDailyRotatedLibraryImageUrl()

  return { ogTitle, ogDescription, imageUrl }
}

/**
 * Loads Studio-configured global OG title/description plus a daily-rotated
 * ready-library image. Deduped per request via React `cache`.
 */
export const loadPortalGlobalSocialMeta = cache(loadPortalGlobalSocialMetaUncached)
