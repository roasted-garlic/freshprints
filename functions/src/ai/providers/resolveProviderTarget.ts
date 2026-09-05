import type { AiEnrichmentBackendProviderId } from "../../../../packages/shared/src/constants/aiEnrichment.constants";

export const GEMINI_CHAT_COMPLETIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

export type ProviderTargetId = AiEnrichmentBackendProviderId;

export interface ProviderTarget {
  providerId: ProviderTargetId;
  baseUrl: string;
}

/**
 * Resolve Chat Completions endpoint from explicit provider id.
 * Never infer from model-name prefixes.
 */
export function resolveProviderTarget(providerId: ProviderTargetId = "google"): ProviderTarget {
  if (providerId === "openai") {
    return {
      providerId: "openai",
      baseUrl: OPENAI_CHAT_COMPLETIONS_URL,
    };
  }

  return {
    providerId: "google",
    baseUrl: GEMINI_CHAT_COMPLETIONS_URL,
  };
}
