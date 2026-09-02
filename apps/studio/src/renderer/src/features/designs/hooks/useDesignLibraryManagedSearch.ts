import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { User } from "../../users/types/user.types";
import type { CatalogTag } from "../types/catalogTag.types";
import {
  fetchVisibleExactIdDesign,
  looksLikeDesignDocumentId,
  mergeExactIdDesign,
} from "../utils/designLibraryExactIdSearch";
import { isDesignVisibleInLibraryScope } from "../utils/designLibraryMembership";
import { countManagedSearchDroppedHits } from "../utils/countManagedSearchDroppedHits";
import { deriveManagedCatalogHasMore } from "../utils/deriveManagedCatalogHasMore";
import {
  designMatchesSearchQuery,
  filterDesignsByNeedsCompanion,
} from "../utils/designLibrarySearch";
import type { Design } from "../types/design.types";
import { isStudioAlgoliaCatalogConfigured } from "../services/studioAlgoliaCatalogFlags";
import { studioAlgoliaCatalogSearchService } from "../services/studioAlgoliaCatalogSearchService";
import {
  designMatchesSmartFilters,
  serializeStudioAlgoliaSmartFilters,
  type StudioAlgoliaSmartFilters,
} from "../services/studioAlgoliaSmartFilters";
import { designService } from "../services/designService";

const DEFAULT_MANAGED_PAGE_SIZE = 100;

export interface UseDesignLibraryManagedSearchOptions {
  catalogTags?: readonly CatalogTag[];
  categoryId?: string;
  enabled: boolean;
  needsCompanion: boolean;
  pageSize?: number;
  searchQuery: string;
  selectedTags: string[];
  smartFilters?: StudioAlgoliaSmartFilters;
  user: User | null;
}

/**
 * Ready-catalog managed search via Algolia (IDs) + Firestore hydrate.
 * Supports empty query + tag/category/smart filters (Workstream A/B + Slice 3).
 * Never loadAll / full collection scan. Fail closed when Algolia is not configured.
 *
 * After hydrate, results are consistency-filtered against current Smart Filter dimensions
 * so a just-removed facet value cannot keep a hit alive while Algolia eventually converges.
 * Do **not** re-apply title/tag text search on Algolia hits — that drops Smart Profile
 * searchConcepts/themes/etc. that are not in legacy design text (Slice 3 DEV QA).
 */
