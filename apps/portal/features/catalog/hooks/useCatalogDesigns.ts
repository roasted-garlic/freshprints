'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CATALOG_DISCOVERY_RAIL_LIMIT,
  CATALOG_NEW_THIS_WEEK_DAYS,
  selectTopPopularCategoryRails,
  type CatalogDiscoveryMode,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';
import {
  catalogService,
  DEFAULT_CATALOG_PAGE_SIZE,
  getDesignSortValue,
} from '../services/catalogService';
import { isPortalAlgoliaCatalogConfigured } from '../services/portalAlgoliaCatalogFlags';
import {
  hasSelectedSmartFilters,
  portalAlgoliaCatalogSearchService,
  serializeSmartFilters,
  type PortalSmartFilters,
} from '../services/portalAlgoliaCatalogSearchService';
import type {
  CatalogCategory,
  CatalogDesign,
  CatalogDesignListCursor,
  CatalogDesignListQuery,
  CatalogDesignSortField,
} from '../types/catalog.types';
import {
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  filterCatalogDesignsByTags,
  getPrimaryCatalogQueryTag,
  resolveManagedSearchClientFilters,
} from '../utils/catalogSearch';
import { catalogNeedsFullClientHydrate } from '../utils/catalogNeedsFullClientHydrate';
import {
  fetchVisibleExactIdCatalogDesign,
  looksLikeDesignDocumentId,
  mergeExactIdCatalogDesign,
} from '../utils/portalCatalogExactIdSearch';

export interface UseCatalogDesignsQuery {
  categoryId?: string;
  selectedTags: string[];
  /** Slice 3 Smart Filters — any selection requires Algolia managed search. */
  smartFilters?: PortalSmartFilters;
  discoveryMode?: CatalogDiscoveryMode | null;
  pageSize?: number;
  searchQuery?: string;
}

/** Aggregate-count authority for ordinary Firestore library badges (TD-031). */
export type CatalogCountAuthorityState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'resolved'; total: number }
  | { status: 'failed' };

/**
 * Badge total for ordinary Firestore browse.
 * Never treat first-page loaded length as membership while paging may continue.
 */
export function resolveOrdinaryMatchingCount(args: {
  countAuthority: CatalogCountAuthorityState;
  loadedCount: number;
  isFullyHydrated: boolean;
}): number | null {
  if (args.countAuthority.status === 'resolved') {
    return args.countAuthority.total;
  }
  // All rows loaded — loaded count is the true membership even if aggregate failed.
  if (args.isFullyHydrated) {
    return args.loadedCount;
  }
  // pending / failed / idle while incomplete: do not advertise page size as the total.
  return null;
}

/** Whether the library badge should show “Counting designs…” instead of a number. */
export function shouldShowOrdinaryCountPending(args: {
  countAuthority: CatalogCountAuthorityState;
  isFullyHydrated: boolean;
}): boolean {
  // Only while the aggregate request is actually in flight — never after failure.
  return args.countAuthority.status === 'pending';
}

/** Failed aggregate with no authoritative total yet — distinct from pending / zero results. */
export function shouldShowOrdinaryCountUnavailable(args: {
  countAuthority: CatalogCountAuthorityState;
  matchingCount: number | null;
}): boolean {
  return args.countAuthority.status === 'failed' && args.matchingCount === null;
}

/**
 * If aggregate membership exceeds the first page but the list claimed end-of-results,
 * restore a cursor from the last loaded design so Load more can continue.
 */
export function reconcilePagingWithAggregateCount(args: {
  loadedDesigns: CatalogDesign[];
  listHasMore: boolean;
  listNextCursor: CatalogDesignListCursor | undefined;
  aggregateTotal: number;
  sortField: CatalogDesignSortField;
}): {
  hasMore: boolean;
  nextCursor: CatalogDesignListCursor | undefined;
  isFullyHydrated: boolean;
} {
  const loadedCount = args.loadedDesigns.length;
  const listIncomplete = Boolean(args.listHasMore && args.listNextCursor);

  if (args.aggregateTotal > loadedCount && !listIncomplete) {
    const lastDesign = args.loadedDesigns.at(-1);
    if (lastDesign) {
      return {
        hasMore: true,
        nextCursor: {
          designId: lastDesign.id,
          sortValue: getDesignSortValue(lastDesign, args.sortField),
        },
        isFullyHydrated: false,
      };
    }
  }

  if (!listIncomplete) {
    return {
      hasMore: false,
      nextCursor: undefined,
      isFullyHydrated: true,
    };
  }

  return {
    hasMore: true,
    nextCursor: args.listNextCursor,
    isFullyHydrated: false,
  };
}

