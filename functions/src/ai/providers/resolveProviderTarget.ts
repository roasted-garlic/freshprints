import type { AiEnrichmentProviderId } from "../../../../shared/types/ai/aiEnrichmentPlayground.types";

export const GEMINI_CHAT_COMPLETIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";

export interface ProviderTarget {
  providerId: AiEnrichmentProviderId;
  baseUrl: string;
  supportsReasoningEffort: boolean;
}

export function resolveProviderTarget(modelId: string): ProviderTarget {
  if (modelId.startsWith("gemini-")) {
    return {
      providerId: "google",
      baseUrl: GEMINI_CHAT_COMPLETIONS_URL,
      supportsReasoningEffort: false,
    };
  }

  return {
    providerId: "openai",
    baseUrl: OPENAI_CHAT_COMPLETIONS_URL,
    supportsReasoningEffort: true,
  };
}
