import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
  AiEnrichmentTagRerankPlaygroundRequest,
  AiEnrichmentTagRerankPlaygroundResponse,
} from "../../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import {
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
  AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES,
  AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH,
  AI_ENRICHMENT_PLAYGROUND_VERSION,
  estimateVisionCostUsd,
} from "../../../packages/shared/src/constants/aiEnrichment.constants";
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
import { extractJsonObject, normalizeSimpleCatalogEnrichment } from "./simpleCatalogEnrichmentResponse";
import { resolveAiCatalogTags } from "./catalogTagResolver";
import { resolveThemeCategory } from "./catalogThemeCategoryResolver";
import { callTagRerank, CATALOG_TAG_RERANK_PROMPT_VERSION } from "./catalogTagRerankProvider";

const ALLOWED_PLAYGROUND_IMAGE_CONTENT_TYPES = new Set<string>(
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
);

interface PreparedAiEnrichmentPlaygroundRequest {
  /** Undefined when the request is text-only (no image provided). */
  imageBytes: Buffer | undefined;
  imageContentType: (typeof AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES)[number] | undefined;
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
    "imageBase64" in input && typeof input.imageBase64 === "string" ? input.imageBase64.trim() : "";
  const imageContentType =
    "imageContentType" in input && typeof input.imageContentType === "string"
      ? input.imageContentType.trim().toLowerCase()
      : "";
  const prompt = "prompt" in input && typeof input.prompt === "string" ? input.prompt.trim() : "";
  const requestedVisionModelId =
    "visionModelId" in input && typeof input.visionModelId === "string"
      ? input.visionModelId.trim()
      : "";

  // Image is optional — the playground supports text-only prompt tests. When an image is
  // provided, it must still be one of the allowed content types.
  const hasImage = imageBase64.length > 0;

  if (hasImage && !ALLOWED_PLAYGROUND_IMAGE_CONTENT_TYPES.has(imageContentType)) {
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
    imageBytes: hasImage ? decodeBase64Image(imageBase64) : undefined,
    imageContentType: hasImage
      ? (imageContentType as (typeof AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES)[number])
      : undefined,
    prompt,
    visionModelId,
  };
}

