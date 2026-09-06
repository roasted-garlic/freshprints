import type {
  AiEnrichmentPlaygroundImageContentType,
  AllowedVisionModelId,
} from "../../constants/aiEnrichment.constants";
import type { VisualContextProfile } from "../catalog/visualContext.types";
import type { SemanticReviewResult } from "../catalog/semanticReview.types";

export type AiEnrichmentProviderId = "google" | "openai" | "development";

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

export interface AiEnrichmentSemanticReviewPlaygroundRequest {
  visualContextProfile: VisualContextProfile;
  title: string;
  description: string;
  categoryName?: string;
  originalSmartProfile: Record<string, string[]>;
  effectiveSmartProfile: Record<string, string[]>;
  blockers: string[];
  visionModelId: AllowedVisionModelId;
  debugSemanticReviewResponse?: boolean;
}

export interface AiEnrichmentSemanticReviewPlaygroundResponse {
  result: SemanticReviewResult;
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  provider: AiEnrichmentProviderId;
  model: string;
  promptVersion: string;
}
