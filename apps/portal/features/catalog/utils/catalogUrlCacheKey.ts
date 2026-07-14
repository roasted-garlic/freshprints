export function normalizeCatalogStoragePath(catalogPath: string | undefined): string | null {
  if (!catalogPath?.trim()) {
    return null;
  }

  return catalogPath.trim();
}

export function normalizeCatalogContentVersion(contentVersion: number | undefined): number {
  if (typeof contentVersion !== 'number' || !Number.isFinite(contentVersion) || contentVersion < 0) {
    return 0;
  }

  return Math.floor(contentVersion);
}

export function buildCatalogUrlCacheKey(
  catalogPath: string,
  contentVersion: number | undefined,
): string {
  return `${catalogPath}@${normalizeCatalogContentVersion(contentVersion)}`;
}

export function catalogPathFromUrlCacheKey(cacheKey: string): string {
  const separatorIndex = cacheKey.lastIndexOf('@');
  if (separatorIndex <= 0) {
    return cacheKey;
  }

  return cacheKey.slice(0, separatorIndex);
}

export interface CatalogStoragePathRef {
  catalogPath?: string;
  contentVersion?: number;
}
