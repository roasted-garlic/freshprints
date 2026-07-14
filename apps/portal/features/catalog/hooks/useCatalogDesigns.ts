'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CATALOG_NEW_THIS_WEEK_DAYS,
  type CatalogDiscoveryMode,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import { catalogService, DEFAULT_CATALOG_PAGE_SIZE } from '../services/catalogService';
import type {
  CatalogCategory,
  CatalogDesign,
  CatalogDesignListQuery,
  CatalogDesignSortField,
} from '../types/catalog.types';
import {
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  filterCatalogDesignsByTags,
  getPrimaryCatalogQueryTag,
} from '../utils/catalogSearch';

export interface UseCatalogDesignsQuery {
  categoryId?: string;
  selectedTags: string[];
  discoveryMode?: CatalogDiscoveryMode | null;
  pageSize?: number;
  searchQuery?: string;
}

function sortFieldForDiscovery(mode: CatalogDiscoveryMode | null | undefined): CatalogDesignSortField {
  switch (mode) {
    case 'new':
      return 'createdAt';
    case 'popular':
      return 'requestCount';
    case 'mostLiked':
      return 'favoriteCount';
    case 'recent':
      return 'lastRequestedAt';
    default:
      return 'updatedAt';
  }
}

function buildServerListQuery(options: UseCatalogDesignsQuery): CatalogDesignListQuery {
  const discoveryMode = options.discoveryMode ?? null;
  const sortField = sortFieldForDiscovery(discoveryMode);
  const primaryTag = getPrimaryCatalogQueryTag(options.selectedTags);

  return {
    categoryId: options.categoryId?.trim() || undefined,
    createdAfterMs:
      discoveryMode === 'new'
        ? Date.now() - CATALOG_NEW_THIS_WEEK_DAYS * 24 * 60 * 60 * 1000
        : undefined,
    sortField,
    tag: primaryTag,
  };
}

function serializeServerListQuery(listQuery: CatalogDesignListQuery): string {
  return JSON.stringify({
    categoryId: listQuery.categoryId ?? null,
    createdAfterMs: listQuery.createdAfterMs ?? null,
    sortField: listQuery.sortField ?? 'updatedAt',
    tag: listQuery.tag ?? null,
  });
}

function toFriendlyCatalogError(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : 'Unable to load the catalog. Please try again.';

  if (/index/i.test(rawMessage)) {
    return 'Catalog indexes are still building in Firebase. Browse may be limited until they finish — try again in a few minutes.';
  }

  return rawMessage;
}

