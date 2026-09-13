import { randomUUID } from "node:crypto";

import type {
  AiEnrichmentPlaygroundPass1Context,
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "../../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import type { DesignAiSuggestions } from "../../../packages/shared/src/types/ai/aiProcessing.types";
import {
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
  AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES,
  AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH,
  AI_ENRICHMENT_PLAYGROUND_VERSION,
  OPENAI_LUNA_REASONING_EFFORT,
  estimateVisionCostUsd,
  visionModelRequiresReasoningEffort,
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
import { fetchVisionWithRetry, VisionRequestError } from "./visionRequestRetry";
import {
  loadCachedActiveCategories,
  loadCachedAiEnrichmentSettings,
  type AiEnrichmentReadDiagnosticContext,
} from "./aiEnrichmentRuntimeCache";
import { loadSmartProfileVocabSnapshot } from "./loadSmartProfileVocabSnapshot";
import {
  buildSimpleCatalogEnrichmentSystemPrompt,
  buildSimpleCatalogEnrichmentUserPrompt,
} from "./simpleCatalogEnrichmentPrompt";
import { resolveVisionProviderCredentials } from "./resolveVisionProviderCredentials";
import {
  extractJsonObject,
  normalizeSimpleCatalogEnrichment,
  toCanonicalSimpleCatalogEnrichmentJson,
} from "./simpleCatalogEnrichmentResponse";
import { buildSimpleCatalogEnrichmentResponseFormat } from "./simpleCatalogEnrichmentSchema";
import { writeAiEnrichmentTrace } from "./aiEnrichmentTraceStore";
import { buildDesignSmartProfile } from "./smartProfileBuilder";
import { computeCatalogAutomationDecision } from "./automationDecisionShadow";
import {
  getSemanticReviewEligibleBlockers,
  getSemanticReviewObjectiveBlockers,
} from "../../../packages/shared/src/utils/semanticReviewPolicy";
import { CATALOG_ENRICHMENT_PROMPT_VERSION } from "./catalogTitleRules";

const ALLOWED_PLAYGROUND_IMAGE_CONTENT_TYPES = new Set<string>(
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
);

interface PreparedAiEnrichmentPlaygroundRequest {
  /** Undefined when the request is text-only (no image provided). */
  imageBytes: Buffer | undefined;
  imageContentType:
    (typeof AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES)[number] | undefined;
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

function projectNormalizedResult(
  parsed: ReturnType<typeof normalizeSimpleCatalogEnrichment>,
): AiEnrichmentPlaygroundPass1Context["normalized"] {
  return {
    title: parsed.title,
    description: parsed.description,
    category: parsed.category,
    centralSubject: parsed.centralSubject,
    subjects: parsed.subjects ?? [],
    objects: parsed.objects ?? [],
    styles: parsed.styles ?? [],
    themes: parsed.themes ?? [],
    interests: parsed.interests ?? [],
    professionsGroups: parsed.professionsGroups ?? [],
    occasions: parsed.occasions ?? [],
    places: parsed.places ?? [],
    colors: parsed.colors ?? [],
    visibleText: parsed.visibleText ?? [],
    searchConcepts: parsed.searchConcepts ?? [],
    categoryAlternatives: parsed.categoryAlternatives ?? [],
    categoryGapNote: parsed.categoryGapNote,
    visualContextProfile: parsed.visualContextProfile,
  };
}

function failClosedForSettingsRead(
  decision: ReturnType<typeof computeCatalogAutomationDecision>,
  settingsReadFailed: boolean,
): ReturnType<typeof computeCatalogAutomationDecision> {
  if (!settingsReadFailed || !decision.wouldAutoApprove) {
    return decision;
  }

  return {
    ...decision,
    decision: "needs_review",
    wouldAutoApprove: false,
    shouldPublishReady: false,
    reasonCodes: [
      ...new Set([
        ...decision.reasonCodes.filter(
          (code) =>
            code !== "shadow_would_auto_approve" && code !== "auto_approved",
        ),
        "explicit_automation_settings_unavailable",
      ]),
    ],
  };
}

export function resolveAiEnrichmentPlaygroundPass2Eligibility(input: {
  objectiveBlockers: readonly string[];
  semanticBlockers: readonly string[];
  visualContextProfile?: { summary?: string; detailedDescription?: string };
}): AiEnrichmentPlaygroundPass1Context["pass2Eligibility"] {
  const hasCompleteVcp = Boolean(
    input.visualContextProfile?.summary &&
    input.visualContextProfile.detailedDescription,
  );

  if (input.objectiveBlockers.length > 0) {
    return "blocked_by_objective";
  }
  if (!hasCompleteVcp) {
    return "unavailable";
  }
  return input.semanticBlockers.length > 0 ? "eligible" : "not_needed";
}

export function buildPass1Context(input: {
  parsed: ReturnType<typeof normalizeSimpleCatalogEnrichment>;
  providerId: string;
  modelId: string;
  categories: Awaited<ReturnType<typeof loadCachedActiveCategories>>;
  smartProfileVocab: Awaited<ReturnType<typeof loadSmartProfileVocabSnapshot>>;
  settings: Awaited<ReturnType<typeof loadCachedAiEnrichmentSettings>>;
}): AiEnrichmentPlaygroundPass1Context {
  const exactCategory = input.categories.categories.find(
    (category) =>
      category.name.trim().toLowerCase() ===
      input.parsed.category.trim().toLowerCase(),
  );
  const categoryId = exactCategory?.id;
  const categoryName = exactCategory?.name;
  const suggestions: DesignAiSuggestions = {
    title: input.parsed.title,
    description: input.parsed.description,
    categoryId,
    categoryName,
    provider: input.providerId,
    model: input.modelId,
    promptVersion: CATALOG_ENRICHMENT_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
  };
  const smartProfile = buildDesignSmartProfile({
    parsed: input.parsed,
    suggestions,
    categoryId,
    categoryName,
    categoryIdsByName: input.categories.idsByName,
    smartProfileVocab: input.smartProfileVocab.lists,
  });
  const computedDecision = computeCatalogAutomationDecision({
    smartProfile,
    title: input.parsed.title,
    categoryId,
    categoryName,
    description: input.parsed.description,
    visibleText: input.parsed.visibleText,
    visualContextProfile: input.parsed.visualContextProfile,
    catalogWorkflowMode: input.settings.catalogWorkflowMode,
    catalogAutonomousLiveEnabled: input.settings.catalogAutonomousLiveEnabled,
  });
  const automationDecision = failClosedForSettingsRead(
    computedDecision,
    input.settings.settingsReadFailed,
  );
  const semanticBlockers = getSemanticReviewEligibleBlockers(
    automationDecision.reasonCodes,
  );
  const objectiveBlockers = getSemanticReviewObjectiveBlockers(
    automationDecision.hardBlockers,
  );
  const pass2Eligibility = resolveAiEnrichmentPlaygroundPass2Eligibility({
    objectiveBlockers,
    semanticBlockers,
    visualContextProfile: input.parsed.visualContextProfile,
  });

  smartProfile.provenance.automationDecision = automationDecision.decision;
  smartProfile.provenance.automationReasonCodes =
    automationDecision.reasonCodes;
  smartProfile.provenance.automationDecisionAt = new Date().toISOString();
  smartProfile.provenance.verifierInvoked = automationDecision.verifier.invoked;

  return {
    normalized: projectNormalizedResult(input.parsed),
    originalSmartProfile: smartProfile,
    categoryId,
    categoryName,
    blockers: automationDecision.reasonCodes,
    objectiveBlockers,
    semanticBlockers,
    pass2Eligibility,
    automationDecision,
    semanticReviewPlaygroundEnabled:
      input.settings.semanticReviewPlaygroundEnabled,
  };
}

export function validateAiEnrichmentPlaygroundRequest(
  input: unknown,
): PreparedAiEnrichmentPlaygroundRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Playground request data is required.");
  }

  const imageBase64 =
    "imageBase64" in input && typeof input.imageBase64 === "string"
      ? input.imageBase64.trim()
      : "";
  const imageContentType =
    "imageContentType" in input && typeof input.imageContentType === "string"
      ? input.imageContentType.trim().toLowerCase()
      : "";
  const prompt =
    "prompt" in input && typeof input.prompt === "string"
      ? input.prompt.trim()
      : "";
  const requestedVisionModelId =
    "visionModelId" in input && typeof input.visionModelId === "string"
      ? input.visionModelId.trim()
      : "";

  // Image is optional — the playground supports text-only prompt tests. When an image is
  // provided, it must still be one of the allowed content types.
  const hasImage = imageBase64.length > 0;

  if (
    hasImage &&
    !ALLOWED_PLAYGROUND_IMAGE_CONTENT_TYPES.has(imageContentType)
  ) {
    throw new Error("Playground image must be PNG, JPEG, or WebP.");
  }

  if (!prompt) {
    throw new Error("A prompt is required.");
  }

  if (prompt.length > AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH) {
    throw new Error(
      `Prompt must be ${AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`,
    );
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

  const body: Record<string, unknown> = {
    model: input.visionModelId,
    max_completion_tokens: VISION_MAX_COMPLETION_TOKENS,
    response_format: buildSimpleCatalogEnrichmentResponseFormat(),
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
  };

  if (visionModelRequiresReasoningEffort(input.visionModelId)) {
    body.reasoning_effort = OPENAI_LUNA_REASONING_EFFORT;
  }

  return JSON.stringify(body);
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
  keys: { geminiApiKey: string; openAiApiKey?: string },
  request: AiEnrichmentPlaygroundRequest,
): Promise<AiEnrichmentPlaygroundResponse> {
  const validatedRequest = validateAiEnrichmentPlaygroundRequest(request);
  const { providerTarget, apiKey } = resolveVisionProviderCredentials(
    validatedRequest.visionModelId,
    {
      geminiApiKey: keys.geminiApiKey,
      openAiApiKey: keys.openAiApiKey,
    },
  );

  const diagnosticContext: AiEnrichmentReadDiagnosticContext = {
    functionName: "runAiEnrichmentPlayground",
    invocationId: randomUUID(),
  };
  const [preparedImage, categories, smartProfileVocabSnapshot, settings] =
    await Promise.all([
      validatedRequest.imageBytes
        ? prepareAiAnalysisImage(validatedRequest.imageBytes)
        : null,
      loadCachedActiveCategories(diagnosticContext),
      loadSmartProfileVocabSnapshot(),
      loadCachedAiEnrichmentSettings(diagnosticContext),
    ]);

  const expandedPrompt = buildSimpleCatalogEnrichmentUserPrompt({
    approvedCategories: categories.categories,
    approvedCategoryNames: categories.names,
    promptTemplate: validatedRequest.prompt,
    smartProfileVocab: smartProfileVocabSnapshot.lists,
  });
  const systemPrompt = buildSimpleCatalogEnrichmentSystemPrompt();

  const base64Image = preparedImage
    ? preparedImage.bytes.toString("base64")
    : undefined;
  const imageContentType = preparedImage?.contentType;
  const startedAt = Date.now();
  const traceId = randomUUID();
  const traceStartedAt = new Date().toISOString();
  const traceStages: Array<{
    stage:
      | "created"
      | "prompt_ready"
      | "request_sent"
      | "provider_response"
      | "provider_error"
      | "parsed"
      | "complete"
      | "failed";
    at: string;
    data?: Record<string, unknown>;
  }> = [
    { stage: "created", at: traceStartedAt },
    {
      stage: "prompt_ready",
      at: new Date().toISOString(),
      data: { effectivePrompt: expandedPrompt },
    },
  ];
  const traceBase = {
    schemaVersion: 1 as const,
    traceId,
    source: "PLAYGROUND" as const,
    pass: "PASS 1" as const,
    captureFullTrace: request.captureFullTrace === true,
    startedAt: traceStartedAt,
    provider: providerTarget.providerId,
    model: validatedRequest.visionModelId,
    prompt: {
      storedTemplate: validatedRequest.prompt,
      effectiveSystem: systemPrompt,
      effectiveUser: expandedPrompt,
    },
    responseContract:
      buildSimpleCatalogEnrichmentResponseFormat() as unknown as Record<
        string,
        unknown
      >,
    requestMetadata: {
      hasImage: Boolean(preparedImage),
      imageCount: preparedImage ? 1 : 0,
      maxCompletionTokens: VISION_MAX_COMPLETION_TOKENS,
    },
  };
  const persistTrace = async (
    lifecycleState:
      | "prompt_ready"
      | "request_sent"
      | "provider_error"
      | "provider_response"
      | "parsed"
      | "complete"
      | "failed",
    extra: Record<string, unknown> = {},
  ) => {
    await writeAiEnrichmentTrace({
      ...traceBase,
      ...extra,
      lifecycleState,
      completedAt:
        lifecycleState === "complete" || lifecycleState === "failed"
          ? new Date().toISOString()
          : undefined,
      stages: [...traceStages],
    });
  };
  await persistTrace("prompt_ready");

  logPipelineEvent("settings.ai_playground.started", {
    providerId: providerTarget.providerId,
    modelId: validatedRequest.visionModelId,
    promptLength: validatedRequest.prompt.length,
    hasImage: Boolean(preparedImage),
    approvedCategoryCount: categories.categories.length,
  });

  traceStages.push({
    stage: "request_sent",
    at: new Date().toISOString(),
    data: { responseFormat: traceBase.responseContract },
  });
  await persistTrace("request_sent");

  try {
    const payload = await requestPlaygroundCompletion(
      apiKey,
      providerTarget.baseUrl,
      validatedRequest,
      base64Image,
      imageContentType,
      expandedPrompt,
      systemPrompt,
    );
    const rawOutputText = assertVisionCompletionHasContent(payload);
    const elapsedMs = Date.now() - startedAt;
    const usage = extractVisionCompletionUsage(payload);

    // Canonicalize through the same parser as production enrichment so Playground cannot
    // surface invented keys (prompt, keywords, etc.) as if they were Smart Profile fields.
    const rawObject = extractJsonObject(rawOutputText);
    const parsed = normalizeSimpleCatalogEnrichment(rawObject);
    const canonicalOutputText = JSON.stringify(
      toCanonicalSimpleCatalogEnrichmentJson(parsed),
      null,
      2,
    );
    const estimatedCostUsd = estimateVisionCostUsd(
      validatedRequest.visionModelId,
      usage.promptTokens,
      usage.completionTokens,
    );
    traceStages.push({
      stage: "provider_response",
      at: new Date(Date.now() - elapsedMs).toISOString(),
      data: {
        source: providerTarget.providerId,
        usage: usage as unknown as Record<string, unknown>,
      },
    });
    traceStages.push({
      stage: "parsed",
      at: new Date().toISOString(),
      data: { normalized: parsed as unknown as Record<string, unknown> },
    });
    traceStages.push({
      stage: "complete",
      at: new Date().toISOString(),
      data: { actual: parsed as unknown as Record<string, unknown> },
    });
    await persistTrace("complete", {
      completedAt: new Date().toISOString(),
      providerResponse: {
        raw: payload,
        usage: usage as unknown as Record<string, unknown>,
      },
      normalized: parsed as unknown as Record<string, unknown>,
      costs: {
        pass1:
          estimatedCostUsd === null
            ? undefined
            : { totalUsd: estimatedCostUsd },
      },
    });

    logPipelineEvent("settings.ai_playground.completed", {
      providerId: providerTarget.providerId,
      modelId: validatedRequest.visionModelId,
      elapsedMs,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      strippedUnknownKeys: Object.keys(rawObject).filter(
        (key) =>
          ![
            "title",
            "description",
            "category",
            "centralSubject",
            "subjects",
            "objects",
            "styles",
            "themes",
            "interests",
            "professionsGroups",
            "occasions",
            "places",
            "colors",
            "searchConcepts",
            "categoryAlternatives",
            "categoryGapNote",
            "visibleText",
            "visualContextProfile",
          ].includes(key),
      ),
    });

    return {
      elapsedMs,
      outputText: canonicalOutputText,
      provider: providerTarget.providerId,
      visionModelId: validatedRequest.visionModelId,
      version: AI_ENRICHMENT_PLAYGROUND_VERSION,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      estimatedCostUsd,
      traceId,
      captureFullTrace: request.captureFullTrace === true,
      pass1Context: buildPass1Context({
        parsed,
        providerId: providerTarget.providerId,
        modelId: validatedRequest.visionModelId,
        categories,
        smartProfileVocab: smartProfileVocabSnapshot,
        settings,
      }),
    };
  } catch (error) {
    const providerError =
      error instanceof VisionRequestError ? error.providerError : undefined;
    traceStages.push({
      stage: "provider_error",
      at: new Date().toISOString(),
      data: providerError ?? {
        classification: "ai_processing_failed",
        message: "Provider request failed.",
      },
    });
    traceStages.push({
      stage: "failed",
      at: new Date().toISOString(),
      data: {
        parser: "NOT REACHED",
        normalized: "NOT REACHED",
        vcp: "NOT REACHED",
        candidate: "NOT REACHED",
        persistence: "NOT REACHED",
      },
    });
    await persistTrace("failed", {
      providerError: providerError ?? {
        classification: "ai_processing_failed",
      },
    });
    throw error;
  }
}
