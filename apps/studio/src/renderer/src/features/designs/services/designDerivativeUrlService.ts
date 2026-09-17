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
 * URLs are cached in memory per path (+ optional content version) for the session.
 */
export const designDerivativeUrlService = {
  getDownloadUrlForCatalogPath(
    catalogPath: string | undefined,
    contentVersion?: number | string | null,
  ): Promise<string | null> {
    const normalizedPath = normalizeCatalogPath(catalogPath);

    if (!normalizedPath) {
      return Promise.resolve(null);
    }

    const versionSuffix =
      contentVersion === null || contentVersion === undefined || contentVersion === ""
        ? ""
        : `@${contentVersion}`;
    const cacheKey = `${normalizedPath}${versionSuffix}`;

    return urlCache.resolve(cacheKey, () => fetchDownloadUrlForCatalogPath(normalizedPath));
  },

  getThumbnailUrl(
    design: Pick<Design, "thumbnailPath"> & { updatedAtMs?: number },
  ): Promise<string | null> {
    return this.getDownloadUrlForCatalogPath(design.thumbnailPath, design.updatedAtMs);
  },

  getPreviewUrl(
    design: Pick<Design, "previewPath"> & { updatedAtMs?: number },
  ): Promise<string | null> {
    return this.getDownloadUrlForCatalogPath(design.previewPath, design.updatedAtMs);
  },

  /** Dev/test helper — clears cached URLs for one path (all versions) or the entire cache. */
  clearCache(catalogPath?: string): void {
    if (!catalogPath) {
      urlCache.clear();
      return;
    }
    const normalizedPath = normalizeCatalogPath(catalogPath);
    if (!normalizedPath) {
      return;
    }
    urlCache.clearPrefix(normalizedPath);
  },

  /** @internal Exposed for unit tests */
  _getCacheForTests(): DesignDerivativeUrlCache {
    return urlCache;
  },
};
