import type { CatalogTag } from "../../designs/types/catalogTag.types";
import type { Design } from "../../designs/types/design.types";
import { filterDesignsBySearch } from "../../designs/utils/designLibrarySearch";

export const NEEDS_REVIEW_SEARCH_HYDRATION_CAP = 500;
export const NEEDS_REVIEW_SEARCH_MORE_BATCH = 500;

export function normalizeNeedsReviewSearchQuery(searchQuery: string): string {
  return searchQuery.trim().toLowerCase();
}

export function isNeedsReviewSearchActive(searchQuery: string | undefined): boolean {
  return normalizeNeedsReviewSearchQuery(searchQuery ?? "").length > 0;
}

export function filterNeedsReviewDesignsBySearch(
  designs: Design[],
  searchQuery: string,
  catalogTags: readonly CatalogTag[] = [],
): Design[] {
  return filterDesignsBySearch(designs, searchQuery, catalogTags);
}

export function resolveNeedsReviewHydrationTarget(input: {
  currentTarget: number;
  requestedBatchSize?: number;
  initialCap?: number;
  allowBeyondInitialCap?: boolean;
}): number {
  const batchSize = input.requestedBatchSize ?? NEEDS_REVIEW_SEARCH_MORE_BATCH;
  const nextTarget = input.currentTarget + batchSize;

  if (input.allowBeyondInitialCap) {
    return nextTarget;
  }

  const initialCap = input.initialCap ?? NEEDS_REVIEW_SEARCH_HYDRATION_CAP;
  return Math.min(initialCap, nextTarget);
}

export function shouldAutoLoadNeedsReviewSearch(input: {
  searchQuery: string | undefined;
  loadedCount: number;
  hydrationTarget: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
}): boolean {
  if (!isNeedsReviewSearchActive(input.searchQuery)) {
    return false;
  }

  if (input.isLoading || input.isLoadingMore || !input.hasMore) {
    return false;
  }

  return input.loadedCount < input.hydrationTarget;
}

export function resolveNeedsReviewSearchHydrationState(input: {
  searchQuery: string | undefined;
  hydratedCount: number;
  filteredCount: number;
  totalCount: number | null;
  hasMore: boolean;
  hydrationTarget: number;
  isLoadingMore: boolean;
  cap?: number;
}): {
  foundCount: number;
  searchedCount: number;
  totalCount: number | null;
  canSearchMore: boolean;
  isSearching: boolean;
} {
  const cap = input.cap ?? NEEDS_REVIEW_SEARCH_HYDRATION_CAP;
  const active = isNeedsReviewSearchActive(input.searchQuery);
  const searchedCount = input.hydratedCount;
  const foundCount = active ? input.filteredCount : 0;
  const totalCount = active ? input.totalCount : null;
  const belowTabTotal = totalCount !== null && searchedCount < totalCount;
  const belowHydrationTarget = searchedCount < input.hydrationTarget;
  const atCapWithMorePages = searchedCount >= cap && input.hasMore;

  const canSearchMore =
    active && (belowTabTotal || atCapWithMorePages || (belowHydrationTarget && input.hasMore));
  const isSearching =
    active && input.isLoadingMore && (belowHydrationTarget || belowTabTotal);

  return {
    foundCount,
    searchedCount,
    totalCount,
    canSearchMore,
    isSearching,
  };
}

export function shouldShowNeedsReviewSearchNoResults(input: {
  searchQuery: string | undefined;
  filteredCount: number;
  canSearchMore: boolean;
}): boolean {
  if (!isNeedsReviewSearchActive(input.searchQuery)) {
    return false;
  }

  if (input.filteredCount > 0) {
    return false;
  }

  return !input.canSearchMore;
}
