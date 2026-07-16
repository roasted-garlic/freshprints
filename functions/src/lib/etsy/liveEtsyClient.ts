import type {
  EtsyClient,
  EtsyRawListing,
  EtsySearchParams,
  EtsySearchResult,
} from "./etsyClient.types";
import {
  ETSY_RECOMMENDATION_SEARCH_CURRENCY,
  ETSY_RECOMMENDATION_SEARCH_MAX_PRICE_USD,
  ETSY_RECOMMENDATION_SEARCH_MIN_PRICE_USD,
} from "../../../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";

export class EtsyHttpError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(status: number, message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "EtsyHttpError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Build batch listings query. Etsy Open API expects a single comma-separated
 * `listing_ids` value — not repeated query params (ADR-FP-087 / ADR-FP-087b).
 */
export function buildEtsyBatchListingsQuery(listingIds: number[]): string {
  const query = new URLSearchParams({
    listing_ids: listingIds.join(","),
    includes: "Images,Shop",
  });
  return query.toString();
}

export function buildEtsyActiveListingsSearchQuery(params: EtsySearchParams): string {
  const query = new URLSearchParams({
    keywords: params.keywords,
    limit: String(params.limit),
    sort_on: params.sortOn,
    min_price: String(params.minPrice ?? ETSY_RECOMMENDATION_SEARCH_MIN_PRICE_USD),
    max_price: String(params.maxPrice ?? ETSY_RECOMMENDATION_SEARCH_MAX_PRICE_USD),
    currency: params.currency ?? ETSY_RECOMMENDATION_SEARCH_CURRENCY,
  });
  return query.toString();
}

function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) {
    return null;
  }
  const asInt = Number.parseInt(headerValue, 10);
  if (Number.isFinite(asInt) && asInt >= 0) {
    return asInt;
  }
  return null;
}

export function createLiveEtsyClient(apiKey: string): EtsyClient {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("Etsy API key is not configured.");
  }

  async function etsyGet(pathWithQuery: string): Promise<unknown> {
    const response = await fetch(`https://openapi.etsy.com/v3${pathWithQuery}`, {
      method: "GET",
      headers: {
        "x-api-key": key,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      throw new EtsyHttpError(
        response.status,
        `Etsy request failed with status ${response.status}.`,
        retryAfter,
      );
    }

    return response.json();
  }

  return {
    async searchActiveListings(params: EtsySearchParams): Promise<EtsySearchResult> {
      const requestPath = `/application/listings/active?${buildEtsyActiveListingsSearchQuery(params)}`;
      const body = (await etsyGet(requestPath)) as {
        results?: EtsyRawListing[];
        count?: unknown;
      };
      const results = Array.isArray(body.results) ? body.results : [];
      const reported = Number(body.count);
      return {
        results,
        requestPath,
        etsyReportedCount: Number.isFinite(reported) ? reported : null,
      };
    },

    async hydrateListings(listingIds: number[]): Promise<EtsyRawListing[]> {
      if (listingIds.length === 0) {
        return [];
      }
      const body = (await etsyGet(
        `/application/listings/batch?${buildEtsyBatchListingsQuery(listingIds)}`,
      )) as {
        results?: EtsyRawListing[];
      };
      return Array.isArray(body.results) ? body.results : [];
    },
  };
}
