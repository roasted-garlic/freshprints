import type {
  AiEnrichmentPlaygroundImageContentType,
  AllowedVisionModelId,
} from "../../constants/aiEnrichment.constants";

export type AiEnrichmentProviderId = "google" | "development";

export interface AiEnrichmentPlaygroundRequest {
  imageBase64: string;
  imageContentType: AiEnrichmentPlaygroundImageContentType;
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
