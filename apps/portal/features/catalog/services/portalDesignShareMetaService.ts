import type { Metadata } from 'next'

import { PORTAL_APP_NAME } from '../../brand/portalBrand'
import {
  getPortalSiteOrigin,
  PORTAL_DEFAULT_DESCRIPTION,
  PORTAL_OG_IMAGE_PATH,
  type PortalSiteEnv,
} from '../../brand/portalSiteMeta'
import { tryGetPortalAdminDb, tryGetPortalAdminStorage } from '../../../lib/firebase/admin'
import { PORTAL_FIRESTORE_COLLECTIONS } from '../../../lib/firebase/collections'
import {
  buildPortalDesignSharePath,
  isValidPortalDesignShareId,
} from '../utils/portalDesignShareUrls'

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface PortalDesignShareMeta {
  designId: string
  title: string
  description: string
  /** Absolute HTTPS image URL for crawlers, or null to use site logo. */
  imageUrl: string | null
}

function normalizeStorageObjectPath(path: string): string {
  return path.trim().replace(/^\/+/, '')
}

async function resolveShareImageUrl(storagePath: string): Promise<string | null> {
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

/**
 * Loads ready-catalog share fields for OG. Returns null when Admin is unavailable,
 * the id is invalid, or the design is missing / not ready.
 */
export async function loadPortalDesignShareMeta(
  designId: string,
): Promise<PortalDesignShareMeta | null> {
  if (!isValidPortalDesignShareId(designId)) {
    return null
  }

  const db = tryGetPortalAdminDb()
  if (!db) {
    return null
  }

  try {
    const snapshot = await db.collection(PORTAL_FIRESTORE_COLLECTIONS.designs).doc(designId).get()
    if (!snapshot.exists) {
      return null
    }

    const data = snapshot.data() ?? {}
    if (data.status !== 'ready' || typeof data.title !== 'string' || !data.title.trim()) {
      return null
    }

    const title = data.title.trim()
    const description =
      typeof data.description === 'string' && data.description.trim()
        ? data.description.trim()
        : PORTAL_DEFAULT_DESCRIPTION

    const imagePath =
      (typeof data.previewPath === 'string' && data.previewPath.trim()) ||
      (typeof data.thumbnailPath === 'string' && data.thumbnailPath.trim()) ||
      ''

    const imageUrl = imagePath ? await resolveShareImageUrl(imagePath) : null

    return {
      designId,
      title,
      description,
      imageUrl,
    }
  } catch {
    return null
  }
}

export function buildPortalDesignShareMetadata(
  designId: string,
  meta: PortalDesignShareMeta | null,
  env: PortalSiteEnv = process.env,
): Metadata {
  const origin = getPortalSiteOrigin(env)
  const path = buildPortalDesignSharePath(designId)
  const pageUrl = `${origin}${path}`

  if (!meta) {
    return {
      title: PORTAL_APP_NAME,
      description: PORTAL_DEFAULT_DESCRIPTION,
      openGraph: {
        type: 'website',
        siteName: PORTAL_APP_NAME,
        title: PORTAL_APP_NAME,
        description: PORTAL_DEFAULT_DESCRIPTION,
        url: pageUrl,
        images: [{ url: PORTAL_OG_IMAGE_PATH, alt: PORTAL_APP_NAME }],
      },
      twitter: {
        card: 'summary_large_image',
        title: PORTAL_APP_NAME,
        description: PORTAL_DEFAULT_DESCRIPTION,
        images: [PORTAL_OG_IMAGE_PATH],
      },
    }
  }

  const image =
    meta.imageUrl != null
      ? { url: meta.imageUrl, alt: meta.title }
      : { url: PORTAL_OG_IMAGE_PATH, alt: meta.title }

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      type: 'website',
      siteName: PORTAL_APP_NAME,
      title: meta.title,
      description: meta.description,
      url: pageUrl,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [meta.imageUrl ?? PORTAL_OG_IMAGE_PATH],
    },
  }
}
