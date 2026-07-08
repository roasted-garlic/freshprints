'use client';

import { useEffect, useState } from 'react';

import { catalogService } from '../services/catalogService';
import type { CatalogCategory } from '../types/catalog.types';

export function useCatalogCategories() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadCategories() {
      setIsLoading(true);
      setError(null);

      try {
        const nextCategories = await catalogService.listActiveCategories();

        if (!isCancelled) {
          setCategories(nextCategories);
        }
      } catch (loadError) {
        if (!isCancelled) {
          const message =
            loadError instanceof Error ? loadError.message : 'Unable to load categories.';
          setError(message);
          setCategories([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      isCancelled = true;
    };
  }, []);

  return { categories, isLoading, error };
}