export function useCatalogDesigns(options: UseCatalogDesignsQuery): {
  /** Full hydrated set matching server filters (before client search windowing). */
  catalogDesigns: CatalogDesign[];
  designs: CatalogDesign[];
  error: string | null;
  hasMore: boolean;
  isHydrating: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMoreDesigns: () => void;
  matchingCount: number | null;
} {
  const pageSize = options.pageSize ?? DEFAULT_CATALOG_PAGE_SIZE;
  const [allDesigns, setAllDesigns] = useState<CatalogDesign[]>([]);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);

  const selectedTagsKey = useMemo(
    () => [...options.selectedTags].sort((left, right) => left.localeCompare(right)).join('\0'),
    [options.selectedTags],
  );

  const serverListQuery = useMemo(
    () =>
      buildServerListQuery({
        categoryId: options.categoryId,
        discoveryMode: options.discoveryMode,
        selectedTags: options.selectedTags,
      }),
    [options.categoryId, options.discoveryMode, options.selectedTags, selectedTagsKey],
  );
  const serverListQueryKey = useMemo(
    () => serializeServerListQuery(serverListQuery),
    [serverListQuery],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadCatalog() {
      setIsLoading(true);
      setIsHydrating(true);
      setError(null);
      setAllDesigns([]);
      setVisibleCount(pageSize);
      setServerTotalCount(null);

      try {
        const countPromise = catalogService
          .countReadyDesigns(serverListQuery)
          .then((count) => {
            if (!isCancelled) {
              setServerTotalCount(count);
            }
          })
          .catch(() => {
            // Count is best-effort; matchingCount falls back after hydrate.
          });

        const firstPage = await catalogService.listReadyDesignsPageWithSortFallback({
          ...serverListQuery,
          limitCount: pageSize,
        });

        if (isCancelled) {
          return;
        }

        setAllDesigns(firstPage.designs);
        setIsLoading(false);

        void countPromise;

        if (!firstPage.hasMore || !firstPage.nextCursor) {
          setIsHydrating(false);
          setServerTotalCount((current) => current ?? firstPage.designs.length);
          return;
        }

        const remaining = await catalogService.listAllMatchingReadyDesigns(
          {
            ...serverListQuery,
            cursor: firstPage.nextCursor,
          },
          {
            pageSize,
            onPage: (pageDesigns) => {
              if (isCancelled) {
                return;
              }

              setAllDesigns((current) => {
                const seen = new Set(current.map((design) => design.id));
                const next = [...current];

                for (const design of pageDesigns) {
                  if (!seen.has(design.id)) {
                    seen.add(design.id);
                    next.push(design);
                  }
                }

                return next;
              });
            },
          },
        );

        if (isCancelled) {
          return;
        }

        setAllDesigns((current) => {
          const byId = new Map(current.map((design) => [design.id, design]));

          for (const design of [...firstPage.designs, ...remaining]) {
            byId.set(design.id, design);
          }

          return [...byId.values()];
        });
        setIsHydrating(false);
        setServerTotalCount((current) => current ?? firstPage.designs.length + remaining.length);
      } catch (loadError) {
        if (!isCancelled) {
          setError(toFriendlyCatalogError(loadError));
          setAllDesigns([]);
          setIsLoading(false);
          setIsHydrating(false);
          setServerTotalCount(null);
        }
      }
    }

    void loadCatalog();

    return () => {
      isCancelled = true;
    };
  }, [pageSize, serverListQuery, serverListQueryKey]);

  const filteredDesigns = useFilteredCatalogDesigns({
    designs: allDesigns,
    search: options.searchQuery ?? '',
    categoryId: options.categoryId,
    selectedTags: options.selectedTags,
  });

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [
    options.searchQuery,
    pageSize,
    selectedTagsKey,
    serverListQueryKey,
  ]);

  const visibleDesigns = useMemo(
    () => filteredDesigns.slice(0, visibleCount),
    [filteredDesigns, visibleCount],
  );

  const hasMore = visibleCount < filteredDesigns.length;
  const needsFullCatalogForCount = Boolean(
    (options.searchQuery ?? '').trim() || options.selectedTags.length > 1,
  );
  const matchingCount =
    isHydrating && needsFullCatalogForCount
      ? null
      : isHydrating && !needsFullCatalogForCount
        ? serverTotalCount
        : filteredDesigns.length;

  const loadMoreDesigns = useCallback(() => {
    if (!hasMore) {
      return;
    }

    setVisibleCount((current) => current + pageSize);
  }, [hasMore, pageSize]);

  return {
    catalogDesigns: allDesigns,
    designs: visibleDesigns,
    error,
    hasMore,
    isHydrating,
    isLoading,
    isLoadingMore: false,
    loadMoreDesigns,
    matchingCount,
  };
}

export function useCatalogHomeDesigns(): {
  designs: CatalogDesign[];
  error: string | null;
  isLoading: boolean;
} {
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadHomeDesigns() {
      setIsLoading(true);
      setError(null);

      try {
        const nextDesigns = await catalogService.listHomeDiscoveryPool();

        if (!isCancelled) {
          setDesigns(nextDesigns);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(toFriendlyCatalogError(loadError));
          setDesigns([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHomeDesigns();

    return () => {
      isCancelled = true;
    };
  }, []);

  return { designs, error, isLoading };
}

export function useFilteredCatalogDesigns(options: {
  designs: CatalogDesign[];
  search: string;
  categoryId?: string;
  selectedTags: string[];
}): CatalogDesign[] {
  const { designs, search, categoryId, selectedTags } = options;

  return useMemo(
    () =>
      filterCatalogDesignsByTags(
        filterCatalogDesignsByCategory(filterCatalogDesignsBySearch(designs, search), categoryId),
        selectedTags,
      ),
    [categoryId, designs, search, selectedTags],
  );
}

export function useCatalogCategoryOptions(categories: CatalogCategory[]): Array<{ value: string; label: string }> {
  return [
    { value: '', label: 'All categories' },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];
}