export function useDesignLibraryManagedSearch(options: UseDesignLibraryManagedSearchOptions): {
  applyDesignPatch: (updated: Design) => void;
  designs: Design[];
  error: string | null;
  hasMore: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  reload: () => void;
  total: number | null;
} {
  const pageSize = options.pageSize ?? DEFAULT_MANAGED_PAGE_SIZE;
  const isConfigured = isStudioAlgoliaCatalogConfigured();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [algoliaTotal, setAlgoliaTotal] = useState<number | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [lastPageHitCount, setLastPageHitCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const selectedTagsKey = options.selectedTags.join("\u0000");
  const smartFiltersKey = serializeStudioAlgoliaSmartFilters(options.smartFilters);
  const searchKey = options.searchQuery.trim();
  const catalogTagsRef = useRef(options.catalogTags ?? []);
  catalogTagsRef.current = options.catalogTags ?? [];
  const smartFiltersRef = useRef(options.smartFilters);
  smartFiltersRef.current = options.smartFilters;
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    if (!options.enabled || !options.user) {
      setDesigns([]);
      setTotal(null);
      setAlgoliaTotal(null);
      setNextOffset(0);
      setLastPageHitCount(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isConfigured) {
      setDesigns([]);
      setTotal(null);
      setAlgoliaTotal(null);
      setNextOffset(0);
      setLastPageHitCount(0);
      setError(
        "Catalog search is not configured. Add Studio Algolia search-only environment variables (VITE_ALGOLIA_APP_ID, VITE_ALGOLIA_SEARCH_API_KEY, VITE_ALGOLIA_INDEX_NAME).",
      );
      setIsLoading(false);
      return;
    }

    const generation = ++requestGenerationRef.current;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    // Clear stale pagination immediately when query/filters change.
    setDesigns([]);
    setTotal(null);
    setAlgoliaTotal(null);
    setNextOffset(0);
    setLastPageHitCount(0);

    const caller = options.user;
    const smartFilters = options.smartFilters;
    const extraIdPromise = looksLikeDesignDocumentId(searchKey)
      ? fetchVisibleExactIdDesign(
          caller,
          searchKey,
          {
            browsingArchived: false,
            categoryId: options.categoryId,
            selectedTags: options.selectedTags,
          },
          (loadCaller, ids) => designService.getDesignsByIds(loadCaller, ids),
        ).then((design) =>
          design && designMatchesSmartFilters(design, smartFilters) ? design : null,
        )
      : Promise.resolve(null);

    void studioAlgoliaCatalogSearchService
      .listMatchingDesigns(caller, searchKey, {
        categoryId: options.categoryId,
        limit: pageSize,
        offset: 0,
        selectedTags: options.selectedTags,
        smartFilters,
      })
      .then(async (page) => {
        if (cancelled || generation !== requestGenerationRef.current) return;
        const extra = await extraIdPromise;
        if (cancelled || generation !== requestGenerationRef.current) return;
        // Hydrate already drops non-ready; re-check ready scope then smart-filter consistency.
        const readyKept = page.designs.filter((design) =>
          isDesignVisibleInLibraryScope(design, "ready"),
        );
        const algoliaKept = readyKept.filter((design) =>
          designMatchesSmartFilters(design, smartFilters),
        );
        const droppedAlgolia = countManagedSearchDroppedHits(page.hitCount, algoliaKept.length);
        const extraKept =
          extra &&
          designMatchesSearchQuery(extra, searchKey, catalogTagsRef.current) &&
          designMatchesSmartFilters(extra, smartFilters)
            ? extra
            : null;
        const filtered = mergeExactIdDesign(algoliaKept, extraKept);
        const addedExactId = Boolean(extraKept) && !algoliaKept.some((design) => design.id === extraKept?.id);
        const nextAlgoliaTotal =
          page.total === null ? null : Math.max(0, page.total - droppedAlgolia);
        setDesigns(filtered);
        setAlgoliaTotal(nextAlgoliaTotal);
        setTotal(
          nextAlgoliaTotal === null ? null : nextAlgoliaTotal + (addedExactId ? 1 : 0),
        );
        setNextOffset(page.hitCount);
        setLastPageHitCount(page.hitCount);
      })
      .catch(async (loadError) => {
        if (cancelled || generation !== requestGenerationRef.current) return;
        const extra = await extraIdPromise.catch(() => null);
        if (cancelled || generation !== requestGenerationRef.current) return;
        if (
          extra &&
          designMatchesSearchQuery(extra, searchKey, catalogTagsRef.current) &&
          designMatchesSmartFilters(extra, smartFilters)
        ) {
          setDesigns([extra]);
          setTotal(1);
          setAlgoliaTotal(0);
          setNextOffset(0);
          setLastPageHitCount(0);
          setError(null);
          return;
        }
        setDesigns([]);
        setTotal(null);
        setAlgoliaTotal(null);
        setNextOffset(0);
        setLastPageHitCount(0);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to search the design catalog. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled && generation === requestGenerationRef.current) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // selectedTagsKey / smartFiltersKey stand in for array/object contents
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable keys
  }, [
    isConfigured,
    options.categoryId,
    options.enabled,
    options.user,
    pageSize,
    refreshNonce,
    searchKey,
    selectedTagsKey,
    smartFiltersKey,
  ]);

  const visibleDesigns = useMemo(
    () => filterDesignsByNeedsCompanion(designs, options.needsCompanion),
    [designs, options.needsCompanion],
  );

  const hasMore = deriveManagedCatalogHasMore({
    algoliaTotal,
    enabled: options.enabled,
    hasError: Boolean(error),
    isConfigured,
    lastPageHitCount,
    nextOffset,
    pageSize,
  });

  const loadMore = useCallback(() => {
    if (!options.enabled || !options.user || !isConfigured || !hasMore || isLoadingMore) {
      return;
    }

    const generation = requestGenerationRef.current;
    const smartFilters = smartFiltersRef.current;
    setIsLoadingMore(true);
    void studioAlgoliaCatalogSearchService
      .listMatchingDesigns(options.user, searchKey, {
        categoryId: options.categoryId,
        limit: pageSize,
        offset: nextOffset,
        selectedTags: options.selectedTags,
        smartFilters,
      })
      .then((page) => {
        if (generation !== requestGenerationRef.current) return;
        const readyKept = page.designs.filter((design) =>
          isDesignVisibleInLibraryScope(design, "ready"),
        );
        const filtered = readyKept.filter((design) =>
          designMatchesSmartFilters(design, smartFilters),
        );
        const dropped = countManagedSearchDroppedHits(page.hitCount, filtered.length);
        setDesigns((current) => [...current, ...filtered]);
        setAlgoliaTotal(page.total === null ? null : Math.max(0, page.total - dropped));
        setTotal((current) =>
          page.total === null ? null : Math.max(0, (current ?? page.total) - dropped),
        );
        setNextOffset((current) => current + page.hitCount);
        setLastPageHitCount(page.hitCount);
      })
      .catch((loadError) => {
        if (generation !== requestGenerationRef.current) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load more search results. Please try again.",
        );
      })
      .finally(() => {
        if (generation === requestGenerationRef.current) setIsLoadingMore(false);
      });
  }, [
    hasMore,
    isConfigured,
    isLoadingMore,
    nextOffset,
    options.categoryId,
    options.enabled,
    options.selectedTags,
    options.user,
    pageSize,
    searchKey,
  ]);

  const reload = useCallback(() => {
    setRefreshNonce((current) => current + 1);
  }, []);

  const applyDesignPatch = useCallback((updated: Design) => {
    setDesigns((current) => {
      const index = current.findIndex((design) => design.id === updated.id);
      if (index < 0) {
        return current;
      }

      const stillInReadyScope = isDesignVisibleInLibraryScope(updated, "ready");
      const stillMatchesSmart = designMatchesSmartFilters(updated, smartFiltersRef.current);
      if (!stillInReadyScope || !stillMatchesSmart) {
        setTotal((currentTotal) =>
          currentTotal === null ? null : Math.max(0, currentTotal - 1),
        );
        return current.filter((design) => design.id !== updated.id);
      }

      const next = [...current];
      next[index] = updated;
      return next;
    });
  }, []);

  return {
    applyDesignPatch,
    designs: visibleDesigns,
    error,
    hasMore,
    isConfigured,
    isLoading,
    isLoadingMore,
    loadMore,
    reload,
    total,
  };
}
