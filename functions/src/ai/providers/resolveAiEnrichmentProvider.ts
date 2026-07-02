import type { AiEnrichmentProvider } from "./AiEnrichmentProvider";

import { logPipelineEvent } from "../../lib/pipelineLog";

import { DEFAULT_VISION_MODEL_ID, resolveEffectiveVisionModelId } from "../aiEnrichmentConfig";

import { developmentAiEnrichmentProvider } from "./developmentAiEnrichmentProvider";
import { createGeminiVisionEnrichmentProvider } from "./geminiVisionEnrichmentProvider";

export function resolveAiEnrichmentProvider(
  geminiApiKey?: string,
  configuredVisionModelId?: string,
  overrideVisionModelId?: string,
): AiEnrichmentProvider {
  const visionModelId = resolveEffectiveVisionModelId({
    configured: configuredVisionModelId,
    override: overrideVisionModelId,
  });

  if (geminiApiKey?.trim()) {
    logPipelineEvent("provider.selected", {
      providerId: "google",
      modelId: visionModelId,
    });

    return createGeminiVisionEnrichmentProvider(geminiApiKey, visionModelId);
  }

  logPipelineEvent("provider.selected", {
    providerId: "development",
    modelId: DEFAULT_VISION_MODEL_ID,
  });

  return developmentAiEnrichmentProvider;
}
