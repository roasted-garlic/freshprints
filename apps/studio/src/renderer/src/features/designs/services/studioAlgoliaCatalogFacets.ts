import {
  parsePortalCatalogTagFacetKey,
  PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES,
} from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";
import { withPortalCatalogAlgoliaExactTokenSearchParams } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaExactSearchParams";

import {
  buildStudioAlgoliaSmartFacetFilters,
  hasStudioAlgoliaSmartFilterSelections,
  type StudioAlgoliaSmartFilters,
} from "./studioAlgoliaSmartFilters";

/** Constraints that refine tag / smart facet distribution (mirrors Portal Stage 1b-C + Slice 3). */
export interface StudioAlgoliaFacetQueryOptions {
  search?: string;
  selectedTags?: string[];
  categoryId?: string;
  smartFilters?: StudioAlgoliaSmartFilters;
}

export interface StudioAlgoliaTagFacetOption {
  id: string;
  name: string;
  count: number;
}

function buildTagAndFilters(tagIds: string[]): string[][] {
  return [...new Set(tagIds.map((id) => id.trim()).filter(Boolean))].map((tagId) => [
    `tagIds:${tagId}`,
  ]);
}

export function buildStudioAlgoliaCombinedFacetFilters(options: {
  selectedTags?: string[];
  smartFilters?: StudioAlgoliaSmartFilters;
}): string[][] {
  return [
    ...buildTagAndFilters(options.selectedTags ?? []),
    ...buildStudioAlgoliaSmartFacetFilters(options.smartFilters),
  ];
}

export function hasStudioAlgoliaFacetConstraints(
  options: StudioAlgoliaFacetQueryOptions = {},
): boolean {
  const search = options.search?.trim() ?? "";
  const categoryId = options.categoryId?.trim() ?? "";
  const tags = (options.selectedTags ?? []).map((tag) => tag.trim()).filter(Boolean);
  return Boolean(
    search ||
      categoryId ||
      tags.length > 0 ||
      hasStudioAlgoliaSmartFilterSelections(options.smartFilters),
  );
}

/**
 * Pure search params for Algolia tag facets — mirrors listMatchingDesigns filters
 * so modal counts match the active catalog result context. Uses existing `tagFacetKeys`
 * (no index-settings mutation).
 */
export function buildStudioAlgoliaFacetSearchParams(
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
      facets: ["tagFacetKeys"],
      maxValuesPerFacet: 2000,
    },
    query,
  );
}

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
 * query + tags + smart — never the selected category filter.
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
  const facetFilters = buildStudioAlgoliaCombinedFacetFilters({
    selectedTags: options.selectedTags,
    smartFilters: options.smartFilters,
  });
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

/** Narrow Category options when search / tags / smart are active (not category alone). */
export function hasStudioAlgoliaCategoryFacetConstraints(
  options: Pick<StudioAlgoliaFacetQueryOptions, "search" | "selectedTags" | "smartFilters"> = {},
): boolean {
  const search = options.search?.trim() ?? "";
  const tags = (options.selectedTags ?? []).map((tag) => tag.trim()).filter(Boolean);
  return Boolean(
    search || tags.length > 0 || hasStudioAlgoliaSmartFilterSelections(options.smartFilters),
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

/**
 * Convert Algolia tagFacetKeys distribution into tag options.
 * Merges by display name so split keys for the same label cannot under-count.
 */
export function mergeStudioAlgoliaTagFacetDistribution(
  distribution: Record<string, number> | undefined,
): StudioAlgoliaTagFacetOption[] {
  if (!distribution) return [];
  const countByName = new Map<string, { id: string; name: string; count: number }>();
  for (const [key, count] of Object.entries(distribution)) {
    if (count <= 0) continue;
    const parsed = parsePortalCatalogTagFacetKey(key);
    if (!parsed) continue;
    const existing = countByName.get(parsed.name);
    if (existing) {
      existing.count += count;
    } else {
      countByName.set(parsed.name, { id: parsed.id, name: parsed.name, count });
    }
  }
  return [...countByName.values()].sort((left, right) => left.name.localeCompare(right.name));
}
