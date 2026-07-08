import type {
  AiEnrichmentPlaygroundImageContentType,
  AllowedVisionModelId,
} from "../../constants/aiEnrichment.constants";

export type AiEnrichmentProviderId = "google" | "development";

export interface AiEnrichmentPlaygroundRequest {
  /** Optional — the playground supports text-only prompt tests with no image. */
  imageBase64?: string;
  imageContentType?: AiEnrichmentPlaygroundImageContentType;
  prompt: string;
  visionModelId: AllowedVisionModelId;
}

export interface AiEnrichmentPlaygroundResponse {
  elapsedMs: number;
  outputText: string;
  provider: AiEnrichmentProviderId;
  visionModelId: AllowedVisionModelId;
  version: string;
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
}

/** A single approved-tag entry in the compact shortlist shown to the Playground tag reranker. */
export interface AiEnrichmentPlaygroundApprovedTagCandidate {
  name: string;
  matchedBy: string[];
  reason: string;
}

export interface AiEnrichmentTagRerankPlaygroundRequest {
  /** Raw text output from a prior playground vision-call result — re-parsed here. */
  firstResponseOutputText: string;
  visionModelId: AllowedVisionModelId;
  /**
   * Optional one-off override for the reranker's "Rules" instructional text — not persisted, used
   * only for this playground call. Falls back to the live (Settings-saved or default) reranker
   * prompt when omitted.
   */
  promptTemplate?: string;
}

export interface AiEnrichmentTagRerankPlaygroundResponse {
  elapsedMs: number;
  outputText: string;
  approvedTagCandidates: AiEnrichmentPlaygroundApprovedTagCandidate[];
  discardedTags: string[];
  uncoveredConcepts: string[];
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  version: string;
}
