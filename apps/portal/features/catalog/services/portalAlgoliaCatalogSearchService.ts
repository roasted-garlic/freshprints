import {
  buildPortalCatalogAlgoliaSmartFacetFilters,
  PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES,
  normalizePortalCatalogAlgoliaSmartFilterValues,
  type PortalCatalogAlgoliaRecord,
  type PortalCatalogAlgoliaSmartFacetAttribute,
} from '@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord';
import { withPortalCatalogAlgoliaExactTokenSearchParams } from '@fresh-prints/shared/catalog-search/portalCatalogAlgoliaExactSearchParams';

import type { CatalogDesign } from '../types/catalog.types';
import { catalogService } from './catalogService';
import { getPortalAlgoliaIndexName, getPortalAlgoliaSearchClient } from './portalAlgoliaClient';

/** Customer-facing Smart Filter facet attributes (alias of shared contract). */
export type SmartFacetAttr = PortalCatalogAlgoliaSmartFacetAttribute;

export const SMART_FACET_ATTRIBUTES = PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES;

export type PortalSmartFilters = Partial<Record<SmartFacetAttr, string[]>>;

export function normalizePortalSmartFilterValues(
  attribute: SmartFacetAttr,
  values: readonly string[] | undefined,
): string[] {
  return normalizePortalCatalogAlgoliaSmartFilterValues(attribute, values);
}

export interface PortalAlgoliaSearchPageOptions {
  categoryId?: string;
  limit?: number;
  offset?: number;
  smartFilters?: PortalSmartFilters;
}

/** Constraints that refine Smart Profile facet distributions (Stage 1b-C / Slice 3). */
export interface PortalAlgoliaFacetQueryOptions {
  search?: string;
  categoryId?: string;
  smartFilters?: PortalSmartFilters;
}

export interface PortalSmartFacetOption {
  value: string;
  count: number;
}

export type PortalSmartFacetDistributions = Partial<
  Record<SmartFacetAttr, PortalSmartFacetOption[]>
>;

/**
 * Build cumulative Algolia facet groups: selected values and dimensions are ANDed.
 * Never includes objects / searchConcepts / visibleText.
 */
export function buildSmartFacetAndFilters(smartFilters?: PortalSmartFilters): string[][] {
  return buildPortalCatalogAlgoliaSmartFacetFilters(smartFilters);
}

/** Build the Smart facet groups used by catalog/search/category queries. */
export function buildPortalAlgoliaCombinedFacetFilters(options: {
  smartFilters?: PortalSmartFilters;
}): string[][] {
  return buildSmartFacetAndFilters(options.smartFilters);
}

export function countSelectedSmartFilters(smartFilters?: PortalSmartFilters): number {
  if (!smartFilters) return 0;
  let count = 0;
  for (const attr of SMART_FACET_ATTRIBUTES) {
    count += normalizePortalCatalogAlgoliaSmartFilterValues(attr, smartFilters[attr]).length;
  }
  return count;
}

export function hasSelectedSmartFilters(smartFilters?: PortalSmartFilters): boolean {
  return countSelectedSmartFilters(smartFilters) > 0;
}

/** Stable serialization for React effect deps. */
export function serializeSmartFilters(smartFilters?: PortalSmartFilters): string {
  if (!smartFilters) return '';
  return SMART_FACET_ATTRIBUTES.map((attr) => {
    const sorted = normalizePortalCatalogAlgoliaSmartFilterValues(attr, smartFilters[attr]).sort(
      (left, right) => left.localeCompare(right),
    );
    return sorted.length > 0 ? `${attr}=${sorted.join('\u0001')}` : '';
  })
    .filter(Boolean)
    .join('\u0000');
}

export function hasPortalAlgoliaFacetConstraints(
  options: PortalAlgoliaFacetQueryOptions = {},
): boolean {
  const search = options.search?.trim() ?? '';
  const categoryId = options.categoryId?.trim() ?? '';
  return Boolean(search || categoryId || hasSelectedSmartFilters(options.smartFilters));
}

/**
 * Pure search params for Smart Filter facet distributions (8 customer dimensions only).
 * objects / searchConcepts / visibleText are never requested as facets.
 */
