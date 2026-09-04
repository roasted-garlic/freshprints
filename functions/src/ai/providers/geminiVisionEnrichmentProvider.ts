import type { AiEnrichmentInput, AiEnrichmentProvider, AiEnrichmentResult } from "./AiEnrichmentProvider";

import { CATALOG_ENRICHMENT_PROMPT_VERSION } from "../catalogTitleRules";
import {
  VISION_MAX_COMPLETION_TOKENS,
  VISION_REQUEST_BASE_DELAY_MS,
  VISION_REQUEST_MAX_RETRIES,
} from "../aiEnrichmentConfig";
import {
  buildSimpleCatalogEnrichmentSystemPrompt,
  buildSimpleCatalogEnrichmentUserPrompt,
} from "../simpleCatalogEnrichmentPrompt";
import {
  buildSimpleCatalogEnrichmentResult,
  extractJsonObject,
  normalizeSimpleCatalogEnrichment,
} from "../simpleCatalogEnrichmentResponse";
import {
  type VisionChatCompletionPayload,
  assertVisionCompletionHasContent,
  extractVisionCompletionUsage,
} from "../visionCompletion";
import { fetchVisionWithRetry } from "../visionRequestRetry";
import { logPipelineEvent } from "../../lib/pipelineLog";
import { developmentAiEnrichmentProvider } from "./developmentAiEnrichmentProvider";
import { GEMINI_CHAT_COMPLETIONS_URL, resolveProviderTarget, type ProviderTarget } from "./resolveProviderTarget";

export function buildVisionRequestBody(
  visionModelId: string,
  userPromptText: string,
  base64Image: string,
  imageContentType: string,
  maxCompletionTokens: number,
  systemPrompt: string,
): string {
  // No `response_format: json_object` — matches the Settings AI Playground request shape. The
  // model returns instruction-only JSON and the server parses it tolerantly.
  return JSON.stringify({
    model: visionModelId,
    max_completion_tokens: maxCompletionTokens,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userPromptText,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageContentType};base64,${base64Image}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });
}

async function postVisionCompletion(
  apiKey: string,
  baseUrl: string,
  visionModelId: string,
  userPromptText: string,
  base64Image: string,
  imageContentType: string,
  maxCompletionTokens: number,
  systemPrompt: string,
): Promise<VisionChatCompletionPayload> {
  const response = await fetchVisionWithRetry(
    baseUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: buildVisionRequestBody(
        visionModelId,
        userPromptText,
        base64Image,
        imageContentType,
        maxCompletionTokens,
        systemPrompt,
      ),
    },
    {
      maxRetries: VISION_REQUEST_MAX_RETRIES,
      baseDelayMs: VISION_REQUEST_BASE_DELAY_MS,
      modelId: visionModelId,
      onRetry: async () => {
        const { incrementCatalogAutomationHealth } = await import("../catalogAutomationHealth");
        await incrementCatalogAutomationHealth({ retries: 1 });
      },
    },
  );

  return (await response.json()) as VisionChatCompletionPayload;
}

async function requestVisionCompletion(
  apiKey: string,
  baseUrl: string,
  visionModelId: string,
  userPromptText: string,
  base64Image: string,
  imageContentType: string,
  maxCompletionTokens: number,
  systemPrompt: string,
  logContext: { designId: string; providerId: string },
): Promise<VisionChatCompletionPayload> {
  const requestStartedAtMs = Date.now();

  logPipelineEvent("vision.request.started", {
    designId: logContext.designId,
    providerId: logContext.providerId,
    model: visionModelId,
    maxCompletionTokens,
    loggedAtMs: requestStartedAtMs,
  });

  const payload = await postVisionCompletion(
    apiKey,
    baseUrl,
    visionModelId,
    userPromptText,
    base64Image,
    imageContentType,
    maxCompletionTokens,
    systemPrompt,
  );
  const durationMs = Date.now() - requestStartedAtMs;
  const usage = extractVisionCompletionUsage(payload);
  const content = payload.choices?.[0]?.message?.content;

  if (content) {
    logPipelineEvent("vision.completion.usage", {
      designId: logContext.designId,
      providerId: logContext.providerId,
      model: typeof payload.model === "string" ? payload.model : visionModelId,
      maxCompletionTokens,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      durationMs,
    });
  } else {
    logPipelineEvent("vision.empty_content", {
      designId: logContext.designId,
      providerId: logContext.providerId,
      model: typeof payload.model === "string" ? payload.model : visionModelId,
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      maxCompletionTokens,
      durationMs,
    });
  }

  return payload;
}

async function callVision(
  apiKey: string,
  providerTarget: ProviderTarget,
  visionModelId: string,
  input: AiEnrichmentInput,
): Promise<AiEnrichmentResult> {
  const base64Image = input.previewBytes.toString("base64");
  const imageContentType = input.previewContentType ?? "image/webp";
  const systemPrompt = buildSimpleCatalogEnrichmentSystemPrompt();
  const userPromptText = buildSimpleCatalogEnrichmentUserPrompt({
    approvedCategories: input.categoryOptions,
    approvedCategoryNames: input.categoryNames,
    approvedTags: input.approvedTags,
    approvedTagNames: input.approvedTagNames,
    effectiveTagExclusions: input.effectiveTagExclusions,
    promptTemplate: input.promptTemplate,
    smartProfileVocab: input.smartProfileVocab,
  });

  // Single call, playground-style: one lightweight request, no `response_format`, no automatic
  // empty-output or quality retries. If the result is not what staff want, they re-run manually
  // from AI Review (optionally with a different model). Only the transient 429/5xx network retry
  // in fetchVisionWithRetry is kept; it does not fire on a normal successful run.
  const payload = await requestVisionCompletion(
    apiKey,
    providerTarget.baseUrl,
    visionModelId,
    userPromptText,
    base64Image,
    imageContentType,
    VISION_MAX_COMPLETION_TOKENS,
    systemPrompt,
    { designId: input.designId, providerId: providerTarget.providerId },
  );

  const content = assertVisionCompletionHasContent(payload);

  const usage = extractVisionCompletionUsage(payload);
  const raw = extractJsonObject(content);
  const parsed = normalizeSimpleCatalogEnrichment(raw, input.effectiveTagExclusions);

  return buildSimpleCatalogEnrichmentResult({
    parsed,
    enrichmentInput: input,
    modelId: visionModelId,
    providerId: providerTarget.providerId,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
  });
}

export function createGeminiVisionEnrichmentProvider(
  apiKey: string,
  visionModelId: string,
): AiEnrichmentProvider {
  const providerTarget = resolveProviderTarget();

  return {
    providerId: providerTarget.providerId,
    modelId: visionModelId,
    promptVersion: CATALOG_ENRICHMENT_PROMPT_VERSION,

    async enrichDesign(input: AiEnrichmentInput): Promise<AiEnrichmentResult> {
      if (!apiKey.trim()) {
        return developmentAiEnrichmentProvider.enrichDesign(input);
      }

      return callVision(apiKey, providerTarget, visionModelId, input);
    },
  };
}

export { GEMINI_CHAT_COMPLETIONS_URL };
