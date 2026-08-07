import {
  parsePortalCatalogTagFacetKey,
  type PortalCatalogAlgoliaRecord,
} from '@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord';

import type { CatalogDesign, CatalogTagOption } from '../types/catalog.types';
import { catalogService } from './catalogService';
import { getPortalAlgoliaIndexName, getPortalAlgoliaSearchClient } from './portalAlgoliaClient';

export interface PortalAlgoliaSearchPageOptions {
  categoryId?: string;
  limit?: number;
  offset?: number;
}

function buildTagAndFilters(tagIds: string[]): string[][] {
  return [...new Set(tagIds.map((id) => id.trim()).filter(Boolean))].map((tagId) => [
    `tagIds:${tagId}`,
  ]);
}

function facetDistributionToTagOptions(
  distribution: Record<string, number> | undefined,
): CatalogTagOption[] {
  if (!distribution) return [];
  const options: CatalogTagOption[] = [];
  for (const [key, count] of Object.entries(distribution)) {
    if (count <= 0) continue;
    const parsed = parsePortalCatalogTagFacetKey(key);
    if (!parsed) continue;
    options.push({ id: parsed.id, name: parsed.name, count });
  }
  return options.sort((left, right) => left.name.localeCompare(right.name));
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
      searchParams: {
        query,
        facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
        filters,
        hitsPerPage: limit,
        page,
      },
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
      searchParams: {
        query: '',
        hitsPerPage: 0,
        facets: ['tagFacetKeys'],
        maxValuesPerFacet: 2000,
      },
    });
    return facetDistributionToTagOptions(
      response.facets?.tagFacetKeys as Record<string, number> | undefined,
    );
  },

  async listNarrowedTagFacets(selectedTags: string[]): Promise<CatalogTagOption[]> {
    const uniqueSelected = [...new Set(selectedTags.map((tag) => tag.trim()).filter(Boolean))];
    if (uniqueSelected.length === 0) {
      return portalAlgoliaCatalogSearchService.listTagFacets();
    }

    const client = getPortalAlgoliaSearchClient();
    const indexName = getPortalAlgoliaIndexName();
    const response = await client.searchSingleIndex({
      indexName,
      searchParams: {
        query: '',
        hitsPerPage: 0,
        facetFilters: buildTagAndFilters(uniqueSelected),
        facets: ['tagFacetKeys'],
        maxValuesPerFacet: 2000,
      },
    });

    return facetDistributionToTagOptions(
      response.facets?.tagFacetKeys as Record<string, number> | undefined,
    );
  },
};
