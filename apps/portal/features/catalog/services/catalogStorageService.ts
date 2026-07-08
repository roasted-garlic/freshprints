import { FirebaseError } from 'firebase/app';
import { getDownloadURL, ref } from 'firebase/storage';

import { getPortalStorage } from '../../../lib/firebase/client';
import type { CatalogDesign } from '../types/catalog.types';

const urlCache = new Map<string, Promise<string | null>>();
const resolvedUrlCache = new Map<string, string | null>();

function toFirebaseStorageRefPath(catalogPath: string): string {
  return catalogPath.replace(/^\//, '');
}

function normalizeCatalogPath(catalogPath: string | undefined): string | null {
  if (!catalogPath?.trim()) {
    return null;
  }

  return catalogPath.trim();
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

export const catalogStorageService = {
  getCachedUrlForCatalogPath(catalogPath: string | undefined): string | null | undefined {
    const normalizedPath = normalizeCatalogPath(catalogPath);

    if (!normalizedPath) {
      return null;
    }

    if (resolvedUrlCache.has(normalizedPath)) {
      return resolvedUrlCache.get(normalizedPath) ?? null;
    }

    return undefined;
  },

  getDownloadUrlForCatalogPath(catalogPath: string | undefined): Promise<string | null> {
    const normalizedPath = normalizeCatalogPath(catalogPath);

    if (!normalizedPath) {
      return Promise.resolve(null);
    }

    if (resolvedUrlCache.has(normalizedPath)) {
      return Promise.resolve(resolvedUrlCache.get(normalizedPath) ?? null);
    }

    const cached = urlCache.get(normalizedPath);

    if (cached) {
      return cached;
    }

    const request = fetchDownloadUrlForCatalogPath(normalizedPath).then((url) => {
      resolvedUrlCache.set(normalizedPath, url);
      return url;
    });
    urlCache.set(normalizedPath, request);
    return request;
  },

  prefetchCatalogPaths(catalogPaths: Array<string | undefined>, limit = 64): void {
    const uniquePaths = [...new Set(catalogPaths.map(normalizeCatalogPath).filter(Boolean))] as string[];

    for (const path of uniquePaths.slice(0, limit)) {
      void this.getDownloadUrlForCatalogPath(path);
    }
  },

  getThumbnailUrl(design: Pick<CatalogDesign, 'thumbnailPath'>): Promise<string | null> {
    return this.getDownloadUrlForCatalogPath(design.thumbnailPath);
  },
};
