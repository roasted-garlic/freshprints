'use client';

import { useEffect, useState } from 'react';

import type { CatalogTagOption } from '../types/catalog.types';

export function useCatalogTags() {
  const [tags, setTags] = useState<CatalogTagOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // Compatibility no-op: Portal no longer reads legacy tag taxonomy at runtime.
    if (!isCancelled) {
      setTags([]);
      setError(null);
      setIsLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  return { tags, isLoading, error };
}