export function buildAiEnrichmentPlaygroundRequestBody(
  input: PreparedAiEnrichmentPlaygroundRequest,
  base64Image: string | undefined,
  imageContentType: string | undefined,
  expandedPrompt: string,
  systemPrompt: string,
): string {
  const userContent: unknown[] = [
    {
      type: "text",
      text: expandedPrompt,
    },
  ];

  if (base64Image && imageContentType) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${imageContentType};base64,${base64Image}`,
        detail: "high",
      },
    });
  }

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
        content: userContent,
      },
    ],
  });
}

async function requestPlaygroundCompletion(
  apiKey: string,
  baseUrl: string,
  input: PreparedAiEnrichmentPlaygroundRequest,
  base64Image: string | undefined,
  imageContentType: string | undefined,
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
    validatedRequest.imageBytes ? prepareAiAnalysisImage(validatedRequest.imageBytes) : null,
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

  const base64Image = preparedImage ? preparedImage.bytes.toString("base64") : undefined;
  const imageContentType = preparedImage?.contentType;
  const startedAt = Date.now();

  logPipelineEvent("settings.ai_playground.started", {
    providerId: providerTarget.providerId,
    modelId: validatedRequest.visionModelId,
    promptLength: validatedRequest.prompt.length,
    hasImage: Boolean(preparedImage),
    approvedCategoryCount: categories.categories.length,
    approvedTagCount: approvedTags.length,
    effectiveTagExclusionCount: enrichmentSettings.effectiveTagExclusions.length,
  });

  const payload = await requestPlaygroundCompletion(
    geminiApiKey,
    providerTarget.baseUrl,
    validatedRequest,
    base64Image,
    imageContentType,
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

function validateTagRerankPlaygroundRequest(input: unknown): AiEnrichmentTagRerankPlaygroundRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Playground tag rerank request data is required.");
  }

  const firstResponseOutputText =
    "firstResponseOutputText" in input && typeof input.firstResponseOutputText === "string"
      ? input.firstResponseOutputText.trim()
      : "";

  if (!firstResponseOutputText) {
    throw new Error("A first-call vision response is required before running the tag rerank.");
  }

  const requestedVisionModelId =
    "visionModelId" in input && typeof input.visionModelId === "string"
      ? input.visionModelId.trim()
      : "";
  const visionModelId = resolveVisionModelId(requestedVisionModelId);

  if (visionModelId !== requestedVisionModelId) {
    throw new Error("The selected vision model is not allowed.");
  }

  const promptTemplate =
    "promptTemplate" in input && typeof input.promptTemplate === "string"
      ? input.promptTemplate.trim() || undefined
      : undefined;

  return { firstResponseOutputText, promptTemplate, visionModelId };
}

/**
 * Playground-only entry point for the optional text-only tag reranker, per the user's request to
 * be able to test the reranker workflow against real designs before enabling it in production.
 * Does not write to `designs` and does not persist the uploaded image — the first-call vision
 * response is passed back in as text only, exactly as production would receive it from the first
 * call in the real pipeline. Requires a valid, already-parseable first-call JSON response (same
 * normalizeSimpleCatalogEnrichment validation the real pipeline applies) before rerank is possible.
 */
export async function runAiEnrichmentTagRerankPlayground(
  geminiApiKey: string,
  request: AiEnrichmentTagRerankPlaygroundRequest,
): Promise<AiEnrichmentTagRerankPlaygroundResponse> {
  const validatedRequest = validateTagRerankPlaygroundRequest(request);
  const providerTarget = resolveProviderTarget();

  if (!geminiApiKey.trim()) {
    throw new Error(
      "The AI playground is unavailable because GEMINI_API_KEY is not configured for this environment.",
    );
  }

  const [approvedTags, categories, enrichmentSettings] = await Promise.all([
    loadCachedApprovedTags(),
    loadCachedActiveCategories(),
    loadCachedAiEnrichmentSettings(),
  ]);

  const raw = extractJsonObject(validatedRequest.firstResponseOutputText);
  const parsed = normalizeSimpleCatalogEnrichment(raw, enrichmentSettings.effectiveTagExclusions);

  const resolvedTags = resolveAiCatalogTags({
    approvedTags,
    candidates: parsed.rawTags.length > 0 ? parsed.rawTags : parsed.tags,
  });

  const resolvedCategory = resolveThemeCategory(
    {
      rawCategory: parsed.category,
      title: parsed.title,
      description: parsed.description,
      matchedTags: resolvedTags.tags,
      approvedCategories: categories.categories,
    },
    categories.idsByName,
  );

  const startedAt = Date.now();

  logPipelineEvent("settings.ai_playground.tag_rerank.started", {
    providerId: providerTarget.providerId,
    modelId: validatedRequest.visionModelId,
    candidateCount: resolvedTags.approvedTagCandidates.length,
  });

  const rerankResult = await callTagRerank(
    geminiApiKey,
    providerTarget,
    validatedRequest.visionModelId,
    {
      approvedTagCandidates: resolvedTags.approvedTagCandidates,
      firstResponse: {
        category: parsed.category,
        description: parsed.description,
        tags: resolvedTags.tags,
        title: parsed.title,
      },
      promptTemplate: validatedRequest.promptTemplate ?? enrichmentSettings.tagRerankPromptTemplate,
      resolvedCategoryName: resolvedCategory.categoryName,
    },
    { designId: "playground" },
  );

  const elapsedMs = Date.now() - startedAt;

  logPipelineEvent("settings.ai_playground.tag_rerank.completed", {
    providerId: providerTarget.providerId,
    modelId: validatedRequest.visionModelId,
    elapsedMs,
    finalTagCount: rerankResult.tags.length,
    discardedTagCount: rerankResult.discardedTags.length,
  });

  return {
    approvedTagCandidates: resolvedTags.approvedTagCandidates,
    discardedTags: rerankResult.discardedTags,
    elapsedMs,
    estimatedCostUsd: rerankResult.estimatedCostUsd,
    outputText: JSON.stringify({ tags: rerankResult.tags, uncoveredConcepts: rerankResult.uncoveredConcepts }),
    promptTokens: rerankResult.promptTokens,
    completionTokens: rerankResult.completionTokens,
    uncoveredConcepts: rerankResult.uncoveredConcepts,
    version: CATALOG_TAG_RERANK_PROMPT_VERSION,
  };
}
