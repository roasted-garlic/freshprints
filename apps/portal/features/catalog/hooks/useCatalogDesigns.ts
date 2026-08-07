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
import { isPortalAlgoliaCatalogConfigured } from '../services/portalAlgoliaCatalogFlags';
import { portalAlgoliaCatalogSearchService } from '../services/portalAlgoliaCatalogSearchService';
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

/** Exported for Case D New This Week query tests. */
export function sortFieldForDiscovery(mode: CatalogDiscoveryMode | null | undefined): CatalogDesignSortField {
  switch (mode) {
    case 'new':
      // Newly ready for customers — not original import time.
      return 'readyAt';
    case 'popular':
      return 'requestCount';
    case 'mostLiked':
      return 'favoriteCount';
    case 'recent':
      return 'lastAddedToShowAt';
    default:
      // Browse-all / filters: most recently approved to ready first.
      return 'readyAt';
  }
}

/** Exported for Case D New This Week query tests. */
export function buildServerListQuery(options: UseCatalogDesignsQuery): CatalogDesignListQuery {
  const discoveryMode = options.discoveryMode ?? null;
  const sortField = sortFieldForDiscovery(discoveryMode);
  const primaryTag = getPrimaryCatalogQueryTag(options.selectedTags);

  return {
    categoryId: options.categoryId?.trim() || undefined,
    readyAfterMs:
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
    readyAfterMs: listQuery.readyAfterMs ?? null,
    sortField: listQuery.sortField ?? 'readyAt',
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
 * bounded Firestore without requiring generated assets or Algolia.
 *
 * Search and multi-tag use Stage 1b managed search (Algolia) when configured.
 */
export function allowsBoundedCatalogFirestoreFallback(options: UseCatalogDesignsQuery): boolean {
  const hasSearch = Boolean(options.searchQuery?.trim());
  const isMultiTag = options.selectedTags.length > 1;
  return !hasSearch && !isMultiTag;
}

function requiresManagedSearchPath(options: UseCatalogDesignsQuery): boolean {
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
  const [isManagedSearchQuery, setIsManagedSearchQuery] = useState(false);
  /** Algolia/generated hit offset — advances by provider page size, not hydrated card count. */
  const [managedSearchNextOffset, setManagedSearchNextOffset] = useState(0);
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
  const useManagedSearch = requiresManagedSearchPath(options);
  const useAlgoliaSearch = useManagedSearch && isPortalAlgoliaCatalogConfigured();

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
      setIsManagedSearchQuery(false);
      setManagedSearchNextOffset(0);

      try {
        if (useManagedSearch) {
          if (useAlgoliaSearch) {
            try {
              const algoliaPage = await portalAlgoliaCatalogSearchService.listMatchingDesigns(
                options.searchQuery ?? '',
                selectedTagsForAssets,
                { categoryId: options.categoryId, limit: pageSize, offset: 0 },
              );
              if (isCancelled || generation !== hydrateGenerationRef.current) return;
              const nextOffset = algoliaPage.hitCount;
              setAllDesigns(algoliaPage.designs);
              setServerTotalCount(algoliaPage.total ?? algoliaPage.designs.length);
              setManagedSearchNextOffset(nextOffset);
              setIsFullyHydrated(nextOffset >= algoliaPage.total || algoliaPage.hitCount === 0);
              setIsManagedSearchQuery(true);
              setIsLoading(false);
              return;
            } catch {
              if (!isCancelled && generation === hydrateGenerationRef.current) {
                setError('Catalog search is temporarily unavailable. Please try again in a moment.');
                setAllDesigns([]);
                setIsLoading(false);
                setServerTotalCount(null);
              }
              return;
            }
          }

          // Transition: generated path until Algolia is configured (Stage 4 retires publisher).
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
              { categoryId: options.categoryId, limit: pageSize, offset: 0 },
            );
            if (isCancelled || generation !== hydrateGenerationRef.current) return;
            traceGeneratedAssetOutcome(
              'success',
              'portal-catalog-query@generated-search-phase1a',
              { app: 'portal', triggerReason: 'route' },
            );
            const nextOffset = generatedPage.designs.length;
            setAllDesigns(generatedPage.designs);
            setServerTotalCount(generatedPage.total ?? generatedPage.designs.length);
            setManagedSearchNextOffset(nextOffset);
            setIsFullyHydrated(
              nextOffset >= (generatedPage.total ?? nextOffset) || generatedPage.designs.length === 0,
            );
            setIsManagedSearchQuery(true);
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
    useAlgoliaSearch,
    useManagedSearch,
    useOrdinaryFirestore,
  ]);

  // Managed search (Algolia/generated) already applied q/tags/category — do not re-filter
  // client-side (would discard Algolia typo-tolerant hits that fail substring match).
  const filteredDesigns = useFilteredCatalogDesigns({
    designs: allDesigns,
    search: isManagedSearchQuery ? '' : (options.searchQuery ?? ''),
    categoryId: isManagedSearchQuery ? undefined : options.categoryId,
    selectedTags: isManagedSearchQuery ? [] : options.selectedTags,
  });

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [options.searchQuery, pageSize, selectedTagsKey, serverListQueryKey]);

  const visibleDesigns = useMemo(
    () => filteredDesigns.slice(0, visibleCount),
    [filteredDesigns, visibleCount],
  );

  const clientWindowHasMore = visibleCount < filteredDesigns.length;
  const managedSearchHasMore =
    isManagedSearchQuery &&
    serverTotalCount !== null &&
    managedSearchNextOffset < serverTotalCount;
  const hasMore = isManagedSearchQuery
    ? managedSearchHasMore || clientWindowHasMore
    : isFullyHydrated
      ? clientWindowHasMore
      : serverHasMore;
  const matchingCount =
    isHydrating && needsFullHydrate
      ? null
      : isManagedSearchQuery
        ? (serverTotalCount ?? filteredDesigns.length)
        : isFullyHydrated
          ? filteredDesigns.length
        : (serverTotalCount ?? filteredDesigns.length);

  const loadMoreDesigns = useCallback(() => {
    if (isManagedSearchQuery) {
      if (managedSearchHasMore && !isLoadingMore) {
        void (async () => {
          setIsLoadingMore(true);
          try {
            const requestOffset = managedSearchNextOffset;
            if (useAlgoliaSearch) {
              const page = await portalAlgoliaCatalogSearchService.listMatchingDesigns(
                options.searchQuery ?? '',
                selectedTagsForAssets,
                {
                  categoryId: options.categoryId,
                  limit: pageSize,
                  offset: requestOffset,
                },
              );
              const nextOffset = requestOffset + page.hitCount;
              setAllDesigns((current) => [...current, ...page.designs]);
              setServerTotalCount(page.total);
              setManagedSearchNextOffset(nextOffset);
              setVisibleCount((current) => current + pageSize);
              setIsFullyHydrated(nextOffset >= page.total || page.hitCount === 0);
            } else {
              const page = await portalCatalogAssetService.listMatchingDesigns(
                options.searchQuery ?? '',
                selectedTagsForAssets,
                {
                  categoryId: options.categoryId,
                  limit: pageSize,
                  offset: requestOffset,
                },
              );
              const nextOffset = requestOffset + page.designs.length;
              setAllDesigns((current) => [...current, ...page.designs]);
              setServerTotalCount(page.total);
              setManagedSearchNextOffset(nextOffset);
              setVisibleCount((current) => current + pageSize);
              setIsFullyHydrated(nextOffset >= page.total || page.designs.length === 0);
            }
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
    clientWindowHasMore,
    managedSearchHasMore,
    managedSearchNextOffset,
    isFullyHydrated,
    isManagedSearchQuery,
    isLoadingMore,
    nextCursor,
    options.categoryId,
    options.searchQuery,
    pageSize,
    selectedTagsForAssets,
    serverHasMore,
    serverListQuery,
    useAlgoliaSearch,
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
