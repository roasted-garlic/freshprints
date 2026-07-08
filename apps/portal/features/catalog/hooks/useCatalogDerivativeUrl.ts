'use client';

import { useEffect, useState } from 'react';

import { catalogStorageService } from '../services/catalogStorageService';

export function useCatalogDerivativeUrl(catalogPath: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(catalogPath?.trim()));

  useEffect(() => {
    let isCancelled = false;

    async function loadUrl() {
      if (!catalogPath?.trim()) {
        setUrl(null);
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
