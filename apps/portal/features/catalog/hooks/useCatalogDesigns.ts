'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CATALOG_NEW_THIS_WEEK_DAYS,
  type CatalogDiscoveryMode,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';
import {
  traceGeneratedAssetOutcome,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';
import { catalogService, DEFAULT_CATALOG_PAGE_SIZE } from '../services/catalogService';
import { portalCatalogAssetService } from '../services/portalCatalogAssetService';
import { generatedPortalCatalogEnabled } from '../services/catalogSnapshotFlags';
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

/** First-viewport thumbnails may load eagerly; below-fold stay lazy. */
export const CATALOG_FIRST_VIEWPORT_EAGER_COUNT = 8;

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

/**
 * Phase 1A ordinary browse gate: unfiltered, category, single-tag, and discovery sorts use
 * bounded Firestore without requiring generated assets.
 *
 * Search and multi-tag stay on generated paths until Phase 1B managed search.
 */
export function allowsBoundedCatalogFirestoreFallback(options: UseCatalogDesignsQuery): boolean {
  const hasSearch = Boolean(options.searchQuery?.trim());
  const isMultiTag = options.selectedTags.length > 1;
  return !hasSearch && !isMultiTag;
}

function requiresGeneratedSearchPath(options: UseCatalogDesignsQuery): boolean {
  return !allowsBoundedCatalogFirestoreFallback(options);
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
  const isHydrating = false;
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<CatalogDesignListQuery['cursor']>(undefined);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [isFullyHydrated, setIsFullyHydrated] = useState(false);
  const [isGeneratedQuery, setIsGeneratedQuery] = useState(false);
  const hydrateGenerationRef = useRef(0);

  const selectedTagsKey = useMemo(
    () => [...options.selectedTags].sort((left, right) => left.localeCompare(right)).join('\0'),
    [options.selectedTags],
  );
  const selectedTagsForAssets = useMemo(
    () => (selectedTagsKey ? selectedTagsKey.split('\0') : []),
    [selectedTagsKey],
  );

  const needsFullHydrate = catalogNeedsFullClientHydrate({
    searchQuery: options.searchQuery,
    selectedTags: options.selectedTags,
  });
  const useOrdinaryFirestore = allowsBoundedCatalogFirestoreFallback(options);
  const useGeneratedSearch = requiresGeneratedSearchPath(options);

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
      setIsLoadingMore(false);
      setError(null);
      setAllDesigns([]);
      setVisibleCount(pageSize);
      setServerTotalCount(null);
      setNextCursor(undefined);
      setServerHasMore(false);
      setIsFullyHydrated(false);
      setIsGeneratedQuery(false);

      try {
        if (useGeneratedSearch) {
          if (!generatedPortalCatalogEnabled()) {
            if (!isCancelled && generation === hydrateGenerationRef.current) {
              setError('Catalog search is temporarily unavailable. Please try again in a moment.');
              setAllDesigns([]);
              setIsLoading(false);
              setServerTotalCount(null);
            }
            return;
          }

          try {
            const generatedPage = await portalCatalogAssetService.listMatchingDesigns(
              options.searchQuery ?? '',
              selectedTagsForAssets,
              { categoryId: options.categoryId, limit: pageSize },
            );
            if (isCancelled || generation !== hydrateGenerationRef.current) return;
            traceGeneratedAssetOutcome(
              'success',
              'portal-catalog-query@generated-search-phase1a',
              { app: 'portal', triggerReason: 'route' },
            );
            setAllDesigns(generatedPage.designs);
            setServerTotalCount(generatedPage.total ?? generatedPage.designs.length);
            setIsFullyHydrated(
              generatedPage.total === null || generatedPage.designs.length >= generatedPage.total,
            );
            setIsGeneratedQuery(true);
            setIsLoading(false);
            return;
          } catch {
            traceGeneratedAssetOutcome(
              'failure',
              'portal-catalog-query@generated-search-phase1a',
              { app: 'portal', triggerReason: 'route' },
            );
            if (!isCancelled && generation === hydrateGenerationRef.current) {
              setError('Catalog filters are temporarily unavailable. Please try again in a moment.');
              setAllDesigns([]);
              setIsLoading(false);
              setServerTotalCount(null);
            }
            return;
          }
        }

        // Phase 1A ordinary path: bounded Firestore (unfiltered / category / single-tag / discovery).
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
        setServerTotalCount(firstPage.designs.length);

        if (!firstPage.hasMore || !firstPage.nextCursor) {
          setIsFullyHydrated(true);
          setServerTotalCount((current) => current ?? firstPage.designs.length);
          return;
        }

        // Optional count for ordinary pages (bounded aggregation; not per-card).
        void catalogService.countReadyDesigns(serverListQuery).then((total) => {
          if (!isCancelled && generation === hydrateGenerationRef.current) {
            setServerTotalCount(total);
          }
        }).catch(() => {
          // Count is best-effort; page list already succeeded.
        });
      } catch (loadError) {
        if (!isCancelled && generation === hydrateGenerationRef.current) {
          setError(toFriendlyCatalogError(loadError));
          setAllDesigns([]);
          setIsLoading(false);
          setServerTotalCount(null);
        }
      }
    }

    void loadCatalog();

    return () => {
      isCancelled = true;
    };
  }, [
    needsFullHydrate,
    options.categoryId,
    options.discoveryMode,
    options.searchQuery,
    pageSize,
    selectedTagsForAssets,
    selectedTagsKey,
    serverListQuery,
    serverListQueryKey,
    useGeneratedSearch,
    useOrdinaryFirestore,
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
  const generatedHasMore =
    isGeneratedQuery && serverTotalCount !== null && allDesigns.length < serverTotalCount;
  const hasMore = isGeneratedQuery
    ? generatedHasMore || clientWindowHasMore
    : isFullyHydrated
      ? clientWindowHasMore
      : serverHasMore;
  const matchingCount =
    isHydrating && needsFullHydrate
      ? null
      : isGeneratedQuery
        ? (serverTotalCount ?? filteredDesigns.length)
        : isFullyHydrated
          ? filteredDesigns.length
        : (serverTotalCount ?? filteredDesigns.length);

  const loadMoreDesigns = useCallback(() => {
    if (isGeneratedQuery) {
      if (generatedHasMore && !isLoadingMore) {
        void (async () => {
          setIsLoadingMore(true);
          try {
            const page = await portalCatalogAssetService.listMatchingDesigns(
              options.searchQuery ?? '',
              selectedTagsForAssets,
              {
                categoryId: options.categoryId,
                limit: pageSize,
                offset: allDesigns.length,
              },
            );
            setAllDesigns((current) => [...current, ...page.designs]);
            setServerTotalCount(page.total);
            setVisibleCount((current) => current + pageSize);
            setIsFullyHydrated(allDesigns.length + page.designs.length >= page.total);
          } catch (loadError) {
            setError(toFriendlyCatalogError(loadError));
          } finally {
            setIsLoadingMore(false);
          }
        })();
        return;
      }
      if (clientWindowHasMore) setVisibleCount((current) => current + pageSize);
      return;
    }

    if (isFullyHydrated) {
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
    allDesigns.length,
    clientWindowHasMore,
    generatedHasMore,
    isFullyHydrated,
    isGeneratedQuery,
    isLoadingMore,
    nextCursor,
    options.categoryId,
    options.searchQuery,
    pageSize,
    selectedTagsForAssets,
    serverHasMore,
    serverListQuery,
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