export function buildPortalAlgoliaSmartFacetSearchParams(
  options: PortalAlgoliaFacetQueryOptions = {},
): {
  query: string;
  facetFilters?: string[][];
  filters?: string;
  hitsPerPage: number;
  facets: string[];
  maxValuesPerFacet: number;
  typoTolerance?: false;
  queryType?: 'prefixLast';
} {
  const query = options.search?.trim() ?? '';
  const facetFilters = buildPortalAlgoliaCombinedFacetFilters({
    smartFilters: options.smartFilters,
  });
  const categoryId = options.categoryId?.trim();
  return withPortalCatalogAlgoliaExactTokenSearchParams(
    {
      query,
      facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
      filters: categoryId ? `categoryId:${categoryId}` : undefined,
      hitsPerPage: 0,
      facets: [...SMART_FACET_ATTRIBUTES],
      maxValuesPerFacet: 2000,
    },
    query,
  );
}

/**
 * Pure search params for Category facet distribution.
 * Uses query + smart filters, but **never** the selected category filter —
 * so the Category selector can list every category that still has matches.
 */
export function buildPortalAlgoliaCategoryFacetSearchParams(
  options: PortalAlgoliaFacetQueryOptions = {},
): {
  query: string;
  facetFilters?: string[][];
  filters?: string;
  hitsPerPage: number;
  facets: string[];
  maxValuesPerFacet: number;
  typoTolerance?: false;
  queryType?: 'prefixLast';
} {
  const query = options.search?.trim() ?? '';
  const facetFilters = buildPortalAlgoliaCombinedFacetFilters({
    smartFilters: options.smartFilters,
  });
  return withPortalCatalogAlgoliaExactTokenSearchParams(
    {
      query,
      facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
      // Intentionally omit categoryId filter (disjunctive category facet).
      filters: undefined,
      hitsPerPage: 0,
      facets: ['categoryId'],
      maxValuesPerFacet: 2000,
    },
    query,
  );
}

/** True when category options should narrow (search / Smart Filters) — not category alone. */
export function hasPortalAlgoliaCategoryFacetConstraints(
  options: Pick<PortalAlgoliaFacetQueryOptions, 'search' | 'smartFilters'> = {},
): boolean {
  const search = options.search?.trim() ?? '';
  return Boolean(search || hasSelectedSmartFilters(options.smartFilters));
}

export interface PortalCategoryFacetOption {
  id: string;
  count: number;
}

export function mergePortalAlgoliaCategoryFacetDistribution(
  distribution: Record<string, number> | undefined,
): PortalCategoryFacetOption[] {
  if (!distribution) return [];
  return Object.entries(distribution)
    .filter(([id, count]) => id.trim().length > 0 && count > 0)
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Build Category select options from Firestore category catalog + Algolia facet IDs.
 * Always includes All categories; keeps selected category visible even if count is 0.
 */
export function buildNarrowedCatalogCategoryOptions(args: {
  categories: Array<{ id: string; name: string }>;
  facetCategoryIds: readonly string[];
  selectedCategoryId?: string;
}): Array<{ value: string; label: string }> {
  const allowed = new Set(args.facetCategoryIds.map((id) => id.trim()).filter(Boolean));
  const selected = args.selectedCategoryId?.trim() || '';
  const options: Array<{ value: string; label: string }> = [{ value: '', label: 'All categories' }];
  for (const category of args.categories) {
    if (!allowed.has(category.id) && category.id !== selected) {
      continue;
    }
    options.push({ value: category.id, label: category.name });
  }
  return options;
}

/** Convert a single Smart facet attribute distribution into sorted options. */
export function mergePortalAlgoliaSmartFacetDistribution(
  distribution: Record<string, number> | undefined,
  attribute?: SmartFacetAttr,
): PortalSmartFacetOption[] {
  if (!distribution) return [];
  const merged = new Map<string, number>();
  for (const [value, count] of Object.entries(distribution)) {
    if (count <= 0) continue;
    const canonical = attribute
      ? normalizePortalSmartFilterValues(attribute, [value])[0]
      : value;
    if (!canonical) continue;
    merged.set(canonical, (merged.get(canonical) ?? 0) + count);
  }
  return [...merged.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value));
}