/** One retry on transient aggregate failures; list/Load more stay independent. */
export async function fetchReadyDesignCountWithRetry(
  countFn: (query: CatalogDesignListQuery) => Promise<number>,
  query: CatalogDesignListQuery,
): Promise<{ ok: true; total: number } | { ok: false }> {
  try {
    return { ok: true, total: await countFn(query) };
  } catch {
    try {
      return { ok: true, total: await countFn(query) };
    } catch {
      return { ok: false };
    }
  }
}

export function appendCatalogDesignPageWithoutDuplicates(
  current: CatalogDesign[],
  pageDesigns: CatalogDesign[],
): CatalogDesign[] {
  const seen = new Set(current.map((design) => design.id));
  const next = [...current];
  for (const design of pageDesigns) {
    if (!seen.has(design.id)) {
      seen.add(design.id);
      next.push(design);
    }
  }
  return next;
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
    ...(discoveryMode === 'mostLiked' ? { minFavoriteCount: 1 } : {}),
    ...(discoveryMode === 'recent' ? { requireLastAddedToShowAt: true } : {}),
  };
}

function serializeServerListQuery(listQuery: CatalogDesignListQuery): string {
  return JSON.stringify({
    categoryId: listQuery.categoryId ?? null,
    createdAfterMs: listQuery.createdAfterMs ?? null,
    readyAfterMs: listQuery.readyAfterMs ?? null,
    sortField: listQuery.sortField ?? 'readyAt',
    tag: listQuery.tag ?? null,
    minFavoriteCount: listQuery.minFavoriteCount ?? null,
    requireLastAddedToShowAt: listQuery.requireLastAddedToShowAt === true,
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
 * Search, multi-tag, and Smart Filters use Stage 1b managed search (Algolia) when configured.
 */
export function allowsBoundedCatalogFirestoreFallback(options: UseCatalogDesignsQuery): boolean {
  const hasSearch = Boolean(options.searchQuery?.trim());
  const isMultiTag = options.selectedTags.length > 1;
  const hasSmart = hasSelectedSmartFilters(options.smartFilters);
  return !hasSearch && !isMultiTag && !hasSmart;
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
  /** Aggregate failed and no authoritative total — UI shows “Count unavailable”. */
  isCountUnavailable: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMoreDesigns: () => void;
  matchingCount: number | null;
} {
  const pageSize = options.pageSize ?? DEFAULT_CATALOG_PAGE_SIZE;
  const [allDesigns, setAllDesigns] = useState<CatalogDesign[]>([]);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [countAuthority, setCountAuthority] = useState<CatalogCountAuthorityState>({
    status: 'idle',
  });
  const [nextCursor, setNextCursor] = useState<CatalogDesignListQuery['cursor']>(undefined);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [isFullyHydrated, setIsFullyHydrated] = useState(false);
  const [isManagedSearchQuery, setIsManagedSearchQuery] = useState(false);
  /** Algolia hit offset — advances by provider page size, not hydrated card count. */
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
  const smartFiltersKey = useMemo(
    () => serializeSmartFilters(options.smartFilters),
    [options.smartFilters],
  );
  const smartFiltersForSearch = options.smartFilters;

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
      setCountAuthority({ status: 'idle' });
      setNextCursor(undefined);
      setServerHasMore(false);
      setIsFullyHydrated(false);
      setIsManagedSearchQuery(false);
      setManagedSearchNextOffset(0);

      try {
        if (useManagedSearch) {
          const searchQuery = options.searchQuery ?? '';
          const exactIdPromise = looksLikeDesignDocumentId(searchQuery)
            ? fetchVisibleExactIdCatalogDesign(searchQuery, {
                categoryId: options.categoryId,
                selectedTags: selectedTagsForAssets,
              })
            : Promise.resolve(null);

          if (useAlgoliaSearch) {
            try {
              const [algoliaPage, exactIdDesign] = await Promise.all([
                portalAlgoliaCatalogSearchService.listMatchingDesigns(
                  searchQuery,
                  selectedTagsForAssets,
                  {
                    categoryId: options.categoryId,
                    limit: pageSize,
                    offset: 0,
                    smartFilters: smartFiltersForSearch,
                  },
                ),
                exactIdPromise,
              ]);
              if (isCancelled || generation !== hydrateGenerationRef.current) return;
              const designs = mergeExactIdCatalogDesign(algoliaPage.designs, exactIdDesign);
              const addedExactId =
                Boolean(exactIdDesign) &&
                !algoliaPage.designs.some((design) => design.id === exactIdDesign?.id);
              const nextOffset = algoliaPage.hitCount;
              const algoliaTotal = algoliaPage.total ?? algoliaPage.designs.length;
              const total = algoliaTotal + (addedExactId ? 1 : 0);
              setAllDesigns(designs);
              setServerTotalCount(total);
              setCountAuthority({
                status: 'resolved',
                total,
              });
              setManagedSearchNextOffset(nextOffset);
              setIsFullyHydrated(nextOffset >= algoliaPage.total || algoliaPage.hitCount === 0);
              setIsManagedSearchQuery(true);
              setIsLoading(false);
              return;
            } catch {
              const exactIdDesign = await exactIdPromise.catch(() => null);
              if (!isCancelled && generation === hydrateGenerationRef.current && exactIdDesign) {
                setAllDesigns([exactIdDesign]);
                setServerTotalCount(1);
                setCountAuthority({ status: 'resolved', total: 1 });
                setManagedSearchNextOffset(0);
                setIsFullyHydrated(true);
                setIsManagedSearchQuery(true);
                setIsLoading(false);
                setError(null);
                return;
              }
              if (!isCancelled && generation === hydrateGenerationRef.current) {
                setError('Catalog search is temporarily unavailable. Please try again in a moment.');
                setAllDesigns([]);
                setIsLoading(false);
                setServerTotalCount(null);
                setCountAuthority({ status: 'failed' });
              }
              return;
            }
          }

          // Stage 4: no generated Storage fallback. Algolia off → exact-id lookup only, else fail closed.
          const exactIdDesign = await exactIdPromise.catch(() => null);
          if (!isCancelled && generation === hydrateGenerationRef.current && exactIdDesign) {
            setAllDesigns([exactIdDesign]);
            setServerTotalCount(1);
            setCountAuthority({ status: 'resolved', total: 1 });
            setManagedSearchNextOffset(0);
            setIsFullyHydrated(true);
            setIsManagedSearchQuery(true);
            setIsLoading(false);
            return;
          }
          if (!isCancelled && generation === hydrateGenerationRef.current) {
            setError('Catalog search is temporarily unavailable. Please try again in a moment.');
            setAllDesigns([]);
            setIsLoading(false);
            setServerTotalCount(null);
            setCountAuthority({ status: 'failed' });
          }
          return;
        }

        // Phase 1A ordinary path: bounded Firestore (unfiltered / category / single-tag / discovery).
        const firstPage = await catalogService.listReadyDesignsPageWithSortFallback({
          ...serverListQuery,
          limitCount: pageSize,
        });

        if (isCancelled || generation !== hydrateGenerationRef.current) {
          return;
        }

        const listHasMore = Boolean(firstPage.hasMore && firstPage.nextCursor);
        setAllDesigns(firstPage.designs);
        setIsLoading(false);
        setNextCursor(firstPage.nextCursor);
        setServerHasMore(listHasMore);
        setIsFullyHydrated(!listHasMore);
        // Do NOT seed badge from firstPage.designs.length — aggregate is authority (TD-031).
        setCountAuthority({ status: 'pending' });

        const countResult = await fetchReadyDesignCountWithRetry(
          (query) => catalogService.countReadyDesigns(query),
          serverListQuery,
        );

        if (isCancelled || generation !== hydrateGenerationRef.current) {
          return;
        }

        if (countResult.ok) {
          const sortField = serverListQuery.sortField ?? 'readyAt';
          const reconciled = reconcilePagingWithAggregateCount({
            loadedDesigns: firstPage.designs,
            listHasMore: Boolean(firstPage.hasMore),
            listNextCursor: firstPage.nextCursor,
            aggregateTotal: countResult.total,
            sortField,
          });
          setServerTotalCount(countResult.total);
          setCountAuthority({ status: 'resolved', total: countResult.total });
          setNextCursor(reconciled.nextCursor);
          setServerHasMore(reconciled.hasMore);
          setIsFullyHydrated(reconciled.isFullyHydrated);
        } else {
          // Keep cursor-driven Load more; never promote loaded page length to badge authority.
          setCountAuthority({ status: 'failed' });
          setServerTotalCount(null);
        }
      } catch (loadError) {
        if (!isCancelled && generation === hydrateGenerationRef.current) {
          setError(toFriendlyCatalogError(loadError));
          setAllDesigns([]);
          setIsLoading(false);
          setServerTotalCount(null);
          setCountAuthority({ status: 'failed' });
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
    smartFiltersForSearch,
    smartFiltersKey,
    serverListQuery,
    serverListQueryKey,
    useAlgoliaSearch,
    useManagedSearch,
    useOrdinaryFirestore,
  ]);

  // Managed search (Algolia) already applied q/tags/category — skip client re-filter so
  // Smart Profile matches are not dropped by title/description/tags-only search.
  const clientFilters = resolveManagedSearchClientFilters({
    isManagedSearchQuery,
    searchQuery: options.searchQuery,
    categoryId: options.categoryId,
    selectedTags: options.selectedTags,
  });
  const filteredDesigns = useFilteredCatalogDesigns({
    designs: allDesigns,
    search: clientFilters.search,
    categoryId: clientFilters.categoryId,
    selectedTags: clientFilters.selectedTags,
  });

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [options.searchQuery, pageSize, selectedTagsKey, smartFiltersKey, serverListQueryKey]);

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

  const isHydrating = isManagedSearchQuery
    ? false
    : shouldShowOrdinaryCountPending({
        countAuthority,
        isFullyHydrated,
      });

  const matchingCount = isManagedSearchQuery
    ? needsFullHydrate && isLoading
      ? null
      : (serverTotalCount ?? filteredDesigns.length)
    : resolveOrdinaryMatchingCount({
        countAuthority,
        loadedCount: filteredDesigns.length,
        isFullyHydrated,
      });

  const isCountUnavailable =
    !isManagedSearchQuery &&
    shouldShowOrdinaryCountUnavailable({
      countAuthority,
      matchingCount,
    });

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
                  smartFilters: smartFiltersForSearch,
                },
              );
              const nextOffset = requestOffset + page.hitCount;
              setAllDesigns((current) => [...current, ...page.designs]);
              setServerTotalCount(page.total);
              setManagedSearchNextOffset(nextOffset);
              setVisibleCount((current) => current + pageSize);
              setIsFullyHydrated(nextOffset >= page.total || page.hitCount === 0);
            } else {
              setError('Catalog search is temporarily unavailable. Please try again in a moment.');
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
        let nextLoadedCount = 0;
        let lastLoaded: CatalogDesign | undefined;
        setAllDesigns((current) => {
          const next = appendCatalogDesignPageWithoutDuplicates(current, page.designs);
          nextLoadedCount = next.length;
          lastLoaded = next.at(-1);
          return next;
        });
        const listIncomplete = Boolean(page.hasMore && page.nextCursor);
        if (
          countAuthority.status === 'resolved' &&
          countAuthority.total > nextLoadedCount &&
          !listIncomplete &&
          lastLoaded
        ) {
          const sortField = serverListQuery.sortField ?? 'readyAt';
          setNextCursor({
            designId: lastLoaded.id,
            sortValue: getDesignSortValue(lastLoaded, sortField),
          });
          setServerHasMore(true);
          setIsFullyHydrated(false);
        } else {
          setNextCursor(page.nextCursor);
          setServerHasMore(listIncomplete);
          if (!listIncomplete) {
            setIsFullyHydrated(true);
          }
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
    countAuthority,
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
    smartFiltersForSearch,
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
    isCountUnavailable,
    isLoading,
    isLoadingMore,
    loadMoreDesigns,
    matchingCount,
  };
}

