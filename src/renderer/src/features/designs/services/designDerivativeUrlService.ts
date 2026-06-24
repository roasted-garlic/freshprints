import { FirebaseError } from "firebase/app";
import { getDownloadURL, ref } from "firebase/storage";

import { storage } from "../../../config/firebase";
import type { Design } from "../types/design.types";
import { normalizeCatalogPath } from "../utils/designDerivativeUrlPaths";
import { DesignDerivativeUrlCache } from "./designDerivativeUrlCache";

const urlCache = new DesignDerivativeUrlCache();

function toFirebaseStorageRefPath(catalogPath: string): string {
  return catalogPath.replace(/^\//, "");
}

function logDerivativeUrlResolutionFailure(catalogPath: string, error: unknown): void {
  if (error instanceof FirebaseError && error.code === "storage/object-not-found") {
    console.warn(`Derivative Storage object not found for path: ${catalogPath}`);
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown Storage error.";
  console.warn(`Unable to resolve derivative URL for ${catalogPath}: ${message}`);
}

async function fetchDownloadUrlForCatalogPath(catalogPath: string): Promise<string | null> {
  try {
    const storageRef = ref(storage, toFirebaseStorageRefPath(catalogPath));
    return await getDownloadURL(storageRef);
  } catch (error) {
    logDerivativeUrlResolutionFailure(catalogPath, error);
    return null;
  }
}

/**
 * Resolves canonical derivative catalog paths to Firebase Storage download URLs.
 * URLs are cached in memory per path for the session.
 */
export const designDerivativeUrlService = {
  getDownloadUrlForCatalogPath(catalogPath: string | undefined): Promise<string | null> {
    const normalizedPath = normalizeCatalogPath(catalogPath);

    if (!normalizedPath) {
      return Promise.resolve(null);
    }

    return urlCache.resolve(normalizedPath, () => fetchDownloadUrlForCatalogPath(normalizedPath));
  },

  getThumbnailUrl(design: Pick<Design, "thumbnailPath">): Promise<string | null> {
    return this.getDownloadUrlForCatalogPath(design.thumbnailPath);
  },

  getPreviewUrl(design: Pick<Design, "previewPath">): Promise<string | null> {
    return this.getDownloadUrlForCatalogPath(design.previewPath);
  },

  /** Dev/test helper — clears cached URLs for one path or the entire cache. */
  clearCache(catalogPath?: string): void {
    urlCache.clear(catalogPath);
  },

  /** @internal Exposed for unit tests */
  _getCacheForTests(): DesignDerivativeUrlCache {
    return urlCache;
  },
};
