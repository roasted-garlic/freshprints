import { useCallback, useEffect, useMemo, useState } from "react";

import type { User } from "../../users/types/user.types";
import { filterDesignsByNeedsCompanion } from "../utils/designLibrarySearch";
import type { Design } from "../types/design.types";
import { isStudioAlgoliaCatalogConfigured } from "../services/studioAlgoliaCatalogFlags";
import { studioAlgoliaCatalogSearchService } from "../services/studioAlgoliaCatalogSearchService";

const DEFAULT_MANAGED_PAGE_SIZE = 100;

export interface UseDesignLibraryManagedSearchOptions {
  categoryId?: string;
  enabled: boolean;
  needsCompanion: boolean;
  pageSize?: number;
  searchQuery: string;
  selectedTags: string[];
  user: User | null;
}

/**
 * Ready-catalog text search via Algolia (IDs) + Firestore hydrate.
 * Never loadAll / full collection scan. Fail closed when Algolia is not configured.
 */
export function useDesignLibraryManagedSearch(options: UseDesignLibraryManagedSearchOptions): {
  designs: Design[];
  error: string | null;
  hasMore: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  total: number | null;
} {
  const pageSize = options.pageSize ?? DEFAULT_MANAGED_PAGE_SIZE;
  const isConfigured = isStudioAlgoliaCatalogConfigured();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTagsKey = options.selectedTags.join("\u0000");
  const searchKey = options.searchQuery.trim();

  useEffect(() => {
    if (!options.enabled || !options.user || !searchKey) {
      setDesigns([]);
      setTotal(null);
      setNextOffset(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isConfigured) {
      setDesigns([]);
      setTotal(null);
      setNextOffset(0);
      setError(
        "Catalog search is not configured. Add Studio Algolia search-only environment variables (VITE_ALGOLIA_APP_ID, VITE_ALGOLIA_SEARCH_API_KEY, VITE_ALGOLIA_INDEX_NAME).",
      );
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void studioAlgoliaCatalogSearchService
      .listMatchingDesigns(options.user, searchKey, {
        categoryId: options.categoryId,
        limit: pageSize,
        offset: 0,
        selectedTags: options.selectedTags,
      })
      .then((page) => {
        if (cancelled) return;
        setDesigns(page.designs);
        setTotal(page.total);
        setNextOffset(page.hitCount);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setDesigns([]);
        setTotal(null);
        setNextOffset(0);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to search the design catalog. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // selectedTagsKey stands in for selectedTags contents
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable key
  }, [
    isConfigured,
    options.categoryId,
    options.enabled,
    options.user,
    pageSize,
    searchKey,
    selectedTagsKey,
  ]);

  const visibleDesigns = useMemo(
    () => filterDesignsByNeedsCompanion(designs, options.needsCompanion),
    [designs, options.needsCompanion],
  );

  const hasMore =
    options.enabled &&
    isConfigured &&
    total !== null &&
    nextOffset < total &&
    !error;

  const loadMore = useCallback(() => {
    if (!options.enabled || !options.user || !isConfigured || !hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    void studioAlgoliaCatalogSearchService
      .listMatchingDesigns(options.user, searchKey, {
        categoryId: options.categoryId,
        limit: pageSize,
        offset: nextOffset,
        selectedTags: options.selectedTags,
      })
      .then((page) => {
        setDesigns((current) => [...current, ...page.designs]);
        setTotal(page.total);
        setNextOffset((current) => current + page.hitCount);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load more search results. Please try again.",
        );
      })
      .finally(() => setIsLoadingMore(false));
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

  return {
    designs: visibleDesigns,
    error,
    hasMore,
    isConfigured,
    isLoading,
    isLoadingMore,
    loadMore,
    total,
  };
}
