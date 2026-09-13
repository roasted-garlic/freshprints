import {
  resolveVisionModelProviderId,
  type AiEnrichmentBackendProviderId,
} from "../../../packages/shared/src/constants/aiEnrichment.constants";
import { resolveProviderTarget, type ProviderTarget } from "./providers/resolveProviderTarget";

export interface VisionProviderApiKeys {
  geminiApiKey?: string;
  openAiApiKey?: string;
}

export function resolveVisionProviderCredentials(
  visionModelId: string,
  keys: VisionProviderApiKeys,
): { providerId: AiEnrichmentBackendProviderId; providerTarget: ProviderTarget; apiKey: string } {
  const providerId = resolveVisionModelProviderId(visionModelId) ?? "google";
  const providerTarget = resolveProviderTarget(providerId);
  const apiKey =
    providerId === "openai" ? keys.openAiApiKey?.trim() ?? "" : keys.geminiApiKey?.trim() ?? "";

  if (!apiKey) {
    const secretName = providerId === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
    throw new Error(
      `The AI playground is unavailable because ${secretName} is not configured for this environment.`,
    );
  }

  return { providerId, providerTarget, apiKey };
}
