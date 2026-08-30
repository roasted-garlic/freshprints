'use client';

import { useEffect, useMemo, useState } from 'react';

import { isPortalAlgoliaCatalogConfigured } from '../services/portalAlgoliaCatalogFlags';
import {
  buildNarrowedCatalogCategoryOptions,
  hasPortalAlgoliaCategoryFacetConstraints,
  portalAlgoliaCatalogSearchService,
  serializeSmartFilters,
  type PortalSmartFilters,
} from '../services/portalAlgoliaCatalogSearchService';
import type { CatalogCategory } from '../types/catalog.types';
import { useCatalogCategoryOptions } from './useCatalogDesigns';

export interface UseNarrowedCatalogCategoryOptionsArgs {
  categories: CatalogCategory[];
  searchQuery?: string;
  selectedCategoryId?: string;
  selectedTags?: string[];
  smartFilters?: PortalSmartFilters;
}

/**
 * Category select options: full catalog when unconstrained; Algolia `categoryId` facets
 * when search / tags / Smart Filters are active (selected category excluded from facet query).
 */
export function useNarrowedCatalogCategoryOptions(
  args: UseNarrowedCatalogCategoryOptionsArgs,
): Array<{ value: string; label: string }> {
  const fullOptions = useCatalogCategoryOptions(args.categories);
  const search = args.searchQuery?.trim() ?? '';
  const selectedTags = useMemo(() => args.selectedTags ?? [], [args.selectedTags]);
  const smartFilters = args.smartFilters;
  const selectedTagsKey = useMemo(
    () => [...selectedTags].sort((left, right) => left.localeCompare(right)).join('\0'),
    [selectedTags],
  );
  const smartFiltersKey = useMemo(() => serializeSmartFilters(smartFilters), [smartFilters]);
  const needsNarrowing = hasPortalAlgoliaCategoryFacetConstraints({
    search,
    selectedTags,
    smartFilters,
  });
  const algoliaReady = isPortalAlgoliaCatalogConfigured();

  const [facetIds, setFacetIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!needsNarrowing || !algoliaReady) {
      setFacetIds(null);
      return;
    }

    let cancelled = false;
    void portalAlgoliaCatalogSearchService
      .listNarrowedCategoryFacets({
        search,
        selectedTags,
        smartFilters,
      })
      .then((facets) => {
        if (!cancelled) {
          setFacetIds(facets.map((entry) => entry.id));
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fail open to full category list rather than an empty selector.
          setFacetIds(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [algoliaReady, needsNarrowing, search, selectedTagsKey, smartFiltersKey, selectedTags, smartFilters]);

  return useMemo(() => {
    if (!needsNarrowing || !algoliaReady || facetIds === null) {
      return fullOptions;
    }
    return buildNarrowedCatalogCategoryOptions({
      categories: args.categories,
      facetCategoryIds: facetIds,
      selectedCategoryId: args.selectedCategoryId,
    });
  }, [
    algoliaReady,
    args.categories,
    args.selectedCategoryId,
    facetIds,
    fullOptions,
    needsNarrowing,
  ]);
}
