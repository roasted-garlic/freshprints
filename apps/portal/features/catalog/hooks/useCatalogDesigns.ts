'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CATALOG_NEW_THIS_WEEK_DAYS,
  type CatalogDiscoveryMode,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';
import { traceFirestoreRead } from '@fresh-prints/shared/utils/firestoreUsageTrace';

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
import { catalogNeedsFullClientHydrate } from '../utils/catalogNeedsFullClientHydrate';

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
      return 'lastAddedToShowAt';
    default:
      // Browse-all / filters: Studio-newest first. Do not use updatedAt —
      // request/favorite counters bump updatedAt and would reshuffle the grid.
      return 'createdAt';
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
    sortField: listQuery.sortField ?? 'createdAt',
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
  /** Designs loaded for the current server filters (may be one page or fully hydrated). */
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<CatalogDesignListQuery['cursor']>(undefined);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [isFullyHydrated, setIsFullyHydrated] = useState(false);
  const hydrateGenerationRef = useRef(0);
  const hydrateInFlightRef = useRef(false);

  const selectedTagsKey = useMemo(
    () => [...options.selectedTags].sort((left, right) => left.localeCompare(right)).join('\0'),
    [options.selectedTags],
  );

  const needsFullHydrate = catalogNeedsFullClientHydrate({
    searchQuery: options.searchQuery,
    selectedTags: options.selectedTags,
  });

  const serverListQuery = useMemo(
    () =>
      buildServerListQuery({
        categoryId: options.categoryId,
        discoveryMode: options.discoveryMode,
        selectedTags: options.selectedTags,
      }),
    [options.categoryId, options.discoveryMode, options.selectedTags],
  );
  const serverListQueryKey = useMemo(
    () => serializeServerListQuery(serverListQuery),
    [serverListQuery],
  );

  useEffect(() => {
    let isCancelled = false;
    const generation = ++hydrateGenerationRef.current;

    async function loadCatalog() {
      setIsLoading(true);
      setIsHydrating(false);
      setIsLoadingMore(false);
      setError(null);
      setAllDesigns([]);
      setVisibleCount(pageSize);
      setServerTotalCount(null);
      setNextCursor(undefined);
      setServerHasMore(false);
      setIsFullyHydrated(false);
      hydrateInFlightRef.current = false;

      try {
        const countPromise = catalogService
          .countReadyDesigns(serverListQuery)
          .then((count) => {
            if (!isCancelled && generation === hydrateGenerationRef.current) {
              setServerTotalCount(count);
            }
          })
          .catch(() => {
            // Count is best-effort.
          });

        traceFirestoreRead('getDocs', `designs:catalog:firstPage:${serverListQueryKey}`);
        const firstPage = await catalogService.listReadyDesignsPageWithSortFallback({
          ...serverListQuery,
          limitCount: pageSize,
        });

        if (isCancelled || generation !== hydrateGenerationRef.current) {
          return;
        }

        setAllDesigns(firstPage.designs);
        setIsLoading(false);
        setNextCursor(firstPage.nextCursor);
        setServerHasMore(Boolean(firstPage.hasMore && firstPage.nextCursor));
        void countPromise;

        if (!firstPage.hasMore || !firstPage.nextCursor) {
          setIsFullyHydrated(true);
          setServerTotalCount((current) => current ?? firstPage.designs.length);
          return;
        }

        // Remaining pages load via loadMore (browse) or deferred hydrate (search / multi-tag).
      } catch (loadError) {
        if (!isCancelled && generation === hydrateGenerationRef.current) {
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
    // Server filter changes reset the page. Search / multi-tag hydrate is deferred below.
  }, [pageSize, serverListQuery, serverListQueryKey]);

  useEffect(() => {
    if (
      !needsFullHydrate ||
      isFullyHydrated ||
      isLoading ||
      !nextCursor ||
      hydrateInFlightRef.current
    ) {
      return;
    }

    let isCancelled = false;
    const generation = hydrateGenerationRef.current;
    hydrateInFlightRef.current = true;

    async function hydrateRemaining() {
      setIsHydrating(true);
      try {
        traceFirestoreRead('getDocs', `designs:catalog:hydrate-deferred:${serverListQueryKey}`);
        const remaining = await catalogService.listAllMatchingReadyDesigns(
          {
            ...serverListQuery,
            cursor: nextCursor,
          },
          {
            pageSize,
            onPage: (pageDesigns) => {
              if (isCancelled || generation !== hydrateGenerationRef.current) {
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

        if (isCancelled || generation !== hydrateGenerationRef.current) {
          return;
        }

        setAllDesigns((current) => {
          const byId = new Map(current.map((design) => [design.id, design]));
          for (const design of remaining) {
            byId.set(design.id, design);
          }
          return [...byId.values()];
        });
        setNextCursor(undefined);
        setServerHasMore(false);
        setIsFullyHydrated(true);
      } catch (loadError) {
        if (!isCancelled && generation === hydrateGenerationRef.current) {
          setError(toFriendlyCatalogError(loadError));
        }
      } finally {
        hydrateInFlightRef.current = false;
        if (!isCancelled && generation === hydrateGenerationRef.current) {
          setIsHydrating(false);
        }
      }
    }

    void hydrateRemaining();

    return () => {
      isCancelled = true;
    };
  }, [
    isFullyHydrated,
    isLoading,
    needsFullHydrate,
    nextCursor,
    pageSize,
    serverListQuery,
    serverListQueryKey,
  ]);

  const filteredDesigns = useFilteredCatalogDesigns({
    designs: allDesigns,
    search: options.searchQuery ?? '',
    categoryId: options.categoryId,
    selectedTags: options.selectedTags,
  });

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [options.searchQuery, pageSize, selectedTagsKey, serverListQueryKey]);

  const visibleDesigns = useMemo(
    () => filteredDesigns.slice(0, visibleCount),
    [filteredDesigns, visibleCount],
  );

  const clientWindowHasMore = visibleCount < filteredDesigns.length;
  const hasMore = needsFullHydrate || isFullyHydrated ? clientWindowHasMore : serverHasMore;
  const matchingCount =
    isHydrating && needsFullHydrate
      ? null
      : needsFullHydrate || isFullyHydrated
        ? filteredDesigns.length
        : (serverTotalCount ?? filteredDesigns.length);

  const loadMoreDesigns = useCallback(() => {
    if (needsFullHydrate || isFullyHydrated) {
      if (!clientWindowHasMore) {
        return;
      }
      setVisibleCount((current) => current + pageSize);
      return;
    }

    if (!serverHasMore || !nextCursor || isLoadingMore) {
      return;
    }

    void (async () => {
      setIsLoadingMore(true);
      try {
        traceFirestoreRead('getDocs', `designs:catalog:nextPage:${serverListQueryKey}`);
        const page = await catalogService.listReadyDesignsPageWithSortFallback({
          ...serverListQuery,
          cursor: nextCursor,
          limitCount: pageSize,
        });
        setAllDesigns((current) => {
          const seen = new Set(current.map((design) => design.id));
          const next = [...current];
          for (const design of page.designs) {
            if (!seen.has(design.id)) {
              seen.add(design.id);
              next.push(design);
            }
          }
          return next;
        });
        setNextCursor(page.nextCursor);
        setServerHasMore(Boolean(page.hasMore && page.nextCursor));
        if (!page.hasMore) {
          setIsFullyHydrated(true);
        }
        setVisibleCount((current) => current + pageSize);
      } catch (loadError) {
        setError(toFriendlyCatalogError(loadError));
      } finally {
        setIsLoadingMore(false);
      }
    })();
  }, [
    clientWindowHasMore,
    isFullyHydrated,
    isLoadingMore,
    needsFullHydrate,
    nextCursor,
    pageSize,
    serverHasMore,
    serverListQuery,
    serverListQueryKey,
  ]);

  return {
    catalogDesigns: allDesigns,
    designs: visibleDesigns,
    error,
    hasMore,
    isHydrating,
    isLoading,
    isLoadingMore,
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
        traceFirestoreRead('getDocs', 'designs:catalog:homeDiscoveryPool');
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
