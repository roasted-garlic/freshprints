import type { EtsyRecommendationListing } from "../../../../packages/shared/src/types/etsyRecommendation/etsyRecommendation.types";

export interface EtsySearchParams {
  keywords: string;
  limit: number;
  sortOn: "score";
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
}

export interface EtsyRawListing {
  listing_id?: unknown;
  title?: unknown;
  url?: unknown;
  price?: unknown;
  images?: unknown;
  shop?: unknown;
}

export interface EtsySearchResult {
  results: EtsyRawListing[];
  requestPath: string;
  etsyReportedCount: number | null;
}

export interface EtsyClient {
  searchActiveListings(params: EtsySearchParams): Promise<EtsySearchResult>;
  hydrateListings(listingIds: number[]): Promise<EtsyRawListing[]>;
}

export type { EtsyRecommendationListing };
