import type { AiEnrichmentInput, AiEnrichmentProvider, AiEnrichmentResult } from "./AiEnrichmentProvider";

import {
  buildCatalogEnrichmentSystemPrompt,
  OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,
  buildCatalogEnrichmentUserPrompt,
  filterBackgroundColorsFromPalette,
  normalizeAiTags,
  normalizeVisibleTextColor,
  normalizeVisibleTextPhrases,
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
  shouldRetryEmptyOutputWithHigherCap,
} from "../openAiVisionCompletion";
import { OpenAiRequestError, fetchOpenAiWithRetry } from "../openAiRetry";
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
): Promise<OpenAiChatCompletionPayload> {
  try {
    return await postOpenAiVisionCompletion(
      apiKey,
      visionModelId,
      categoryList,
      base64Image,
      imageContentType,
      options,
      systemPrompt,
    );
  } catch (error) {
    if (
      options.reasoningEffort === OPENAI_VISION_REASONING_EFFORT &&
      isUnsupportedReasoningEffortError(error)
    ) {
      return postOpenAiVisionCompletion(apiKey, visionModelId, categoryList, base64Image, imageContentType, {
        ...options,
        reasoningEffort: OPENAI_VISION_REASONING_EFFORT_FALLBACK,
      }, systemPrompt);
    }

    throw error;
  }
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
        reasoningEffort: initialOptions.reasoningEffort,
      },
      systemPrompt,
    );
  }

  const content = assertOpenAiCompletionHasContent(payload, visionModelId, maxCompletionTokensUsed);

  const parsed = JSON.parse(content) as Record<string, unknown>;
  const categoryName =
    typeof parsed.categoryName === "string" ? parsed.categoryName.trim() : undefined;
  const categoryId = categoryName
    ? input.categoryIdsByName[categoryName.toLowerCase()]
    : undefined;
  const primarySubject =
    typeof parsed.primarySubject === "string" ? parsed.primarySubject.trim() : undefined;
  const description = sanitizeCatalogDescription(
    typeof parsed.description === "string" ? parsed.description : "",
  ).slice(0, 500);
  const visibleText = normalizeVisibleTextPhrases(parsed.visibleText);
  const tags = normalizeAiTags(parsed.tags, visibleText, 20, input.effectiveTagExclusions);
  const visibleTextColor = normalizeVisibleTextColor(parsed.visibleTextColor);
  const artworkContainsText =
    typeof parsed.artworkContainsText === "boolean"
      ? parsed.artworkContainsText
      : Boolean(visibleText?.length);
  const title = resolveCatalogTitle({
    candidateTitle: typeof parsed.title === "string" ? parsed.title : undefined,
    primarySubject,
    tags,
    uploadFileStem: input.uploadFileStem,
    visibleText,
    visibleTextColor,
    artworkContainsText,
    description,
  });

  return {
    suggestions: {
      title,
      description,
      categoryId,
      categoryName,
      tags,
      confidence: typeof parsed.overallConfidence === "number" ? parsed.overallConfidence : 0.7,
      provider: "openai",
      model: visionModelId,
      promptVersion: OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,
      generatedAt: new Date().toISOString(),
    },
    analysis: {
      primarySubject,
      theme: typeof parsed.theme === "string" ? parsed.theme : undefined,
      style: typeof parsed.style === "string" ? parsed.style : undefined,
      audience: typeof parsed.audience === "string" ? parsed.audience : undefined,
      colorPalette: filterBackgroundColorsFromPalette(
        Array.isArray(parsed.colorPalette)
          ? parsed.colorPalette.filter((value): value is string => typeof value === "string")
          : undefined,
      ),
      artworkContainsText,
      visibleText,
      visibleTextColor,
      textRecognitionConfidence:
        typeof parsed.textRecognitionConfidence === "number"
          ? parsed.textRecognitionConfidence
          : undefined,
      overallConfidence:
        typeof parsed.overallConfidence === "number" ? parsed.overallConfidence : undefined,
    },
  };
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
