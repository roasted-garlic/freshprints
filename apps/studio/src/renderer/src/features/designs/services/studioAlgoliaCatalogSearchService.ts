import type { PortalCatalogAlgoliaRecord } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";
import {
  PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES,
  type PortalCatalogAlgoliaSmartFacetAttribute,
} from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";
import { withPortalCatalogAlgoliaExactTokenSearchParams } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaExactSearchParams";

import type { User } from "../../users/types/user.types";
import type { Design } from "../types/design.types";
import { filterDesignsForLibraryScope } from "../utils/designLibraryMembership";
import { designService } from "./designService";
import { isStudioAlgoliaCatalogConfigured } from "./studioAlgoliaCatalogFlags";
import { getStudioAlgoliaIndexName, getStudioAlgoliaSearchClient } from "./studioAlgoliaClient";
import {
  buildStudioAlgoliaCategoryFacetSearchParams,
  buildStudioAlgoliaCombinedFacetFilters,
  buildStudioAlgoliaSmartFacetSearchParams,
  hasStudioAlgoliaFacetConstraints,
  mergeStudioAlgoliaCategoryFacetDistribution,
  type StudioAlgoliaCategoryFacetOption,
  type StudioAlgoliaFacetQueryOptions,
} from "./studioAlgoliaCatalogFacets";
import {
  mergeStudioAlgoliaSmartFacetDistribution,
  type StudioAlgoliaSmartFacetOption,
  type StudioAlgoliaSmartFilters,
} from "./studioAlgoliaSmartFilters";

export type { StudioAlgoliaFacetQueryOptions, StudioAlgoliaCategoryFacetOption };
export type { StudioAlgoliaSmartFacetOption, StudioAlgoliaSmartFilters };
export {
  buildStudioAlgoliaCategoryFacetSearchParams,
  buildStudioAlgoliaSmartFacetSearchParams,
  hasStudioAlgoliaFacetConstraints,
  mergeStudioAlgoliaCategoryFacetDistribution,
};

export interface StudioAlgoliaSearchPageOptions {
  categoryId?: string;
  limit?: number;
  offset?: number;
  smartFilters?: StudioAlgoliaSmartFilters;
}

export type StudioAlgoliaSmartFacetMap = Record<
  PortalCatalogAlgoliaSmartFacetAttribute,
  StudioAlgoliaSmartFacetOption[]
>;

function emptySmartFacetMap(): StudioAlgoliaSmartFacetMap {
  return {
    subjects: [],
    styles: [],
    themes: [],
    interests: [],
    professionsGroups: [],
    occasions: [],
    places: [],
    colors: [],
  };
}

/**
 * Preserve Algolia hit order when hydrating Studio Design cards from Firestore by ID.
 * Missing / unauthorized docs are omitted (Firestore remains authoritative).
 * Non-ready docs (stale Algolia objectIDs after archive) are omitted — status overrides index membership.
 */
export async function hydrateStudioDesignsPreservingOrder(
  caller: User,
  orderedIds: string[],
): Promise<Design[]> {
  if (orderedIds.length === 0) {
    return [];
  }
  const designs = await designService.getDesignsByIds(caller, orderedIds);
  const byId = new Map(designs.map((design) => [design.id, design]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((design): design is Design => design !== undefined);
  return filterDesignsForLibraryScope(ordered, "ready");
}

export const studioAlgoliaCatalogSearchService = {
  isConfigured(): boolean {
    return isStudioAlgoliaCatalogConfigured();
  },

  async listMatchingDesigns(
    caller: User,
    search: string,
    options: StudioAlgoliaSearchPageOptions = {},
  ): Promise<{ designs: Design[]; total: number; hitCount: number }> {
    if (!isStudioAlgoliaCatalogConfigured()) {
      throw new Error(
        "Catalog search is not configured. Add Studio Algolia search-only environment variables.",
      );
    }

    const client = getStudioAlgoliaSearchClient();
    const indexName = getStudioAlgoliaIndexName();
    const limit = options.limit ?? 100;
    const offset = Math.max(0, options.offset ?? 0);
    const query = search.trim();
    const facetFilters = buildStudioAlgoliaCombinedFacetFilters({
      smartFilters: options.smartFilters,
    });
    const filters = options.categoryId?.trim()
      ? `categoryId:${options.categoryId.trim()}`
      : undefined;
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
    const designs = await hydrateStudioDesignsPreservingOrder(caller, ids);
    return {
      designs,
      hitCount: ids.length,
      total: typeof response.nbHits === "number" ? response.nbHits : designs.length,
    };
  },

  /**
   * Smart Filter facet distributions for the 8 customer-facing attributes.
   * Refined by q + category + draft smart selections (AND).
   */
  async listNarrowedSmartFacets(
    options: StudioAlgoliaFacetQueryOptions = {},
  ): Promise<StudioAlgoliaSmartFacetMap> {
    if (!isStudioAlgoliaCatalogConfigured()) {
      throw new Error(
        "Catalog search is not configured. Add Studio Algolia search-only environment variables.",
      );
    }

    const client = getStudioAlgoliaSearchClient();
    const indexName = getStudioAlgoliaIndexName();
    const response = await client.searchSingleIndex({
      indexName,
      searchParams: buildStudioAlgoliaSmartFacetSearchParams(options),
    });

    const result = emptySmartFacetMap();
    for (const attribute of PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES) {
      result[attribute] = mergeStudioAlgoliaSmartFacetDistribution(
        response.facets?.[attribute] as Record<string, number> | undefined,
      );
    }
    return result;
  },

  /**
   * CategoryId facets for the Category selector — excludes selected category from constraints.
   */
  async listNarrowedCategoryFacets(
    options: Omit<StudioAlgoliaFacetQueryOptions, "categoryId"> = {},
  ): Promise<StudioAlgoliaCategoryFacetOption[]> {
    if (!isStudioAlgoliaCatalogConfigured()) {
      throw new Error(
        "Catalog search is not configured. Add Studio Algolia search-only environment variables.",
      );
    }

    const client = getStudioAlgoliaSearchClient();
    const indexName = getStudioAlgoliaIndexName();
    const response = await client.searchSingleIndex({
      indexName,
      searchParams: buildStudioAlgoliaCategoryFacetSearchParams(options),
    });
    return mergeStudioAlgoliaCategoryFacetDistribution(
      response.facets?.categoryId as Record<string, number> | undefined,
    );
  },
};