/**
 * Discover home: bounded rail pool plus independent complete ready-library count.
 * Never treat `designs.length` as library membership — pool is intentionally capped
 * (`listHomeDiscoveryPool` / `HOME_DISCOVERY_POOL_PAGE_SIZE`).
 *
 * Category rails: select from the Home pool (popularity / max 3 / min 3), then hydrate
 * each selected category from the bounded ready-category list (≤25) so rails are not
 * limited to pool coincidence.
 */
export function useCatalogHomeDesigns(categories: CatalogCategory[] = []): {
  designs: CatalogDesign[];
  categoryRails: Array<{
    categoryId: string;
    name: string;
    designs: CatalogDesign[];
  }>;
  error: string | null;
  isLoading: boolean;
  /** Authoritative ready membership total; null while pending or if aggregate fails. */
  readyLibraryCount: number | null;
} {
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);
  const [categoryRails, setCategoryRails] = useState<
    Array<{ categoryId: string; name: string; designs: CatalogDesign[] }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readyLibraryCount, setReadyLibraryCount] = useState<number | null>(null);

  const categoriesKey = useMemo(
    () => categories.map((category) => `${category.id}:${category.name}`).join('|'),
    [categories],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadHomeDesigns() {
      setIsLoading(true);
      setError(null);

      try {
        const nextDesigns = await catalogService.listHomeDiscoveryPool();
        if (isCancelled) {
          return;
        }
        setDesigns(nextDesigns);

        const selected = selectTopPopularCategoryRails(nextDesigns, categories);
        if (selected.length === 0) {
          setCategoryRails([]);
          return;
        }

        const hydrated = await Promise.all(
          selected.map(async (rail) => {
            try {
              const page = await catalogService.listReadyDesignsPageWithSortFallback({
                categoryId: rail.categoryId,
                limitCount: CATALOG_DISCOVERY_RAIL_LIMIT,
                sortField: 'createdAt',
                skipClientSortRepair: true,
              });
              return {
                categoryId: rail.categoryId,
                name: rail.name,
                designs: page.designs.slice(0, CATALOG_DISCOVERY_RAIL_LIMIT),
              };
            } catch {
              // Fall back to pool-sliced rail if a category hydrate fails.
              return {
                categoryId: rail.categoryId,
                name: rail.name,
                designs: rail.designs,
              };
            }
          }),
        );

        if (!isCancelled) {
          setCategoryRails(hydrated.filter((rail) => rail.designs.length > 0));
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(toFriendlyCatalogError(loadError));
          setDesigns([]);
          setCategoryRails([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    async function loadReadyLibraryCount() {
      const countResult = await fetchReadyDesignCountWithRetry(
        (query) => catalogService.countReadyDesigns(query),
        {},
      );
      if (isCancelled) {
        return;
      }
      if (countResult.ok) {
        setReadyLibraryCount(countResult.total);
      } else {
        // Never fall back to hydrated home-pool length.
        setReadyLibraryCount(null);
      }
    }

    void loadHomeDesigns();
    void loadReadyLibraryCount();

    return () => {
      isCancelled = true;
    };
    // categoriesKey captures category id/name identity without depending on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable key
  }, [categoriesKey]);

  return { designs, categoryRails, error, isLoading, readyLibraryCount };
}

/** Discover search field placeholder — aggregate count only; never home-pool length. */
export function buildDiscoverSearchPlaceholder(readyLibraryCount: number | null): string {
  if (readyLibraryCount === null) {
    return 'title, tag or description';
  }
  if (readyLibraryCount === 1) {
    return 'Search 1 design, by title, tag or description';
  }
  return `Search ${readyLibraryCount.toLocaleString()} designs, by title, tag or description`;
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
