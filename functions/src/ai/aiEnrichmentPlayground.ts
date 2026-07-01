import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "../../../shared/types/ai/aiEnrichmentPlayground.types";
import {
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
  AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES,
  AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH,
  AI_ENRICHMENT_PLAYGROUND_VERSION,
  OPENAI_REASONING_EFFORT_FALLBACK,
  estimateVisionCostUsd,
} from "../../../shared/constants/aiEnrichment.constants";
import { logPipelineEvent } from "../lib/pipelineLog";
import { prepareAiAnalysisImage } from "./prepareAiAnalysisImage";
import {
  OPENAI_VISION_MAX_COMPLETION_TOKENS,
  resolveOpenAiReasoningEffort,
  resolveVisionModelId,
  type AllowedOpenAiReasoningEffort,
  type AllowedVisionModelId,
} from "./aiEnrichmentConfig";
import {
  type OpenAiChatCompletionPayload,
  assertOpenAiCompletionHasContent,
  extractOpenAiCompletionUsage,
} from "./openAiVisionCompletion";
import { OpenAiRequestError, fetchOpenAiWithRetry } from "./openAiRetry";
import {
  loadCachedActiveCategories,
  loadCachedAiEnrichmentSettings,
  loadCachedApprovedTags,
} from "./aiEnrichmentRuntimeCache";
import {
  buildSimpleCatalogEnrichmentSystemPrompt,
  buildSimpleCatalogEnrichmentUserPrompt,
} from "./simpleCatalogEnrichmentPrompt";
import { resolveProviderTarget } from "./providers/resolveProviderTarget";

const ALLOWED_PLAYGROUND_IMAGE_CONTENT_TYPES = new Set<string>(
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
);

interface PreparedAiEnrichmentPlaygroundRequest {
  imageBytes: Buffer;
  imageContentType: (typeof AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES)[number];
  prompt: string;
  reasoningEffort: AllowedOpenAiReasoningEffort;
  visionModelId: AllowedVisionModelId;
}

interface PlaygroundCompletionResult {
  payload: OpenAiChatCompletionPayload;
  reasoningEffortApplied: AllowedOpenAiReasoningEffort | null;
}

function isUnsupportedReasoningEffortError(error: unknown): boolean {
  if (!(error instanceof OpenAiRequestError) || error.status !== 400) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("reasoning_effort") || message.includes("reasoning effort");
}

function normalizeBase64(input: string): string {
  return input.replace(/\s+/g, "");
}

function decodeBase64Image(rawBase64: string): Buffer {
  const normalized = normalizeBase64(rawBase64.trim());

  if (!normalized) {
    throw new Error("An image is required.");
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    throw new Error("Image data is invalid.");
  }

  const imageBytes = Buffer.from(normalized, "base64");

  if (!imageBytes.length) {
    throw new Error("Image data is invalid.");
  }

  if (
    normalizeBase64(imageBytes.toString("base64")).replace(/=+$/, "") !==
    normalized.replace(/=+$/, "")
  ) {
    throw new Error("Image data is invalid.");
  }

  if (imageBytes.length > AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES) {
    throw new Error("Image must be 50 MB or smaller.");
  }

  return imageBytes;
}

