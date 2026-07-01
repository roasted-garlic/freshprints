import type {
  AiEnrichmentPlaygroundImageContentType,
  AllowedVisionModelId,
  OpenAiReasoningEffort,
} from "../../constants/aiEnrichment.constants";

export type AiEnrichmentProviderId = "openai" | "google";

export interface AiEnrichmentPlaygroundRequest {
  imageBase64: string;
  imageContentType: AiEnrichmentPlaygroundImageContentType;
  prompt: string;
  reasoningEffort: OpenAiReasoningEffort;
  visionModelId: AllowedVisionModelId;
}

export interface AiEnrichmentPlaygroundResponse {
  elapsedMs: number;
  outputText: string;
  provider: AiEnrichmentProviderId;
  reasoningEffortApplied: OpenAiReasoningEffort | null;
  reasoningEffortRequested: OpenAiReasoningEffort;
  visionModelId: AllowedVisionModelId;
  version: string;
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
}
