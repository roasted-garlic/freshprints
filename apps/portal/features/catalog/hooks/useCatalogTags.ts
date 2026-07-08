'use client';

import { useEffect, useState } from 'react';

import { catalogService } from '../services/catalogService';
import type { CatalogTagOption } from '../types/catalog.types';

export function useCatalogTags() {
  const [tags, setTags] = useState<CatalogTagOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadTags() {
      setIsLoading(true);
      setError(null);

      try {
        const nextTags = await catalogService.listApprovedTags();

        if (!isCancelled) {
          setTags(nextTags);
        }
      } catch (loadError) {
        if (!isCancelled) {
          const message = loadError instanceof Error ? loadError.message : 'Unable to load tags.';
          setError(message);
          setTags([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTags();

    return () => {
      isCancelled = true;
    };
  }, []);

  return { tags, isLoading, error };
}
