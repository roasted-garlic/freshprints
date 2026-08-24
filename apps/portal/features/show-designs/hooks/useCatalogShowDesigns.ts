'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CatalogDesign } from '../../catalog/types/catalog.types';
import {
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  filterCatalogDesignsByTags,
} from '../../catalog/utils/catalogSearch';
import { loadCatalogShowDesigns } from '../services/portalShowDiscoveryContent';

export function useCatalogShowDesigns(options: {
  categoryId?: string;
  enabled?: boolean;
  searchQuery?: string;
  selectedTags: string[];
  showId?: string | null;
  showsThisWeek?: boolean;
}) {
  const enabled = options.enabled ?? true;
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);
  const [title, setTitle] = useState('Show designs');
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDesigns([]);
      setTitle('Show designs');
      setSubtitle(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await loadCatalogShowDesigns({
          showId: options.showId,
          showsThisWeek: options.showsThisWeek,
        });
        if (!cancelled) {
          setDesigns(result.designs);
          setTitle(result.title);
          setSubtitle(result.subtitle);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load show designs.');
          setDesigns([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, options.showId, options.showsThisWeek]);

  const filteredDesigns = useMemo(() => {
    let next = designs;
    next = filterCatalogDesignsBySearch(next, options.searchQuery ?? '');
    next = filterCatalogDesignsByCategory(next, options.categoryId);
    next = filterCatalogDesignsByTags(next, options.selectedTags);
    return next;
  }, [designs, options.categoryId, options.searchQuery, options.selectedTags]);

  return {
    catalogDesigns: filteredDesigns,
    designs: filteredDesigns,
    displayedDesigns: filteredDesigns,
    error,
    hasMore: false,
    isCountUnavailable: false,
    isHydrating: false,
    isLoading,
    isLoadingMore: false,
    loadMoreDesigns: () => undefined,
    matchingCount: filteredDesigns.length,
    subtitle,
    title,
  };
}
