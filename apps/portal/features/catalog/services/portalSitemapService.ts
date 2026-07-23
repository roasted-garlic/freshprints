import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'

import { tryGetPortalAdminDb } from '../../../lib/firebase/admin'
import { PORTAL_FIRESTORE_COLLECTIONS } from '../../../lib/firebase/collections'
import { isValidPortalDesignShareId } from '../utils/portalDesignShareUrls'

const PAGE_SIZE = 500
/** Soft cap for a single sitemap response before we should segment (follow-up). */
export const PORTAL_SITEMAP_READY_DESIGN_SOFT_CAP = 10_000

export interface PortalSitemapDesignEntry {
  id: string
  lastModified: Date | null
}

function toDate(value: unknown): Date | null {
  if (value == null) {
    return null
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date }
    if (typeof maybe.toDate === 'function') {
      try {
        const d = maybe.toDate()
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * Lists ready-catalog design ids for sitemap.
 * When Admin is unavailable, returns [] so the route still emits static URLs (HTTP 200).
 */
export async function loadReadyDesignSitemapEntries(): Promise<PortalSitemapDesignEntry[]> {
  const db = tryGetPortalAdminDb()
  if (!db) {
    return []
  }

  const entries: PortalSitemapDesignEntry[] = []

  try {
    let lastDoc: QueryDocumentSnapshot | null = null

    while (entries.length < PORTAL_SITEMAP_READY_DESIGN_SOFT_CAP) {
      let query = db
        .collection(PORTAL_FIRESTORE_COLLECTIONS.designs)
        .where('status', '==', 'ready')
        .orderBy('__name__')
        .limit(PAGE_SIZE)

      if (lastDoc) {
        query = query.startAfter(lastDoc)
      }

      const snapshot = await query.get()
      if (snapshot.empty) {
        break
      }

      for (const doc of snapshot.docs) {
        if (!isValidPortalDesignShareId(doc.id)) {
          continue
        }
        const data = doc.data() ?? {}
        entries.push({
          id: doc.id,
          lastModified: toDate(data.updatedAt) ?? toDate(data.createdAt),
        })
        if (entries.length >= PORTAL_SITEMAP_READY_DESIGN_SOFT_CAP) {
          break
        }
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null
      if (!lastDoc || snapshot.size < PAGE_SIZE) {
        break
      }
    }
  } catch {
    return entries
  }

  return entries
}