export function mergePortalAlgoliaSmartFacetDistributions(
  facets: Record<string, Record<string, number>> | undefined,
): PortalSmartFacetDistributions {
  if (!facets) return {};
  const result: PortalSmartFacetDistributions = {};
  for (const attr of SMART_FACET_ATTRIBUTES) {
    result[attr] = mergePortalAlgoliaSmartFacetDistribution(facets[attr], attr);
  }
  return result;
}

/**
 * Preserve Algolia hit order when hydrating cards from Firestore by ID.
 * IDs that fail Rules / are non-ready are omitted (never authorize from Algolia alone).
 */
export async function hydrateCatalogDesignsPreservingOrder(
  orderedIds: string[],
): Promise<CatalogDesign[]> {
  if (orderedIds.length === 0) return [];
  const designs = await catalogService.getReadyDesignsByIds(orderedIds);
  const byId = new Map(designs.map((design) => [design.id, design]));
  return orderedIds
    .map((id) => byId.get(id))
    .filter((design): design is CatalogDesign => design !== undefined);
}

export const portalAlgoliaCatalogSearchService = {
  async listMatchingDesigns(
    search: string,
    options: PortalAlgoliaSearchPageOptions = {},
  ): Promise<{ designs: CatalogDesign[]; total: number; hitCount: number }> {
    const client = getPortalAlgoliaSearchClient();
    const indexName = getPortalAlgoliaIndexName();
    const limit = options.limit ?? 40;
    const offset = Math.max(0, options.offset ?? 0);
    const query = search.trim();
    const facetFilters = buildPortalAlgoliaCombinedFacetFilters({
      smartFilters: options.smartFilters,
    });
    const filters = options.categoryId?.trim()
      ? `categoryId:${options.categoryId.trim()}`
      : undefined;
    // Offset must advance by Algolia hit windows, not hydrated card count (Rules may omit hits).
    const page = Math.floor(offset / limit);

    const response = await client.searchSingleIndex<PortalCatalogAlgoliaRecord>({
      indexName,
      searchParams: withPortalCatalogAlgoliaExactTokenSearchParams(
        {
          query,
          facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
          filters,
          hitsPerPage: limit,
          page,
        },
        query,
      ),
    });

    const ids = response.hits.map((hit) => hit.objectID);
    const designs = await hydrateCatalogDesignsPreservingOrder(ids);
    return {
      designs,
      hitCount: ids.length,
      total: typeof response.nbHits === 'number' ? response.nbHits : designs.length,
    };
  },

  /**
   * Smart Filter facet distributions for the 8 customer dimensions.
   * Refined by q + category + all current smart selections (contextual cumulative counts).
   */
  async listSmartFacetDistributions(
    options: PortalAlgoliaFacetQueryOptions = {},
  ): Promise<PortalSmartFacetDistributions> {
    const client = getPortalAlgoliaSearchClient();
    const indexName = getPortalAlgoliaIndexName();
    const response = await client.searchSingleIndex({
      indexName,
      searchParams: buildPortalAlgoliaSmartFacetSearchParams(options),
    });
    return mergePortalAlgoliaSmartFacetDistributions(
      response.facets as Record<string, Record<string, number>> | undefined,
    );
  },

  /**
   * CategoryId facet distribution for the Category selector.
   * Refined by q + Smart Filters — **never** by the selected category.
   */
  async listNarrowedCategoryFacets(
    options: Omit<PortalAlgoliaFacetQueryOptions, 'categoryId'> = {},
  ): Promise<PortalCategoryFacetOption[]> {
    const client = getPortalAlgoliaSearchClient();
    const indexName = getPortalAlgoliaIndexName();
    const response = await client.searchSingleIndex({
      indexName,
      searchParams: buildPortalAlgoliaCategoryFacetSearchParams(options),
    });
    return mergePortalAlgoliaCategoryFacetDistribution(
      response.facets?.categoryId as Record<string, number> | undefined,
    );
  },
};
