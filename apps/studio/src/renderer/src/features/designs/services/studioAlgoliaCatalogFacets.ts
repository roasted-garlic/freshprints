import { PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";
import { withPortalCatalogAlgoliaExactTokenSearchParams } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaExactSearchParams";

import {
  buildStudioAlgoliaSmartFacetFilters,
  hasStudioAlgoliaSmartFilterSelections,
  type StudioAlgoliaSmartFilters,
} from "./studioAlgoliaSmartFilters";

/** Constraints that refine smart facet distribution. */
export interface StudioAlgoliaFacetQueryOptions {
  search?: string;
  categoryId?: string;
  smartFilters?: StudioAlgoliaSmartFilters;
}

export function buildStudioAlgoliaCombinedFacetFilters(options: {
  smartFilters?: StudioAlgoliaSmartFilters;
}): string[][] {
  return buildStudioAlgoliaSmartFacetFilters(options.smartFilters);
}

export function hasStudioAlgoliaFacetConstraints(
  options: StudioAlgoliaFacetQueryOptions = {},
): boolean {
  const search = options.search?.trim() ?? "";
  const categoryId = options.categoryId?.trim() ?? "";
  return Boolean(
    search ||
      categoryId ||
      hasStudioAlgoliaSmartFilterSelections(options.smartFilters),
  );
}

/**
 * Pure search params for Smart Filter facets.
 */
/**
 * Pure search params for Smart Filter facet distributions (8 attributes only).
 * Never requests objects / searchConcepts / visibleText facets.
 */
export function buildStudioAlgoliaSmartFacetSearchParams(
  options: StudioAlgoliaFacetQueryOptions = {},
): {
  query: string;
  facetFilters?: string[][];
  filters?: string;
  hitsPerPage: number;
  facets: string[];
  maxValuesPerFacet: number;
  typoTolerance?: false;
  queryType?: "prefixLast";
} {
  const query = options.search?.trim() ?? "";
  const facetFilters = buildStudioAlgoliaCombinedFacetFilters(options);
  const categoryId = options.categoryId?.trim();
  return withPortalCatalogAlgoliaExactTokenSearchParams(
    {
      query,
      facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
      filters: categoryId ? `categoryId:${categoryId}` : undefined,
      hitsPerPage: 0,
      facets: [...PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES],
      maxValuesPerFacet: 2000,
    },
    query,
  );
}

/**
 * Pure search params for Category facet distribution (disjunctive on category).
 * query + smart — never the selected category filter.
 */
export function buildStudioAlgoliaCategoryFacetSearchParams(
  options: StudioAlgoliaFacetQueryOptions = {},
): {
  query: string;
  facetFilters?: string[][];
  filters?: string;
  hitsPerPage: number;
  facets: string[];
  maxValuesPerFacet: number;
  typoTolerance?: false;
  queryType?: "prefixLast";
} {
  const query = options.search?.trim() ?? "";
  const facetFilters = buildStudioAlgoliaCombinedFacetFilters({ smartFilters: options.smartFilters });
  return withPortalCatalogAlgoliaExactTokenSearchParams(
    {
      query,
      facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
      filters: undefined,
      hitsPerPage: 0,
      facets: ["categoryId"],
      maxValuesPerFacet: 2000,
    },
    query,
  );
}

/** Narrow Category options when search / smart are active (not category alone). */
export function hasStudioAlgoliaCategoryFacetConstraints(
  options: Pick<StudioAlgoliaFacetQueryOptions, "search" | "smartFilters"> = {},
): boolean {
  const search = options.search?.trim() ?? "";
  return Boolean(
    search || hasStudioAlgoliaSmartFilterSelections(options.smartFilters),
  );
}

export interface StudioAlgoliaCategoryFacetOption {
  id: string;
  count: number;
}

export function mergeStudioAlgoliaCategoryFacetDistribution(
  distribution: Record<string, number> | undefined,
): StudioAlgoliaCategoryFacetOption[] {
  if (!distribution) return [];
  return Object.entries(distribution)
    .filter(([id, count]) => id.trim().length > 0 && count > 0)
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => left.id.localeCompare(right.id));
}
