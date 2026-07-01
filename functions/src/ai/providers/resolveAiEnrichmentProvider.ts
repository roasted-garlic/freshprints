import type { AiEnrichmentProvider } from "./AiEnrichmentProvider";

import { logPipelineEvent } from "../../lib/pipelineLog";

import {
  DEFAULT_OPENAI_REASONING_EFFORT,
  DEFAULT_VISION_MODEL_ID,
  resolveOpenAiReasoningEffort,
  resolveEffectiveVisionModelId,
} from "../aiEnrichmentConfig";

import { developmentAiEnrichmentProvider } from "./developmentAiEnrichmentProvider";
import { createOpenAiVisionEnrichmentProvider } from "./openAiVisionEnrichmentProvider";
import { resolveProviderTarget } from "./resolveProviderTarget";

export function resolveAiEnrichmentProvider(
  openAiApiKey?: string,
  geminiApiKey?: string,
  configuredVisionModelId?: string,
  configuredReasoningEffort?: string,
  overrideVisionModelId?: string,
  overrideReasoningEffort?: string,
): AiEnrichmentProvider {
  const visionModelId = resolveEffectiveVisionModelId({
    configured: configuredVisionModelId,
    override: overrideVisionModelId,
  });
  const reasoningEffort = resolveOpenAiReasoningEffort(overrideReasoningEffort ?? configuredReasoningEffort);
  const providerTarget = resolveProviderTarget(visionModelId);

  if (providerTarget.providerId === "google") {
    if (geminiApiKey?.trim()) {
      logPipelineEvent("provider.selected", {
        providerId: "google",
        modelId: visionModelId,
        reasoningEffort: null,
      });

      return createOpenAiVisionEnrichmentProvider(geminiApiKey, visionModelId, reasoningEffort);
    }
  } else if (openAiApiKey?.trim()) {
    logPipelineEvent("provider.selected", {
      providerId: "openai",
      modelId: visionModelId,
      reasoningEffort,
    });

    return createOpenAiVisionEnrichmentProvider(openAiApiKey, visionModelId, reasoningEffort);
  }

  logPipelineEvent("provider.selected", {
    providerId: "development",
    modelId: DEFAULT_VISION_MODEL_ID,
    reasoningEffort: DEFAULT_OPENAI_REASONING_EFFORT,
  });

  return developmentAiEnrichmentProvider;
}
