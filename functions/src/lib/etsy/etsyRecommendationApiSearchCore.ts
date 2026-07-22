import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

import {
  ETSY_RECOMMENDATION_COLLECTION,
  ETSY_RECOMMENDATION_SEARCH_FETCH_LIMIT,
} from "../../../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import type { EtsyRecommendationAnswers } from "../../../../packages/shared/src/types/etsyRecommendation/etsyRecommendation.types";
import type {
  SearchEtsyRecommendationsStatus,
} from "../../../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";
import {
  buildEtsyRecommendationApiKeywords,
  buildEtsyRecommendationApiKeywordsFallback,
} from "../../../../packages/shared/src/utils/etsyRecommendationQueryBuilder";

import { adminDb } from "../admin";
import type { EtsyClient, EtsyRawListing } from "./etsyClient.types";
import {
  mergeHydratedListings,
  normalizeEtsyListings,
} from "./normalizeEtsyListings";

export type EtsyRecommendationApiSearchExecution = {
  listings: ReturnType<typeof normalizeEtsyListings>;
  status: SearchEtsyRecommendationsStatus;
  apiKeywordsUsed?: string;
  keywordStrategy?: "focused" | "fallback";
};

async function searchAndNormalize(
  client: EtsyClient,
  keywords: string,
): Promise<{ listings: ReturnType<typeof normalizeEtsyListings>; rawCount: number }> {
  const search = await client.searchActiveListings({
    keywords,
    limit: ETSY_RECOMMENDATION_SEARCH_FETCH_LIMIT,
    sortOn: "score",
  });
  const searchRows = search.results;

  const listingIds = searchRows
    .map((row) => Number(row.listing_id))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, ETSY_RECOMMENDATION_SEARCH_FETCH_LIMIT);

  let merged: EtsyRawListing[] = searchRows;
  if (listingIds.length > 0) {
    try {
      const hydrated = await client.hydrateListings(listingIds);
      merged = mergeHydratedListings(searchRows, hydrated);
    } catch {
      merged = searchRows;
    }
  }

  return {
    listings: normalizeEtsyListings(merged),
    rawCount: searchRows.length,
  };
}

/**
 * Run focused → fallback Open API search (or soft-unavailable when client is null).
 * Shared by Portal customer search and Studio staff refresh.
 */
export async function executeEtsyRecommendationApiSearch(input: {
  client: EtsyClient | null;
  answers: EtsyRecommendationAnswers;
  requestId: string;
  logPrefix: string;
}): Promise<EtsyRecommendationApiSearchExecution> {
  if (!input.client) {
    logger.warn(`${input.logPrefix}.unavailable`, {
      requestId: input.requestId,
      reason: "missing_api_key",
    });
    return {
      listings: [],
      status: "unavailable",
    };
  }

  const focusedKeywords = buildEtsyRecommendationApiKeywords(input.answers);
  let keywordStrategy: "focused" | "fallback" = "focused";
  let apiKeywordsUsed = focusedKeywords;
  let { listings, rawCount } = await searchAndNormalize(input.client, focusedKeywords);

  if (listings.length === 0) {
    const fallbackKeywords = buildEtsyRecommendationApiKeywordsFallback(input.answers);
    if (fallbackKeywords !== focusedKeywords) {
      keywordStrategy = "fallback";
      apiKeywordsUsed = fallbackKeywords;
      const fallback = await searchAndNormalize(input.client, fallbackKeywords);
      listings = fallback.listings;
      rawCount = fallback.rawCount;
    }
  }

  logger.info(`${input.logPrefix}.completed`, {
    requestId: input.requestId,
    keywordStrategy,
    rawCount,
    normalizedCount: listings.length,
  });

  return {
    listings,
    status: listings.length === 0 ? "empty" : "ok",
    apiKeywordsUsed,
    keywordStrategy,
  };
}

/** Best-effort Admin write of last Open API snapshot (does not throw to callers). */
export async function persistEtsyRecommendationApiSearchSnapshot(input: {
  requestId: string;
  status: SearchEtsyRecommendationsStatus;
  listings: ReturnType<typeof normalizeEtsyListings>;
  apiKeywordsUsed?: string;
  keywordStrategy?: "focused" | "fallback";
}): Promise<void> {
  const payload: Record<string, unknown> = {
    searchedAt: FieldValue.serverTimestamp(),
    status: input.status,
    listings: input.listings,
  };
  if (input.apiKeywordsUsed) {
    payload.apiKeywordsUsed = input.apiKeywordsUsed;
  }
  if (input.keywordStrategy) {
    payload.keywordStrategy = input.keywordStrategy;
  }

  try {
    await adminDb.collection(ETSY_RECOMMENDATION_COLLECTION).doc(input.requestId).update({
      lastApiSearch: payload,
    });
  } catch (error) {
    logger.warn("etsy.api_search.snapshot_persist_failed", {
      requestId: input.requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

/** Reject client-supplied Open API overrides (Portal + staff callables). */
export function assertNoCustomEtsySearchParams(data: Record<string, unknown>): void {
  if (
    data.keywords != null ||
    data.query != null ||
    data.limit != null ||
    data.offset != null ||
    data.sort != null ||
    data.sort_on != null
  ) {
    throw new Error("Custom search parameters are not allowed.");
  }
}
