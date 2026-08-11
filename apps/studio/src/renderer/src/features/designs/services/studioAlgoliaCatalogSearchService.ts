import type { PortalCatalogAlgoliaRecord } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";
import { withPortalCatalogAlgoliaExactTokenSearchParams } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaExactSearchParams";

import type { User } from "../../users/types/user.types";
import type { Design } from "../types/design.types";
import { designService } from "./designService";
import { isStudioAlgoliaCatalogConfigured } from "./studioAlgoliaCatalogFlags";
import { getStudioAlgoliaIndexName, getStudioAlgoliaSearchClient } from "./studioAlgoliaClient";

export interface StudioAlgoliaSearchPageOptions {
  categoryId?: string;
  limit?: number;
  offset?: number;
  selectedTags?: string[];
}

function buildTagAndFilters(tagIds: string[]): string[][] {
  return [...new Set(tagIds.map((id) => id.trim()).filter(Boolean))].map((tagId) => [
    `tagIds:${tagId}`,
  ]);
}

/**
 * Preserve Algolia hit order when hydrating Studio Design cards from Firestore by ID.
 * Missing / unauthorized docs are omitted (Firestore remains authoritative).
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
  return orderedIds
    .map((id) => byId.get(id))
    .filter((design): design is Design => design !== undefined);
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
    const facetFilters = buildTagAndFilters(options.selectedTags ?? []);
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
};
