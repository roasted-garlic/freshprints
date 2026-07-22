import type {
  EtsyRecommendationOccasionId,
  EtsyRecommendationSubjectId,
} from "../../constants/etsyRecommendation/etsyRecommendation.constants";
import type {
  EtsyRecommendationRoute,
  EtsyRecommendationSchemaVersion,
  EtsyRecommendationStatus,
} from "./etsyRecommendation.enums";

/**
 * Hybrid free-text + legacy curated answers for Etsy recommendation search.
 * Website search URLs use canonical/broader builders; Open API uses focused apiKeywords.
 */
export interface EtsyRecommendationAnswers {
  /** Primary free-text subject (1–80 chars). Required for new submits. */
  subjectText?: string;
  /** Legacy curated subject ids (still accepted for rebuild). */
  subjects?: EtsyRecommendationSubjectId[];
  /**
   * Optional tone/style tokens for the Etsy search query (0–2).
   * New submits use one free-text entry; legacy docs may have curated labels.
   */
  styles?: string[];
  /** Legacy occasion ids (optional; holidays also live in suggest dictionary). */
  occasions?: EtsyRecommendationOccasionId[];
  /** Optional exact saying / slogan (short). */
  wording?: string;
}

/**
 * Firestore document shape for `etsyRecommendationRequests`.
 */
export interface EtsyRecommendationRequest {
  id: string;
  schemaVersion: EtsyRecommendationSchemaVersion;
  customerId: string;
  customerUid: string;
  route: EtsyRecommendationRoute;
  status: EtsyRecommendationStatus;
  answers: EtsyRecommendationAnswers;
  /** Full primary query used for the Etsy website search URL `q` param. */
  canonicalQuery: string;
  etsySearchUrl: string;
  /**
   * Last Open API listing search result (Portal search or staff refresh).
   * Absent on legacy docs until the next search/fetch.
   */
  lastApiSearch?: EtsyRecommendationApiSearchSnapshot;
  createdAt: unknown;
  updatedAt: unknown;
}

/** Normalized listing card from Etsy Open API. */
export interface EtsyRecommendationListing {
  listingId: number;
  title: string;
  listingUrl: string;
  imageUrl: string | null;
  shopName: string | null;
  priceAmount: string | null;
  currencyCode: string | null;
}

/** Last Open API search snapshot persisted on the request (Admin SDK; ADR-FP-087o). */
export interface EtsyRecommendationApiSearchSnapshot {
  /** Server timestamp when this snapshot was written. */
  searchedAt: unknown;
  status: "ok" | "empty" | "unavailable";
  listings: EtsyRecommendationListing[];
  /** Keywords actually sent to Open API (focused or fallback). */
  apiKeywordsUsed?: string;
  keywordStrategy?: "focused" | "fallback";
}
