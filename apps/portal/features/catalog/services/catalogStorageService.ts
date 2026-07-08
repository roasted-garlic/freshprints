import { FirebaseError } from 'firebase/app';
import { getDownloadURL, ref } from 'firebase/storage';

import { getPortalStorage } from '../../../lib/firebase/client';
import type { CatalogDesign } from '../types/catalog.types';

const urlCache = new Map<string, Promise<string | null>>();

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
  getDownloadUrlForCatalogPath(catalogPath: string | undefined): Promise<string | null> {
    const normalizedPath = normalizeCatalogPath(catalogPath);

    if (!normalizedPath) {
      return Promise.resolve(null);
    }

    const cached = urlCache.get(normalizedPath);

    if (cached) {
      return cached;
    }

    const request = fetchDownloadUrlForCatalogPath(normalizedPath);
    urlCache.set(normalizedPath, request);
    return request;
  },

  getThumbnailUrl(design: Pick<CatalogDesign, 'thumbnailPath'>): Promise<string | null> {
    return this.getDownloadUrlForCatalogPath(design.thumbnailPath);
  },
};
