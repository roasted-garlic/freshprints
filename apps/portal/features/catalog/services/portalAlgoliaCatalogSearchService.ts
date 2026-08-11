import {
  parsePortalCatalogTagFacetKey,
  type PortalCatalogAlgoliaRecord,
} from '@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord';
import { withPortalCatalogAlgoliaExactTokenSearchParams } from '@fresh-prints/shared/catalog-search/portalCatalogAlgoliaExactSearchParams';

import type { CatalogDesign, CatalogTagOption } from '../types/catalog.types';
import { catalogService } from './catalogService';
import { getPortalAlgoliaIndexName, getPortalAlgoliaSearchClient } from './portalAlgoliaClient';

export interface PortalAlgoliaSearchPageOptions {
  categoryId?: string;
  limit?: number;
  offset?: number;
}

/** Constraints that must refine tag facet distribution (Stage 1b-C). */
export interface PortalAlgoliaFacetQueryOptions {
  search?: string;
  selectedTags?: string[];
  categoryId?: string;
}

function buildTagAndFilters(tagIds: string[]): string[][] {
  return [...new Set(tagIds.map((id) => id.trim()).filter(Boolean))].map((tagId) => [
    `tagIds:${tagId}`,
  ]);
}

export function hasPortalAlgoliaFacetConstraints(
  options: PortalAlgoliaFacetQueryOptions = {},
): boolean {
  const search = options.search?.trim() ?? '';
  const categoryId = options.categoryId?.trim() ?? '';
  const tags = (options.selectedTags ?? []).map((tag) => tag.trim()).filter(Boolean);
  return Boolean(search || categoryId || tags.length > 0);
}

/**
 * Pure search params for Algolia tag facets — mirrors listMatchingDesigns filters
 * so modal counts match the active catalog result context.
 */
export function buildPortalAlgoliaFacetSearchParams(
  options: PortalAlgoliaFacetQueryOptions = {},
): {
  query: string;
  facetFilters?: string[][];
  filters?: string;
  hitsPerPage: number;
  facets: string[];
  maxValuesPerFacet: number;
  typoTolerance?: false;
  queryType?: 'prefixNone';
} {
  const query = options.search?.trim() ?? '';
  const facetFilters = buildTagAndFilters(options.selectedTags ?? []);
  const categoryId = options.categoryId?.trim();
  return withPortalCatalogAlgoliaExactTokenSearchParams(
    {
      query,
      facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
      filters: categoryId ? `categoryId:${categoryId}` : undefined,
      hitsPerPage: 0,
      facets: ['tagFacetKeys'],
      maxValuesPerFacet: 2000,
    },
    query,
  );
}

/**
 * Convert Algolia tagFacetKeys distribution into tag options.
 * Merges by display name so split keys for the same label cannot under-count.
 */
export function mergePortalAlgoliaTagFacetDistribution(
  distribution: Record<string, number> | undefined,
): CatalogTagOption[] {
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
    selectedTags: string[],
    options: PortalAlgoliaSearchPageOptions = {},
  ): Promise<{ designs: CatalogDesign[]; total: number; hitCount: number }> {
    const client = getPortalAlgoliaSearchClient();
    const indexName = getPortalAlgoliaIndexName();
    const limit = options.limit ?? 40;
    const offset = Math.max(0, options.offset ?? 0);
    const query = search.trim();
    const facetFilters = buildTagAndFilters(selectedTags);
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

  async listTagFacets(): Promise<CatalogTagOption[]> {
    const client = getPortalAlgoliaSearchClient();
    const indexName = getPortalAlgoliaIndexName();
    const response = await client.searchSingleIndex({
      indexName,
      searchParams: buildPortalAlgoliaFacetSearchParams({}),
    });
    return mergePortalAlgoliaTagFacetDistribution(
      response.facets?.tagFacetKeys as Record<string, number> | undefined,
    );
  },

  /**
   * Tag facets refined by the same constraints as catalog search (q + tag AND + category).
   * With no constraints, equivalent to `listTagFacets()`.
   */
  async listNarrowedTagFacets(
    options: PortalAlgoliaFacetQueryOptions = {},
  ): Promise<CatalogTagOption[]> {
    if (!hasPortalAlgoliaFacetConstraints(options)) {
      return portalAlgoliaCatalogSearchService.listTagFacets();
    }

    const client = getPortalAlgoliaSearchClient();
    const indexName = getPortalAlgoliaIndexName();
    const response = await client.searchSingleIndex({
      indexName,
      searchParams: buildPortalAlgoliaFacetSearchParams(options),
    });

    return mergePortalAlgoliaTagFacetDistribution(
      response.facets?.tagFacetKeys as Record<string, number> | undefined,
    );
  },
};
