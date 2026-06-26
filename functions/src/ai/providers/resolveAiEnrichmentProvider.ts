import type { AiEnrichmentProvider } from "./AiEnrichmentProvider";

import { logPipelineEvent } from "../../lib/pipelineLog";

import { DEFAULT_OPENAI_VISION_MODEL_ID, resolveOpenAiVisionModelId } from "../aiEnrichmentConfig";

import { developmentAiEnrichmentProvider } from "./developmentAiEnrichmentProvider";

import { createOpenAiVisionEnrichmentProvider } from "./openAiVisionEnrichmentProvider";



export function resolveAiEnrichmentProvider(

  openAiApiKey?: string,

  configuredVisionModelId?: string,

): AiEnrichmentProvider {

  const visionModelId = resolveOpenAiVisionModelId(configuredVisionModelId);



  if (openAiApiKey?.trim()) {

    logPipelineEvent("provider.selected", { providerId: "openai", modelId: visionModelId });

    return createOpenAiVisionEnrichmentProvider(openAiApiKey, visionModelId);

  }



  logPipelineEvent("provider.selected", {

    providerId: "development",

    modelId: DEFAULT_OPENAI_VISION_MODEL_ID,

  });

  return developmentAiEnrichmentProvider;

}


