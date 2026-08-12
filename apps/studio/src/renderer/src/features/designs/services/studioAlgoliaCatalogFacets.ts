import { parsePortalCatalogTagFacetKey } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";
import { withPortalCatalogAlgoliaExactTokenSearchParams } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaExactSearchParams";

/** Constraints that refine tag facet distribution (mirrors Portal Stage 1b-C). */
export interface StudioAlgoliaFacetQueryOptions {
  search?: string;
  selectedTags?: string[];
  categoryId?: string;
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

export function hasStudioAlgoliaFacetConstraints(
  options: StudioAlgoliaFacetQueryOptions = {},
): boolean {
  const search = options.search?.trim() ?? "";
  const categoryId = options.categoryId?.trim() ?? "";
  const tags = (options.selectedTags ?? []).map((tag) => tag.trim()).filter(Boolean);
  return Boolean(search || categoryId || tags.length > 0);
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
  const facetFilters = buildTagAndFilters(options.selectedTags ?? []);
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
