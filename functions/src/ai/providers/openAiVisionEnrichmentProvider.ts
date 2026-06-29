import type { AiEnrichmentInput, AiEnrichmentProvider, AiEnrichmentResult } from "./AiEnrichmentProvider";

import { resolveCatalogCategory } from "../catalogCategoryResolver";
import { parseCatalogEnrichmentResponse } from "../catalogEnrichmentResponse";
import { shouldRetryCatalogEnrichment } from "../catalogEnrichmentRetry";
import {
  buildCatalogEnrichmentSystemPrompt,
  buildCatalogEnrichmentUserPrompt,
  normalizeAiTags,
  OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,
  resolveCatalogDescription,
  resolveCatalogTitle,
  sanitizeCatalogDescription,
} from "../catalogTitleRules";
import {
  OPENAI_VISION_MAX_COMPLETION_TOKENS,
  OPENAI_VISION_MAX_COMPLETION_TOKENS_RETRY,
  OPENAI_VISION_REASONING_EFFORT,
  OPENAI_VISION_REASONING_EFFORT_FALLBACK,
} from "../aiEnrichmentConfig";
import {
  type OpenAiChatCompletionPayload,
  assertOpenAiCompletionHasContent,
  extractOpenAiCompletionChoice,
  extractOpenAiCompletionUsage,
  shouldRetryEmptyOutputWithHigherCap,
} from "../openAiVisionCompletion";
import { resolveVisibleTextPhrases } from "../visibleTextValidation";
import { OpenAiRequestError, fetchOpenAiWithRetry } from "../openAiRetry";
import { logPipelineEvent } from "../../lib/pipelineLog";
import { developmentAiEnrichmentProvider } from "./developmentAiEnrichmentProvider";

type ReasoningEffort = typeof OPENAI_VISION_REASONING_EFFORT | typeof OPENAI_VISION_REASONING_EFFORT_FALLBACK;

interface VisionRequestOptions {
  maxCompletionTokens: number;
  reasoningEffort: ReasoningEffort;
}

function isUnsupportedReasoningEffortError(error: unknown): boolean {
  if (!(error instanceof OpenAiRequestError) || error.status !== 400) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("reasoning_effort") || message.includes("reasoning effort");
}

function buildVisionRequestBody(
  visionModelId: string,
  categoryList: string,
  base64Image: string,
  imageContentType: string,
  options: VisionRequestOptions,
  systemPrompt: string,
): string {
  return JSON.stringify({
    model: visionModelId,
    max_completion_tokens: options.maxCompletionTokens,
    reasoning_effort: options.reasoningEffort,
    response_format: { type: "json_object" },
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
            text: buildCatalogEnrichmentUserPrompt(categoryList),
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageContentType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });
}

