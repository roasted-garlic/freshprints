import type { AiEnrichmentProvider } from "./AiEnrichmentProvider";

import {
  OPENAI_LUNA_REASONING_EFFORT,
  resolveVisionModelProviderId,
  visionModelRequiresReasoningEffort,
} from "../../../../packages/shared/src/constants/aiEnrichment.constants";
import { logPipelineEvent } from "../../lib/pipelineLog";

import { DEFAULT_VISION_MODEL_ID, resolveEffectiveVisionModelId } from "../aiEnrichmentConfig";

import { developmentAiEnrichmentProvider } from "./developmentAiEnrichmentProvider";
import { createChatCompletionsVisionEnrichmentProvider } from "./geminiVisionEnrichmentProvider";

export class MissingVisionProviderApiKeyError extends Error {
  readonly providerId: "google" | "openai";

  constructor(providerId: "google" | "openai") {
    const secretName = providerId === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
    super(
      `AI enrichment is unavailable because ${secretName} is not configured for this environment.`,
    );
    this.name = "MissingVisionProviderApiKeyError";
    this.providerId = providerId;
  }
}

export function resolveAiEnrichmentProvider(
  geminiApiKey?: string,
  configuredVisionModelId?: string,
  overrideVisionModelId?: string,
  openAiApiKey?: string,
): AiEnrichmentProvider {
  const visionModelId = resolveEffectiveVisionModelId({
    configured: configuredVisionModelId,
    override: overrideVisionModelId,
  });
  const providerId = resolveVisionModelProviderId(visionModelId) ?? "google";

  if (providerId === "openai") {
    if (!openAiApiKey?.trim()) {
      throw new MissingVisionProviderApiKeyError("openai");
    }

    logPipelineEvent("provider.selected", {
      providerId: "openai",
      modelId: visionModelId,
      reasoningEffort: visionModelRequiresReasoningEffort(visionModelId)
        ? OPENAI_LUNA_REASONING_EFFORT
        : null,
    });

    return createChatCompletionsVisionEnrichmentProvider(openAiApiKey, visionModelId, "openai");
  }

  if (geminiApiKey?.trim()) {
    logPipelineEvent("provider.selected", {
      providerId: "google",
      modelId: visionModelId,
    });

    return createChatCompletionsVisionEnrichmentProvider(geminiApiKey, visionModelId, "google");
  }

  logPipelineEvent("provider.selected", {
    providerId: "development",
    modelId: DEFAULT_VISION_MODEL_ID,
  });

  return developmentAiEnrichmentProvider;
}
