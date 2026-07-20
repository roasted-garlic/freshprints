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

function resolveDesignShareOpenGraphFunctionUrl(designId: string): string | null {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ''
  if (!projectId) {
    return null
  }
  const params = new URLSearchParams({ designId })
  return `https://us-central1-${projectId}.cloudfunctions.net/getPortalDesignShareOpenGraph?${params.toString()}`
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

async function loadPortalDesignShareMetaViaAdmin(
  designId: string,
): Promise<PortalDesignShareMeta | null> {
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

async function loadPortalDesignShareMetaViaFunction(
  designId: string,
): Promise<PortalDesignShareMeta | null> {
  const url = resolveDesignShareOpenGraphFunctionUrl(designId)
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
    const payload = (await response.json()) as Partial<PortalDesignShareMeta>
    if (
      typeof payload.title !== 'string' ||
      !payload.title.trim() ||
      typeof payload.description !== 'string' ||
      !payload.description.trim()
    ) {
      return null
    }
    return {
      designId,
      title: payload.title.trim(),
      description: payload.description.trim(),
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
 * Loads ready-catalog share fields for OG.
 * Prefer Cloud Function (works on local Portal without ADC); Admin is a fast path when available.
 */
export async function loadPortalDesignShareMeta(
  designId: string,
): Promise<PortalDesignShareMeta | null> {
  if (!isValidPortalDesignShareId(designId)) {
    return null
  }

  const viaFunction = await loadPortalDesignShareMetaViaFunction(designId)
  if (viaFunction?.imageUrl) {
    return viaFunction
  }

  const viaAdmin = await loadPortalDesignShareMetaViaAdmin(designId)
  if (viaAdmin?.imageUrl) {
    return viaAdmin
  }

  return viaFunction ?? viaAdmin
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
