import type { AiEnrichmentInput, AiEnrichmentProvider, AiEnrichmentResult } from "./AiEnrichmentProvider";

import { OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION } from "../catalogTitleRules";
import {
  DEFAULT_OPENAI_REASONING_EFFORT,
  OPENAI_VISION_MAX_COMPLETION_TOKENS,
  OPENAI_VISION_REASONING_EFFORT_FALLBACK,
  type AllowedOpenAiReasoningEffort,
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
  type OpenAiChatCompletionPayload,
  assertOpenAiCompletionHasContent,
  extractOpenAiCompletionChoice,
  extractOpenAiCompletionUsage,
} from "../openAiVisionCompletion";
import { OpenAiRequestError, fetchOpenAiWithRetry } from "../openAiRetry";
import { logPipelineEvent } from "../../lib/pipelineLog";
import { developmentAiEnrichmentProvider } from "./developmentAiEnrichmentProvider";
import {
  OPENAI_CHAT_COMPLETIONS_URL,
  resolveProviderTarget,
  type ProviderTarget,
} from "./resolveProviderTarget";

type ReasoningEffort = AllowedOpenAiReasoningEffort;

interface VisionRequestOptions {
  maxCompletionTokens: number;
  reasoningEffort: ReasoningEffort;
  supportsReasoningEffort: boolean;
}

function isUnsupportedReasoningEffortError(error: unknown): boolean {
  if (!(error instanceof OpenAiRequestError) || error.status !== 400) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("reasoning_effort") || message.includes("reasoning effort");
}

export function buildVisionRequestBody(
  visionModelId: string,
  userPromptText: string,
  base64Image: string,
  imageContentType: string,
  options: VisionRequestOptions,
  systemPrompt: string,
): string {
  // No `response_format: json_object` — matches the Settings AI Playground request shape. The
  // model returns instruction-only JSON and the server parses it tolerantly.
  // reasoning_effort is OpenAI-only; omit for providers that don't support it (e.g. Gemini).
  return JSON.stringify({
    model: visionModelId,
    max_completion_tokens: options.maxCompletionTokens,
    ...(options.supportsReasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
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

async function postOpenAiVisionCompletion(
  apiKey: string,
  baseUrl: string,
  visionModelId: string,
  userPromptText: string,
  base64Image: string,
  imageContentType: string,
  options: VisionRequestOptions,
  systemPrompt: string,
): Promise<OpenAiChatCompletionPayload> {
  const response = await fetchOpenAiWithRetry(
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
        options,
        systemPrompt,
      ),
    },
    { maxRetries: 2, baseDelayMs: 2000, modelId: visionModelId },
  );

  return (await response.json()) as OpenAiChatCompletionPayload;
}

async function requestOpenAiVisionCompletion(
  apiKey: string,
  baseUrl: string,
  visionModelId: string,
  userPromptText: string,
  base64Image: string,
  imageContentType: string,
  options: VisionRequestOptions,
  systemPrompt: string,
  logContext: { designId: string; providerId: string },
): Promise<OpenAiChatCompletionPayload> {
  const requestStartedAtMs = Date.now();

  logPipelineEvent("openai.request.started", {
    designId: logContext.designId,
    providerId: logContext.providerId,
    model: visionModelId,
    reasoningEffort: options.supportsReasoningEffort ? options.reasoningEffort : null,
    maxCompletionTokens: options.maxCompletionTokens,
    loggedAtMs: requestStartedAtMs,
  });

  try {
    const payload = await postOpenAiVisionCompletion(
      apiKey,
      baseUrl,
      visionModelId,
      userPromptText,
      base64Image,
      imageContentType,
      options,
      systemPrompt,
    );
    const durationMs = Date.now() - requestStartedAtMs;
    const choice = extractOpenAiCompletionChoice(payload);
    const usage = extractOpenAiCompletionUsage(payload);

    if (choice.content) {
      logPipelineEvent("openai.completion.usage", {
        designId: logContext.designId,
        providerId: logContext.providerId,
        model: typeof payload.model === "string" ? payload.model : visionModelId,
        reasoningEffort: options.supportsReasoningEffort ? options.reasoningEffort : null,
        maxCompletionTokens: options.maxCompletionTokens,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        reasoningTokens: usage.reasoningTokens,
        durationMs,
      });
    } else {
      logPipelineEvent("openai.empty_content", {
        designId: logContext.designId,
        providerId: logContext.providerId,
        model: typeof payload.model === "string" ? payload.model : visionModelId,
        reasoningEffort: options.supportsReasoningEffort ? options.reasoningEffort : null,
        finishReason: choice.finishReason,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        reasoningTokens: usage.reasoningTokens,
        maxCompletionTokens: options.maxCompletionTokens,
        durationMs,
      });
    }

    return payload;
  } catch (error) {
    if (
      options.supportsReasoningEffort &&
      options.reasoningEffort !== OPENAI_VISION_REASONING_EFFORT_FALLBACK &&
      isUnsupportedReasoningEffortError(error)
    ) {
      return requestOpenAiVisionCompletion(
        apiKey,
        baseUrl,
        visionModelId,
        userPromptText,
        base64Image,
        imageContentType,
        {
          ...options,
          reasoningEffort: OPENAI_VISION_REASONING_EFFORT_FALLBACK,
        },
        systemPrompt,
        logContext,
      );
    }

    throw error;
  }
}

async function callOpenAiVision(
  apiKey: string,
  providerTarget: ProviderTarget,
  visionModelId: string,
  input: AiEnrichmentInput,
  reasoningEffort: AllowedOpenAiReasoningEffort,
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
  });

  const initialOptions: VisionRequestOptions = {
    maxCompletionTokens: OPENAI_VISION_MAX_COMPLETION_TOKENS,
    reasoningEffort,
    supportsReasoningEffort: providerTarget.supportsReasoningEffort,
  };

  // Single call, playground-style: one lightweight request, no `response_format`, no automatic
  // empty-output or quality retries. If the result is not what staff want, they re-run manually
  // from AI Review (optionally with a different model). The reasoning-effort 400 fallback inside
  // requestOpenAiVisionCompletion and the transient 429/5xx network retry in fetchOpenAiWithRetry
  // are kept; neither fires on a normal successful run.
  const payload = await requestOpenAiVisionCompletion(
    apiKey,
    providerTarget.baseUrl,
    visionModelId,
    userPromptText,
    base64Image,
    imageContentType,
    initialOptions,
    systemPrompt,
    { designId: input.designId, providerId: providerTarget.providerId },
  );

  const content = assertOpenAiCompletionHasContent(
    payload,
    visionModelId,
    initialOptions.maxCompletionTokens,
  );

  const usage = extractOpenAiCompletionUsage(payload);
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

export function createOpenAiVisionEnrichmentProvider(
  apiKey: string,
  visionModelId: string,
  reasoningEffort: AllowedOpenAiReasoningEffort = DEFAULT_OPENAI_REASONING_EFFORT,
): AiEnrichmentProvider {
  const providerTarget = resolveProviderTarget(visionModelId);

  return {
    providerId: providerTarget.providerId,
    modelId: visionModelId,
    promptVersion: OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,

    async enrichDesign(input: AiEnrichmentInput): Promise<AiEnrichmentResult> {
      if (!apiKey.trim()) {
        return developmentAiEnrichmentProvider.enrichDesign(input);
      }

      return callOpenAiVision(apiKey, providerTarget, visionModelId, input, reasoningEffort);
    },
  };
}

export { OPENAI_CHAT_COMPLETIONS_URL };
