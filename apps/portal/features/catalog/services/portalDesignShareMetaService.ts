import type { Metadata } from 'next'

import { buildPortalOgShareImageFunctionUrl } from '@fresh-prints/shared/utils/portal/portalOgShareImageUrl'

import { PORTAL_APP_NAME } from '../../brand/portalBrand'
import {
  getPortalSiteOrigin,
  PORTAL_DEFAULT_DESCRIPTION,
  PORTAL_OG_IMAGE_PATH,
  type PortalSiteEnv,
} from '../../brand/portalSiteMeta'
import { isPortalSearchIndexingEnabled } from '../../brand/portalSearchIndexing'
import { tryGetPortalAdminDb } from '../../../lib/firebase/admin'
import { PORTAL_FIRESTORE_COLLECTIONS } from '../../../lib/firebase/collections'
import {
  buildPortalDesignSharePath,
  isValidPortalDesignShareId,
} from '../utils/portalDesignShareUrls'

export interface PortalDesignShareMeta {
  designId: string
  title: string
  description: string
  /** Absolute HTTPS public image URL for crawlers/page, or null to use site logo. */
  imageUrl: string | null
  categoryName: string | null
  tags: string[]
  imageAlt: string
}

function resolveFirebaseProjectId(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ''
  )
}

function resolveDesignShareOpenGraphFunctionUrl(designId: string): string | null {
  const projectId = resolveFirebaseProjectId()
  if (!projectId) {
    return null
  }
  const params = new URLSearchParams({ designId })
  return `https://us-central1-${projectId}.cloudfunctions.net/getPortalDesignShareOpenGraph?${params.toString()}`
}

function buildStableShareImageUrl(
  designId: string,
  backgroundHex: unknown,
): string | null {
  const projectId = resolveFirebaseProjectId()
  if (!projectId) {
    return null
  }
  return buildPortalOgShareImageFunctionUrl({
    projectId,
    designId,
    backgroundHex,
  })
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const out: string[] = []
  for (const tag of value) {
    if (typeof tag !== 'string') {
      continue
    }
    const trimmed = tag.trim()
    if (trimmed && !out.includes(trimmed)) {
      out.push(trimmed)
    }
  }
  return out.slice(0, 24)
}

async function resolveCategoryName(categoryId: unknown): Promise<string | null> {
  if (typeof categoryId !== 'string' || !categoryId.trim()) {
    return null
  }
  const db = tryGetPortalAdminDb()
  if (!db) {
    return null
  }
  try {
    const snap = await db
      .collection(PORTAL_FIRESTORE_COLLECTIONS.categories)
      .doc(categoryId.trim())
      .get()
    if (!snap.exists) {
      return null
    }
    const name = snap.data()?.name
    return typeof name === 'string' && name.trim() ? name.trim() : null
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

    const imageUrl = imagePath ? buildStableShareImageUrl(designId, data.artworkBackgroundHex) : null
    const tags = normalizeTags(data.tags)
    const categoryName = await resolveCategoryName(data.categoryId)

    return {
      designId,
      title,
      description,
      imageUrl,
      categoryName,
      tags,
      imageAlt: `${title} design preview`,
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
    const payload = (await response.json()) as Partial<PortalDesignShareMeta> & {
      categoryName?: unknown
      tags?: unknown
    }
    if (
      typeof payload.title !== 'string' ||
      !payload.title.trim() ||
      typeof payload.description !== 'string' ||
      !payload.description.trim()
    ) {
      return null
    }
    const title = payload.title.trim()
    const imageUrl =
      typeof payload.imageUrl === 'string' && payload.imageUrl.trim()
        ? payload.imageUrl.trim()
        : buildStableShareImageUrl(designId, undefined)

    // Prefer Function image when it is already the public compositor; otherwise force stable URL.
    const stableImage =
      imageUrl && imageUrl.includes('getPortalOgShareImage')
        ? imageUrl
        : buildStableShareImageUrl(designId, undefined)

    return {
      designId,
      title,
      description: payload.description.trim(),
      imageUrl: stableImage,
      categoryName:
        typeof payload.categoryName === 'string' && payload.categoryName.trim()
          ? payload.categoryName.trim()
          : null,
      tags: normalizeTags(payload.tags),
      imageAlt: `${title} design preview`,
    }
  } catch {
    return null
  }
}

/**
 * Loads ready-catalog share fields for OG + SSR landing.
 * Prefer Cloud Function (works on local Portal without ADC); Admin is a fast path when available.
 * Image URLs are always public Function URLs (never short-lived signed Storage).
 */
export async function loadPortalDesignShareMeta(
  designId: string,
): Promise<PortalDesignShareMeta | null> {
  if (!isValidPortalDesignShareId(designId)) {
    return null
  }

  const viaFunction = await loadPortalDesignShareMetaViaFunction(designId)
  if (viaFunction?.imageUrl) {
    // Enrich category/tags from Admin when Function payload lacks them.
    if ((!viaFunction.categoryName || viaFunction.tags.length === 0) && tryGetPortalAdminDb()) {
      const viaAdmin = await loadPortalDesignShareMetaViaAdmin(designId)
      if (viaAdmin) {
        return {
          ...viaFunction,
          categoryName: viaFunction.categoryName ?? viaAdmin.categoryName,
          tags: viaFunction.tags.length > 0 ? viaFunction.tags : viaAdmin.tags,
          imageAlt: viaAdmin.imageAlt,
        }
      }
    }
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
  const indexingEnabled = isPortalSearchIndexingEnabled(env)
  const canIndex = indexingEnabled && meta != null

  if (!meta) {
    return {
      title: PORTAL_APP_NAME,
      description: PORTAL_DEFAULT_DESCRIPTION,
      alternates: { canonical: pageUrl },
      robots: { index: false, follow: false },
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
      ? { url: meta.imageUrl, alt: meta.imageAlt }
      : { url: PORTAL_OG_IMAGE_PATH, alt: meta.imageAlt }

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: pageUrl },
    robots: canIndex
      ? { index: true, follow: true }
      : { index: false, follow: true },
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
