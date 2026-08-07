'use client';

import { useCallback, useEffect, useState } from 'react';

import { catalogService } from '../services/catalogService';
import type { CatalogCategory } from '../types/catalog.types';

/**
 * Loads Portal customer-visible catalog categories (`listActiveCategories`).
 *
 * Contract (Amendment 3): active categories with `countReadyDesigns({ categoryId }) > 0`.
 *
 * Freshness (Amendment 2, retained): every load hits Firestore (no module TTL).
 * Window focus / tab visibility reloads so Studio archive/restore and ready-count
 * changes become visible without clearing browser storage. Full page refresh also
 * reloads. Concurrent loads share one in-flight Promise. No polling or listeners.
 */
export function useCatalogCategories() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextCategories = await catalogService.listActiveCategories();
      setCategories(nextCategories);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Unable to load categories.';
      setError(message);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitial() {
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

    void loadInitial();

    const refreshFromFocus = () => {
      if (isCancelled) {
        return;
      }
      void loadCategories();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromFocus();
      }
    };

    window.addEventListener('focus', refreshFromFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', refreshFromFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadCategories]);

  return { categories, isLoading, error };
}
