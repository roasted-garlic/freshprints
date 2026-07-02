import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "../../../shared/types/ai/aiEnrichmentPlayground.types";
import {
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
  AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES,
  AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH,
  AI_ENRICHMENT_PLAYGROUND_VERSION,
  estimateVisionCostUsd,
} from "../../../shared/constants/aiEnrichment.constants";
import { logPipelineEvent } from "../lib/pipelineLog";
import { prepareAiAnalysisImage } from "./prepareAiAnalysisImage";
import {
  VISION_MAX_COMPLETION_TOKENS,
  resolveVisionModelId,
  type AllowedVisionModelId,
} from "./aiEnrichmentConfig";
import {
  type VisionChatCompletionPayload,
  assertVisionCompletionHasContent,
  extractVisionCompletionUsage,
} from "./visionCompletion";
import { fetchVisionWithRetry } from "./visionRequestRetry";
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
  visionModelId: AllowedVisionModelId;
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

  const visionModelId = resolveVisionModelId(requestedVisionModelId);

  if (visionModelId !== requestedVisionModelId) {
    throw new Error("The selected vision model is not allowed.");
  }

  return {
    imageBytes: decodeBase64Image(imageBase64),
    imageContentType: imageContentType as (typeof AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES)[number],
    prompt,
    visionModelId,
  };
}

export function buildAiEnrichmentPlaygroundRequestBody(
  input: PreparedAiEnrichmentPlaygroundRequest,
  base64Image: string,
  imageContentType: string,
  expandedPrompt: string,
  systemPrompt: string,
): string {
  return JSON.stringify({
    model: input.visionModelId,
    max_completion_tokens: VISION_MAX_COMPLETION_TOKENS,
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
  input: PreparedAiEnrichmentPlaygroundRequest,
  base64Image: string,
  imageContentType: string,
  expandedPrompt: string,
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
      body: buildAiEnrichmentPlaygroundRequestBody(
        input,
        base64Image,
        imageContentType,
        expandedPrompt,
        systemPrompt,
      ),
    },
    { maxRetries: 2, baseDelayMs: 2000, modelId: input.visionModelId },
  );

  return (await response.json()) as VisionChatCompletionPayload;
}

export async function runAiEnrichmentPlayground(
  geminiApiKey: string,
  request: AiEnrichmentPlaygroundRequest,
): Promise<AiEnrichmentPlaygroundResponse> {
  const validatedRequest = validateAiEnrichmentPlaygroundRequest(request);
  const providerTarget = resolveProviderTarget();

  if (!geminiApiKey.trim()) {
    throw new Error(
      "The AI playground is unavailable because GEMINI_API_KEY is not configured for this environment.",
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
    promptLength: validatedRequest.prompt.length,
    approvedCategoryCount: categories.categories.length,
    approvedTagCount: approvedTags.length,
    effectiveTagExclusionCount: enrichmentSettings.effectiveTagExclusions.length,
  });

  const payload = await requestPlaygroundCompletion(
    geminiApiKey,
    providerTarget.baseUrl,
    validatedRequest,
    base64Image,
    preparedImage.contentType,
    expandedPrompt,
    systemPrompt,
  );
  const outputText = assertVisionCompletionHasContent(payload);
  const elapsedMs = Date.now() - startedAt;
  const usage = extractVisionCompletionUsage(payload);

  logPipelineEvent("settings.ai_playground.completed", {
    providerId: providerTarget.providerId,
    modelId: validatedRequest.visionModelId,
    elapsedMs,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
  });

  return {
    elapsedMs,
    outputText,
    provider: providerTarget.providerId,
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