async function postOpenAiVisionCompletion(
  apiKey: string,
  visionModelId: string,
  categoryList: string,
  base64Image: string,
  imageContentType: string,
  options: VisionRequestOptions,
  systemPrompt: string,
): Promise<OpenAiChatCompletionPayload> {
  const response = await fetchOpenAiWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: buildVisionRequestBody(
        visionModelId,
        categoryList,
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
  visionModelId: string,
  categoryList: string,
  base64Image: string,
  imageContentType: string,
  options: VisionRequestOptions,
  systemPrompt: string,
  logContext: { designId: string },
): Promise<OpenAiChatCompletionPayload> {
  const requestStartedAtMs = Date.now();

  logPipelineEvent("openai.request.started", {
    designId: logContext.designId,
    model: visionModelId,
    reasoningEffort: options.reasoningEffort,
    maxCompletionTokens: options.maxCompletionTokens,
    loggedAtMs: requestStartedAtMs,
  });

  try {
    const payload = await postOpenAiVisionCompletion(
      apiKey,
      visionModelId,
      categoryList,
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
        model: typeof payload.model === "string" ? payload.model : visionModelId,
        reasoningEffort: options.reasoningEffort,
        maxCompletionTokens: options.maxCompletionTokens,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        reasoningTokens: usage.reasoningTokens,
        durationMs,
      });
    } else {
      logPipelineEvent("openai.empty_content", {
        designId: logContext.designId,
        model: typeof payload.model === "string" ? payload.model : visionModelId,
        reasoningEffort: options.reasoningEffort,
        finishReason: choice.finishReason,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        reasoningTokens: usage.reasoningTokens,
        maxCompletionTokens: options.maxCompletionTokens,
        willRetry: shouldRetryEmptyOutputWithHigherCap(payload, options.maxCompletionTokens),
        durationMs,
      });
    }

    return payload;
  } catch (error) {
    if (
      options.reasoningEffort === OPENAI_VISION_REASONING_EFFORT &&
      isUnsupportedReasoningEffortError(error)
    ) {
      return requestOpenAiVisionCompletion(
        apiKey,
        visionModelId,
        categoryList,
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

interface ProcessedCatalogEnrichment {
  result: AiEnrichmentResult;
  rawColorPalette?: string[];
  categoryRemapped: boolean;
}

function processCatalogEnrichmentPayload(
  input: AiEnrichmentInput,
  raw: Record<string, unknown>,
  visionModelId: string,
  isRetryPass: boolean,
): ProcessedCatalogEnrichment {
  const parsed = parseCatalogEnrichmentResponse(raw);
  const rawDescription = parsed.description;
  let visibleText = parsed.visibleText;
  const textRecognitionConfidence = parsed.textRecognitionConfidence;
  const artworkContainsText = parsed.artworkContainsText;

  const visibleTextResolution = resolveVisibleTextPhrases({
    artworkContainsText,
    candidatePhrases: visibleText,
    description: rawDescription,
  });
  visibleText = visibleTextResolution.phrases;

  if (visibleTextResolution.usedDescriptionFallback) {
    logPipelineEvent("catalog.enrich.visible_text_description_fallback", {
      designId: input.designId,
      phrases: visibleText ?? [],
    });
  }

  if (visibleTextResolution.stillImplausible) {
    logPipelineEvent("catalog.enrich.visible_text_low_quality", {
      designId: input.designId,
      visibleText: visibleText ?? [],
      textRecognitionConfidence: textRecognitionConfidence ?? null,
    });
  }

  const categoryResolution = isRetryPass
    ? resolveCatalogCategory(
        {
          candidate: parsed.categoryName,
          allowedNames: input.categoryNames,
          theme: parsed.theme,
          visibleText,
          primarySubject: parsed.primarySubject,
        },
        input.categoryIdsByName,
      )
    : {
        categoryName: parsed.categoryName
          ? input.categoryNames.find(
              (name) => name.toLowerCase() === parsed.categoryName!.toLowerCase(),
            ) ?? parsed.categoryName
          : undefined,
        categoryId: parsed.categoryName
          ? input.categoryIdsByName[parsed.categoryName.toLowerCase()]
          : undefined,
        remapped: false,
        originalCandidate: parsed.categoryName,
      };

  if (categoryResolution.remapped) {
    logPipelineEvent("catalog.enrich.category_remapped", {
      designId: input.designId,
      from: categoryResolution.originalCandidate ?? null,
      to: categoryResolution.categoryName ?? null,
    });
  }

  const primarySubject = parsed.primarySubject;
  const style = parsed.style;
  const theme = parsed.theme;
  const sanitizedCandidateDescription = sanitizeCatalogDescription(rawDescription);
  const tags = normalizeAiTags(parsed.tags, visibleText, 20, input.effectiveTagExclusions);
  const visibleTextColor = parsed.visibleTextColor;
  const textOnlyArtwork = parsed.textOnlyArtwork;
  const colorPalette = parsed.colorPalette;
  const title = resolveCatalogTitle({
    candidateTitle: parsed.title,
    primarySubject,
    tags,
    uploadFileStem: input.uploadFileStem,
    visibleText,
    visibleTextColor,
    textOnlyArtwork,
    artworkContainsText,
    description: sanitizedCandidateDescription,
  });
  const descriptionResult = resolveCatalogDescription({
    candidateDescription: rawDescription,
    title,
    primarySubject,
    style,
    theme,
    tags,
    visibleText,
    artworkContainsText,
    colorPalette,
  });

  if (descriptionResult.usedFallback) {
    logPipelineEvent("catalog.enrich.description_fallback", {
      designId: input.designId,
      reason: descriptionResult.fallbackReason ?? "unknown",
      tier: descriptionResult.fallbackTier ?? "generic",
    });
  }

  const description = descriptionResult.description;

  return {
    categoryRemapped: categoryResolution.remapped,
    rawColorPalette: Array.isArray(raw.colorPalette)
      ? raw.colorPalette.filter((value): value is string => typeof value === "string")
      : undefined,
    result: {
      suggestions: {
        title,
        description,
        categoryId: categoryResolution.categoryId,
        categoryName: categoryResolution.categoryName,
        tags,
        confidence: parsed.overallConfidence ?? 0.7,
        provider: "openai",
        model: visionModelId,
        promptVersion: OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,
        generatedAt: new Date().toISOString(),
      },
      analysis: {
        primarySubject,
        theme,
        style,
        audience: parsed.audience,
        colorPalette,
        artworkContainsText,
        visibleText,
        visibleTextColor,
        textOnlyArtwork,
        textRecognitionConfidence,
        overallConfidence: parsed.overallConfidence,
      },
    },
  };
}

async function callOpenAiVision(
  apiKey: string,
  visionModelId: string,
  input: AiEnrichmentInput,
): Promise<AiEnrichmentResult> {
  const base64Image = input.previewBytes.toString("base64");
  const imageContentType = input.previewContentType ?? "image/webp";
  const categoryList = input.categoryNames.length > 0 ? input.categoryNames.join(", ") : "none";
  const systemPrompt = buildCatalogEnrichmentSystemPrompt(input.effectiveTagExclusions);

  const initialOptions: VisionRequestOptions = {
    maxCompletionTokens: OPENAI_VISION_MAX_COMPLETION_TOKENS,
    reasoningEffort: OPENAI_VISION_REASONING_EFFORT,
  };

  let payload = await requestOpenAiVisionCompletion(
    apiKey,
    visionModelId,
    categoryList,
    base64Image,
    imageContentType,
    initialOptions,
    systemPrompt,
    { designId: input.designId },
  );

  let maxCompletionTokensUsed = initialOptions.maxCompletionTokens;

  if (shouldRetryEmptyOutputWithHigherCap(payload, maxCompletionTokensUsed)) {
    maxCompletionTokensUsed = OPENAI_VISION_MAX_COMPLETION_TOKENS_RETRY;
    payload = await requestOpenAiVisionCompletion(
      apiKey,
      visionModelId,
      categoryList,
      base64Image,
      imageContentType,
      {
        maxCompletionTokens: maxCompletionTokensUsed,
        reasoningEffort: OPENAI_VISION_REASONING_EFFORT_FALLBACK,
      },
      systemPrompt,
      { designId: input.designId },
    );
  }

  const content = assertOpenAiCompletionHasContent(payload, visionModelId, maxCompletionTokensUsed);

  let parsed = JSON.parse(content) as Record<string, unknown>;
  let processed = processCatalogEnrichmentPayload(input, parsed, visionModelId, false);

  const retryDecision = shouldRetryCatalogEnrichment({
    description: processed.result.suggestions.description ?? "",
    title: processed.result.suggestions.title ?? "",
    visibleText: processed.result.analysis.visibleText,
    artworkContainsText: processed.result.analysis.artworkContainsText ?? false,
    textRecognitionConfidence: processed.result.analysis.textRecognitionConfidence,
    categoryName: processed.result.suggestions.categoryName,
    allowedCategoryNames: input.categoryNames,
    categoryRemapped: processed.categoryRemapped,
    tags: processed.result.suggestions.tags ?? [],
    rawColorPalette: processed.rawColorPalette,
    isRetryPass: false,
  });

  if (retryDecision.shouldRetry) {
    logPipelineEvent("catalog.enrich.retry", {
      designId: input.designId,
      reasons: retryDecision.reasons,
    });

    const retryPayload = await requestOpenAiVisionCompletion(
      apiKey,
      visionModelId,
      categoryList,
      base64Image,
      imageContentType,
      {
        maxCompletionTokens: OPENAI_VISION_MAX_COMPLETION_TOKENS,
        reasoningEffort: OPENAI_VISION_REASONING_EFFORT_FALLBACK,
      },
      systemPrompt,
      { designId: input.designId },
    );

    const retryContent = assertOpenAiCompletionHasContent(
      retryPayload,
      visionModelId,
      OPENAI_VISION_MAX_COMPLETION_TOKENS,
    );
    parsed = JSON.parse(retryContent) as Record<string, unknown>;
    processed = processCatalogEnrichmentPayload(input, parsed, visionModelId, true);
  }

  return processed.result;
}

export function createOpenAiVisionEnrichmentProvider(
  apiKey: string,
  visionModelId: string,
): AiEnrichmentProvider {
  return {
    providerId: "openai",
    modelId: visionModelId,
    promptVersion: OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,

    async enrichDesign(input: AiEnrichmentInput): Promise<AiEnrichmentResult> {
      if (!apiKey.trim()) {
        return developmentAiEnrichmentProvider.enrichDesign(input);
      }

      return callOpenAiVision(apiKey, visionModelId, input);
    },
  };
}