export function validateAiEnrichmentPlaygroundRequest(
  input: unknown,
): PreparedAiEnrichmentPlaygroundRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Playground request data is required.");
  }

  const imageBase64 =
    "imageBase64" in input && typeof input.imageBase64 === "string" ? input.imageBase64 : "";
  const imageContentType =
    "imageContentType" in input && typeof input.imageContentType === "string"
      ? input.imageContentType.trim().toLowerCase()
      : "";
  const prompt = "prompt" in input && typeof input.prompt === "string" ? input.prompt.trim() : "";
  const requestedReasoningEffort =
    "reasoningEffort" in input && typeof input.reasoningEffort === "string"
      ? input.reasoningEffort.trim()
      : "";
  const requestedVisionModelId =
    "visionModelId" in input && typeof input.visionModelId === "string"
      ? input.visionModelId.trim()
      : "";

  if (!ALLOWED_PLAYGROUND_IMAGE_CONTENT_TYPES.has(imageContentType)) {
    throw new Error("Playground image must be PNG, JPEG, or WebP.");
  }

  if (!prompt) {
    throw new Error("A prompt is required.");
  }

  if (prompt.length > AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt must be ${AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`);
  }

  const reasoningEffort = resolveOpenAiReasoningEffort(requestedReasoningEffort);
  const visionModelId = resolveVisionModelId(requestedVisionModelId);

  if (reasoningEffort !== requestedReasoningEffort) {
    throw new Error("The selected reasoning effort is not allowed.");
  }

  if (visionModelId !== requestedVisionModelId) {
    throw new Error("The selected vision model is not allowed.");
  }

  return {
    imageBytes: decodeBase64Image(imageBase64),
    imageContentType: imageContentType as (typeof AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES)[number],
    prompt,
    reasoningEffort,
    visionModelId,
  };
}

export function buildAiEnrichmentPlaygroundRequestBody(
  input: PreparedAiEnrichmentPlaygroundRequest,
  base64Image: string,
  imageContentType: string,
  expandedPrompt: string,
  systemPrompt: string,
  supportsReasoningEffort: boolean,
  reasoningEffort: AllowedOpenAiReasoningEffort,
): string {
  return JSON.stringify({
    model: input.visionModelId,
    max_completion_tokens: OPENAI_VISION_MAX_COMPLETION_TOKENS,
    ...(supportsReasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
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
            text: expandedPrompt,
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

async function requestPlaygroundCompletion(
  apiKey: string,
  baseUrl: string,
  supportsReasoningEffort: boolean,
  input: PreparedAiEnrichmentPlaygroundRequest,
  base64Image: string,
  imageContentType: string,
  expandedPrompt: string,
  systemPrompt: string,
  reasoningEffort: AllowedOpenAiReasoningEffort,
): Promise<PlaygroundCompletionResult> {
  try {
    const response = await fetchOpenAiWithRetry(
      baseUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: buildAiEnrichmentPlaygroundRequestBody(
          { ...input, reasoningEffort },
          base64Image,
          imageContentType,
          expandedPrompt,
          systemPrompt,
          supportsReasoningEffort,
          reasoningEffort,
        ),
      },
      { maxRetries: 2, baseDelayMs: 2000, modelId: input.visionModelId },
    );

    return {
      payload: (await response.json()) as OpenAiChatCompletionPayload,
      reasoningEffortApplied: supportsReasoningEffort ? reasoningEffort : null,
    };
  } catch (error) {
    if (
      supportsReasoningEffort &&
      reasoningEffort !== OPENAI_REASONING_EFFORT_FALLBACK &&
      isUnsupportedReasoningEffortError(error)
    ) {
      return requestPlaygroundCompletion(
        apiKey,
        baseUrl,
        supportsReasoningEffort,
        input,
        base64Image,
        imageContentType,
        expandedPrompt,
        systemPrompt,
        OPENAI_REASONING_EFFORT_FALLBACK,
      );
    }

    throw error;
  }
}

export async function runAiEnrichmentPlayground(
  openAiApiKey: string,
  geminiApiKey: string,
  request: AiEnrichmentPlaygroundRequest,
): Promise<AiEnrichmentPlaygroundResponse> {
  const validatedRequest = validateAiEnrichmentPlaygroundRequest(request);
  const providerTarget = resolveProviderTarget(validatedRequest.visionModelId);

  const apiKey =
    providerTarget.providerId === "google" ? geminiApiKey : openAiApiKey;

  if (!apiKey.trim()) {
    const providerName = providerTarget.providerId === "google" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
    throw new Error(
      `The AI playground is unavailable because ${providerName} is not configured for this environment.`,
    );
  }

  const [preparedImage, categories, approvedTags, enrichmentSettings] = await Promise.all([
    prepareAiAnalysisImage(validatedRequest.imageBytes),
    loadCachedActiveCategories(),
    loadCachedApprovedTags(),
    loadCachedAiEnrichmentSettings(),
  ]);

  const expandedPrompt = buildSimpleCatalogEnrichmentUserPrompt({
    approvedCategories: categories.categories,
    approvedCategoryNames: categories.names,
    approvedTags,
    approvedTagNames: approvedTags.map((tag) => tag.name),
    effectiveTagExclusions: enrichmentSettings.effectiveTagExclusions,
    promptTemplate: validatedRequest.prompt,
  });
  const systemPrompt = buildSimpleCatalogEnrichmentSystemPrompt();

  const base64Image = preparedImage.bytes.toString("base64");
  const startedAt = Date.now();

  logPipelineEvent("settings.ai_playground.started", {
    providerId: providerTarget.providerId,
    modelId: validatedRequest.visionModelId,
    reasoningEffortRequested: providerTarget.supportsReasoningEffort
      ? validatedRequest.reasoningEffort
      : null,
    promptLength: validatedRequest.prompt.length,
    approvedCategoryCount: categories.categories.length,
    approvedTagCount: approvedTags.length,
    effectiveTagExclusionCount: enrichmentSettings.effectiveTagExclusions.length,
  });

  const completion = await requestPlaygroundCompletion(
    apiKey,
    providerTarget.baseUrl,
    providerTarget.supportsReasoningEffort,
    validatedRequest,
    base64Image,
    preparedImage.contentType,
    expandedPrompt,
    systemPrompt,
    validatedRequest.reasoningEffort,
  );
  const outputText = assertOpenAiCompletionHasContent(
    completion.payload,
    validatedRequest.visionModelId,
    OPENAI_VISION_MAX_COMPLETION_TOKENS,
  );
  const elapsedMs = Date.now() - startedAt;
  const usage = extractOpenAiCompletionUsage(completion.payload);

  logPipelineEvent("settings.ai_playground.completed", {
    providerId: providerTarget.providerId,
    modelId: validatedRequest.visionModelId,
    reasoningEffortRequested: providerTarget.supportsReasoningEffort
      ? validatedRequest.reasoningEffort
      : null,
    reasoningEffortApplied: completion.reasoningEffortApplied,
    elapsedMs,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    reasoningTokens: usage.reasoningTokens,
  });

  return {
    elapsedMs,
    outputText,
    provider: providerTarget.providerId,
    reasoningEffortApplied: completion.reasoningEffortApplied,
    reasoningEffortRequested: validatedRequest.reasoningEffort,
    visionModelId: validatedRequest.visionModelId,
    version: AI_ENRICHMENT_PLAYGROUND_VERSION,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    estimatedCostUsd: estimateVisionCostUsd(
      validatedRequest.visionModelId,
      usage.promptTokens,
      usage.completionTokens,
    ),
  };
}
