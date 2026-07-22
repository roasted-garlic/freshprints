import type {
  EtsyRecommendationAnswers,
  EtsyRecommendationListing,
} from "./etsyRecommendation.types";

export interface SubmitEtsyRecommendationRequestRequest {
  answers: EtsyRecommendationAnswers;
  /** When true, replace an existing active request for this customer. */
  confirmReplaceActive?: boolean;
}

export interface SubmitEtsyRecommendationRequestResponse {
  requestId: string;
  canonicalQuery: string;
  etsySearchUrl: string;
  replacedActive: boolean;
}

export interface EtsyRecommendationRequestIdRequest {
  requestId: string;
}

export interface EtsyRecommendationRequestIdResponse {
  requestId: string;
  status: "completed" | "cancelled";
}

export interface SearchEtsyRecommendationsRequest {
  requestId: string;
}

export interface GetEtsyRecommendationSearchQuotaRequest {
  requestId: string;
}

export interface GetEtsyRecommendationSearchQuotaResponse {
  requestId: string;
  previewQuota: EtsyRecommendationPreviewQuota;
}

export type SearchEtsyRecommendationsStatus = "ok" | "empty" | "unavailable";

/** In-app listing preview quota (Open API). Website Etsy links are not rate-limited. */
export interface EtsyRecommendationPreviewQuota {
  utcDay: string;
  customerUsed: number;
  customerLimit: number;
  customerRemaining: number;
  /** True when this account is exempt from the daily preview cap (QA / internal). */
  unlimited?: boolean;
}

export interface SearchEtsyRecommendationsResponse {
  requestId: string;
  canonicalQuery: string;
  etsySearchUrl: string;
  listings: EtsyRecommendationListing[];
  status: SearchEtsyRecommendationsStatus;
  previewQuota: EtsyRecommendationPreviewQuota;
  /** Keywords actually sent to Open API (focused or fallback). */
  apiKeywordsUsed?: string;
  keywordStrategy?: "focused" | "fallback";
}

/** Studio: fetch/refresh Open API results for any request status (ADR-FP-087o). */
export interface StaffSearchEtsyRecommendationApiResultsRequest {
  requestId: string;
}

export interface StaffSearchEtsyRecommendationApiResultsResponse {
  requestId: string;
  canonicalQuery: string;
  etsySearchUrl: string;
  listings: EtsyRecommendationListing[];
  status: SearchEtsyRecommendationsStatus;
  apiKeywordsUsed?: string;
  keywordStrategy?: "focused" | "fallback";
}

export type EtsyRecommendationSuggestionKind = "subject" | "style";

export interface AddEtsyRecommendationSuggestionRequest {
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  /** Subject search token; defaults to label. Ignored for style (uses label). */
  apiToken?: string;
  aliases?: string[];
}

export interface AddEtsyRecommendationSuggestionResponse {
  suggestionId: string;
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  apiToken: string;
  aliases: string[];
  labelKey: string;
  active: true;
}

export interface DeactivateEtsyRecommendationSuggestionRequest {
  suggestionId: string;
}

export interface DeactivateEtsyRecommendationSuggestionResponse {
  suggestionId: string;
  active: false;
}

export type EtsySuggestionRequestStatus = "pending" | "approved" | "rejected";

export interface SubmitEtsySuggestionRequestRequest {
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  apiToken?: string;
}

export interface SubmitEtsySuggestionRequestResponse {
  requestId: string;
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  labelKey: string;
  status: "pending";
  alreadyPending?: boolean;
}

export interface ResolveEtsySuggestionRequestRequest {
  requestId: string;
  /** Optional staff note when rejecting. */
  rejectReason?: string;
}

export interface ApproveEtsySuggestionRequestResponse {
  requestId: string;
  status: "approved";
  suggestionId: string;
  alreadyExisted?: boolean;
}

export interface RejectEtsySuggestionRequestResponse {
  requestId: string;
  status: "rejected";
}
