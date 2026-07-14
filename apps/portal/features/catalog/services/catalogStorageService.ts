import { FirebaseError } from 'firebase/app';
import { getDownloadURL, ref } from 'firebase/storage';

import { getPortalStorage } from '../../../lib/firebase/client';
import type { CatalogDesign } from '../types/catalog.types';
import {
  buildCatalogUrlCacheKey,
  catalogPathFromUrlCacheKey,
  normalizeCatalogStoragePath,
  type CatalogStoragePathRef,
} from '../utils/catalogUrlCacheKey';

/** On-demand memo only — no background prefetch (prefetch fought soft navigation). */
const inflightUrlCache = new Map<string, Promise<string | null>>();
const resolvedUrlCache = new Map<string, string>();

function toFirebaseStorageRefPath(catalogPath: string): string {
  return catalogPath.replace(/^\//, '');
}

async function fetchDownloadUrlForCatalogPath(catalogPath: string): Promise<string | null> {
  try {
    const storageRef = ref(getPortalStorage(), toFirebaseStorageRefPath(catalogPath));
    return await getDownloadURL(storageRef);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'storage/object-not-found') {
      return null;
    }

    return null;
  }
}

function resolveCacheKey(
  catalogPath: string | undefined,
  contentVersion: number | undefined,
): string | null {
  const normalizedPath = normalizeCatalogStoragePath(catalogPath);
  if (!normalizedPath) {
    return null;
  }

  return buildCatalogUrlCacheKey(normalizedPath, contentVersion);
}

export const catalogStorageService = {
  getCachedUrlForCatalogPath(
    catalogPath: string | undefined,
    contentVersion?: number,
  ): string | null | undefined {
    const cacheKey = resolveCacheKey(catalogPath, contentVersion);
    if (!cacheKey) {
      return null;
    }

    if (resolvedUrlCache.has(cacheKey)) {
      return resolvedUrlCache.get(cacheKey) ?? null;
    }

    return undefined;
  },

  getDownloadUrlForCatalogPath(
    catalogPath: string | undefined,
    contentVersion?: number,
  ): Promise<string | null> {
    const cacheKey = resolveCacheKey(catalogPath, contentVersion);
    if (!cacheKey) {
      return Promise.resolve(null);
    }

    const resolved = resolvedUrlCache.get(cacheKey);
    if (resolved !== undefined) {
      return Promise.resolve(resolved);
    }

    const cached = inflightUrlCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const normalizedPath = catalogPathFromUrlCacheKey(cacheKey);
    const request = fetchDownloadUrlForCatalogPath(normalizedPath).then((url) => {
      inflightUrlCache.delete(cacheKey);
      // Do not stick null failures — allow retry on later visits/remounts.
      if (url) {
        resolvedUrlCache.set(cacheKey, url);
      }
      return url;
    });

    inflightUrlCache.set(cacheKey, request);
    return request;
  },

  /** No-op: background prefetch made soft nav feel sticky; thumbs load on demand. */
  prefetchCatalogPaths(_pathRefs: CatalogStoragePathRef[], _limit = 32): void {
    // intentionally empty
  },

  /**
   * Drop cached URLs whose storage path is no longer in the current ready set.
   * Fresh library membership still comes from Firestore; this only frees memory.
   */
  pruneToCatalogPaths(catalogPaths: Iterable<string | undefined>): void {
    const keepPaths = new Set(
      [...catalogPaths]
        .map((path) => normalizeCatalogStoragePath(path))
        .filter((path): path is string => path !== null),
    );

    if (keepPaths.size === 0) {
      return;
    }

    for (const cacheKey of [...resolvedUrlCache.keys()]) {
      if (!keepPaths.has(catalogPathFromUrlCacheKey(cacheKey))) {
        resolvedUrlCache.delete(cacheKey);
      }
    }

    for (const cacheKey of [...inflightUrlCache.keys()]) {
      if (!keepPaths.has(catalogPathFromUrlCacheKey(cacheKey))) {
        inflightUrlCache.delete(cacheKey);
      }
    }
  },

  clearCache(): void {
    resolvedUrlCache.clear();
    inflightUrlCache.clear();
  },

  getThumbnailUrl(
    design: Pick<CatalogDesign, 'thumbnailPath' | 'updatedAtMs'>,
  ): Promise<string | null> {
    return this.getDownloadUrlForCatalogPath(design.thumbnailPath, design.updatedAtMs);
  },
};
