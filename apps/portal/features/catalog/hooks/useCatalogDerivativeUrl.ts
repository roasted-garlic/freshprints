'use client';

import { useEffect, useState } from 'react';

import { catalogStorageService } from '../services/catalogStorageService';

export function useCatalogDerivativeUrl(catalogPath: string | undefined) {
  const cachedUrl = catalogStorageService.getCachedUrlForCatalogPath(catalogPath);
  const [url, setUrl] = useState<string | null>(cachedUrl ?? null);
  const [isLoading, setIsLoading] = useState(
    Boolean(catalogPath?.trim()) && cachedUrl === undefined,
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadUrl() {
      if (!catalogPath?.trim()) {
        setUrl(null);
        setIsLoading(false);
        return;
      }

      const immediateUrl = catalogStorageService.getCachedUrlForCatalogPath(catalogPath);

      if (immediateUrl !== undefined) {
        setUrl(immediateUrl);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const nextUrl = await catalogStorageService.getDownloadUrlForCatalogPath(catalogPath);

      if (!isCancelled) {
        setUrl(nextUrl);
        setIsLoading(false);
      }
    }

    void loadUrl();

    return () => {
      isCancelled = true;
    };
  }, [catalogPath]);

  return { url, isLoading };
}
