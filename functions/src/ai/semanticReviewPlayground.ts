import { randomUUID } from "node:crypto";

import type {
  AiEnrichmentSemanticReviewPlaygroundRequest,
  AiEnrichmentSemanticReviewPlaygroundResponse,
} from "../../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import { estimateVisionCostUsd } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import { CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION } from "../../../packages/shared/src/types/catalog/semanticReview.types";
import { buildAiEnrichmentPass2Diagnostics } from "../../../packages/shared/src/utils/aiEnrichmentTrace";
import {
  deriveSemanticReviewBlockerResolution,
  getSemanticReviewEligibleBlockers,
  getSemanticReviewObjectiveBlockers,
} from "../../../packages/shared/src/utils/semanticReviewPolicy";
import { computeCatalogAutomationDecision } from "./automationDecisionShadow";
import {
  applySemanticReviewPatches,
  buildSemanticReviewPrompt,
} from "./semanticReviewCore";
import {
  callSemanticReviewer,
  type SemanticReviewProviderRequestBody,
  SEMANTIC_REVIEW_SYSTEM_PROMPT,
} from "./semanticReviewProvider";
import { buildSemanticReviewResponseFormat } from "./semanticReviewSchema";
import { resolveProviderTarget } from "./providers/resolveProviderTarget";
import { loadCachedAiEnrichmentSettings } from "./aiEnrichmentRuntimeCache";
import { writeAiEnrichmentTrace } from "./aiEnrichmentTraceStore";
import {
  safeSemanticReviewErrorMessage,
  SemanticReviewError,
  type SemanticReviewDiagnostics,
} from "./semanticReviewErrors";
import { logPipelineEvent } from "../lib/pipelineLog";

function cloneSmartProfile(profile: DesignSmartProfile): DesignSmartProfile {
  return JSON.parse(JSON.stringify(profile)) as DesignSmartProfile;
}

function toPatchProfileRecord(
  profile: DesignSmartProfile,
): Record<string, string[]> {
  const record: Record<string, string[]> = {};
  for (const field of [
    "subjects",
    "objects",
    "styles",
    "themes",
    "interests",
    "professionsGroups",
    "occasions",
    "places",
    "searchConcepts",
  ] as const) {
    record[field] = [...(profile[field] ?? [])];
  }
  return record;
}

function resolvePlaygroundEligibility(input: {
  request: AiEnrichmentSemanticReviewPlaygroundRequest;
  settings: Awaited<ReturnType<typeof loadCachedAiEnrichmentSettings>>;
}): {
  objectiveBlockers: string[];
  semanticBlockers: string[];
  reasonCodes: string[];
} {
  const decision = computeCatalogAutomationDecision({
    smartProfile: input.request.originalSmartProfile,
    title: input.request.title,
    categoryId: input.request.categoryId,
    categoryName: input.request.categoryName,
    description: input.request.description,
    visibleText: input.request.originalSmartProfile.visibleText,
    visualContextProfile: input.request.visualContextProfile,
    catalogWorkflowMode: input.settings.catalogWorkflowMode,
    catalogAutonomousLiveEnabled: input.settings.catalogAutonomousLiveEnabled,
  });
  const semanticBlockers = getSemanticReviewEligibleBlockers(
    decision.reasonCodes,
  );
  return {
    objectiveBlockers: getSemanticReviewObjectiveBlockers(
      decision.hardBlockers,
    ),
    semanticBlockers,
    reasonCodes: decision.reasonCodes,
  };
}

export function projectSemanticReviewPlaygroundResult(input: {
  originalSmartProfile: DesignSmartProfile;
  title: string;
  description: string;
  categoryId?: string;
  categoryName?: string;
  visualContextProfile: AiEnrichmentSemanticReviewPlaygroundRequest["visualContextProfile"];
  reviewResult: AiEnrichmentSemanticReviewPlaygroundResponse["result"];
  initialEligibleBlockers: readonly string[];
  catalogWorkflowMode: Parameters<
    typeof computeCatalogAutomationDecision
  >[0]["catalogWorkflowMode"];
  catalogAutonomousLiveEnabled: boolean;
}): Pick<
  AiEnrichmentSemanticReviewPlaygroundResponse,
  | "originalSmartProfile"
  | "effectiveSmartProfile"
  | "finalAutomationDecision"
  | "finalObjectiveBlockers"
  | "finalSemanticBlockers"
  | "deterministicBlockersResolved"
  | "deterministicBlockersUnresolved"
  | "reviewerReportedBlockers"
> {
  const originalSmartProfile = cloneSmartProfile(input.originalSmartProfile);
  const patchedLists = applySemanticReviewPatches(
    toPatchProfileRecord(originalSmartProfile),
    input.reviewResult,
    originalSmartProfile.provenance.staffEditedDimensionKeys ?? [],
  );
  const effectiveSmartProfile: DesignSmartProfile = {
    ...originalSmartProfile,
    ...patchedLists,
    provenance: { ...originalSmartProfile.provenance },
  };
  const finalAutomationDecision = computeCatalogAutomationDecision({
    smartProfile: effectiveSmartProfile,
    title: input.title,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    description: input.description,
    visibleText: effectiveSmartProfile.visibleText,
    visualContextProfile: input.visualContextProfile,
    catalogWorkflowMode: input.catalogWorkflowMode,
    catalogAutonomousLiveEnabled: input.catalogAutonomousLiveEnabled,
  });

  const finalEligible = getSemanticReviewEligibleBlockers(
    finalAutomationDecision.reasonCodes,
  );
  const derived = deriveSemanticReviewBlockerResolution({
    initialEligibleBlockers: input.initialEligibleBlockers,
    finalEligibleBlockers: finalEligible,
  });

  effectiveSmartProfile.provenance.automationDecision =
    finalAutomationDecision.decision;
  effectiveSmartProfile.provenance.automationReasonCodes =
    finalAutomationDecision.reasonCodes;
  effectiveSmartProfile.provenance.automationDecisionAt =
    new Date().toISOString();
  effectiveSmartProfile.provenance.verifierInvoked =
    finalAutomationDecision.verifier.invoked;

  return {
    originalSmartProfile,
    effectiveSmartProfile,
    finalAutomationDecision,
    finalObjectiveBlockers: getSemanticReviewObjectiveBlockers(
      finalAutomationDecision.hardBlockers,
    ),
    finalSemanticBlockers: derived.unresolvedBlockers,
    deterministicBlockersResolved: derived.resolvedBlockers,
    deterministicBlockersUnresolved: derived.unresolvedBlockers,
    reviewerReportedBlockers: {
      resolved: [...input.reviewResult.blockersResolved],
      unresolved: [...input.reviewResult.blockersUnresolved],
    },
  };
}

const SEMANTIC_REVIEW_MAX_COMPLETION_TOKENS = 1200;

export function buildSemanticReviewPlaygroundPass2Diagnostics(input: {
  request: AiEnrichmentSemanticReviewPlaygroundRequest;
  prompt: string;
  eligibility: {
    reasonCodes: string[];
    objectiveBlockers: string[];
    semanticBlockers: string[];
  };
  providerRequest?: SemanticReviewProviderRequestBody;
  patchValidationInput?: unknown;
}) {
  return buildAiEnrichmentPass2Diagnostics({
    semanticReviewInput: {
      title: input.request.title,
      description: input.request.description,
      categoryId: input.request.categoryId ?? null,
      categoryName: input.request.categoryName ?? null,
      originalSmartProfile: input.request.originalSmartProfile,
      effectiveSmartProfile: input.request.effectiveSmartProfile,
      effectiveSmartProfileUsedByPrompt: input.request.originalSmartProfile,
      requestEffectiveSmartProfile: input.request.effectiveSmartProfile,
      visualContextProfile: input.request.visualContextProfile,
      blockers: input.eligibility.reasonCodes,
      eligibleBlockers: input.eligibility.semanticBlockers,
      objectiveBlockers: input.eligibility.objectiveBlockers,
      semanticBlockers: input.eligibility.semanticBlockers,
      pass2Eligibility: input.request.pass2Eligibility,
      serverEligibility: {
        objectiveBlockers: input.eligibility.objectiveBlockers,
        semanticBlockers: input.eligibility.semanticBlockers,
        visualContextComplete: Boolean(
          input.request.visualContextProfile.summary &&
            input.request.visualContextProfile.detailedDescription,
        ),
      },
    },
    renderedPrompt: {
      promptVersion: CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
      systemMessage: SEMANTIC_REVIEW_SYSTEM_PROMPT,
      userMessage: input.prompt,
    },
    providerRequest: input.providerRequest,
    patchValidationInput: input.patchValidationInput ?? {
      status: "NOT_REACHED",
      currentSmartProfile: toPatchProfileRecord(input.request.originalSmartProfile),
    },
  });
}

function semanticReviewFailure(
  category: Exclude<SemanticReviewDiagnostics["category"], "success">,
  stage: SemanticReviewDiagnostics["stage"],
  message = safeSemanticReviewErrorMessage(category),
  diagnostics: Omit<SemanticReviewDiagnostics, "category" | "stage"> = {},
): SemanticReviewError {
  return new SemanticReviewError(message, category, stage, diagnostics);
}

export async function runAiEnrichmentSemanticReviewPlayground(
  keys: { geminiApiKey: string; openAiApiKey?: string },
  request: AiEnrichmentSemanticReviewPlaygroundRequest,
): Promise<AiEnrichmentSemanticReviewPlaygroundResponse> {
  const invocationId = randomUUID();
  const settings = await loadCachedAiEnrichmentSettings({
    functionName: "runAiEnrichmentSemanticReviewPlayground",
    invocationId,
  });
  if (!settings.semanticReviewPlaygroundEnabled) {
    throw semanticReviewFailure(
      "business_precondition",
      "precondition",
      "Semantic Review experimental testing is OFF. Enable it in Settings before running Pass 2.",
      { rejectionReason: "experimental_disabled" },
    );
  }
  const configuredModelId = settings.semanticReviewerModelId;
  const target = resolveProviderTarget(
    configuredModelId.startsWith("gpt-") ? "openai" : "google",
  );
  const pass1TraceId = request.pass1TraceId?.trim() || undefined;
  const traceId = randomUUID();
  const traceStartedAt = new Date().toISOString();
  const eligibility = resolvePlaygroundEligibility({ request, settings });
  const responseFormat = buildSemanticReviewResponseFormat();
  const prompt = buildSemanticReviewPrompt({
    ...request,
    blockers: eligibility.reasonCodes,
    effectiveSmartProfile: request.originalSmartProfile,
  });
  const patchValidationNotReached = {
    status: "NOT_REACHED",
    currentSmartProfile: toPatchProfileRecord(request.originalSmartProfile),
  };
  let providerRequestSnapshot: SemanticReviewProviderRequestBody | undefined;
  const buildPass2Diagnostics = (patchValidationInput: unknown = patchValidationNotReached) =>
    buildSemanticReviewPlaygroundPass2Diagnostics({
      request,
      prompt,
      eligibility,
      providerRequest: providerRequestSnapshot,
      patchValidationInput,
    });
  const traceStages: Array<{
    stage:
      | "created"
      | "prompt_ready"
      | "request_sent"
      | "provider_response"
      | "provider_error"
      | "parsed"
      | "semantic_review"
      | "complete"
      | "failed";
    at: string;
      data?: Record<string, unknown>;
  }> = [
    { stage: "created", at: traceStartedAt },
    {
      stage: "prompt_ready",
      at: new Date().toISOString(),
      data: {
        promptVersion: CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
        textOnly: true,
        pass1TraceId: pass1TraceId ?? null,
      },
    },
  ];
  const traceInput = {
    title: request.title,
    description: request.description,
    categoryId: request.categoryId ?? null,
    categoryName: request.categoryName ?? null,
    visualContextProfile: request.visualContextProfile,
    originalSmartProfile: request.originalSmartProfile,
    effectiveSmartProfile: request.effectiveSmartProfile,
    blockers: eligibility.reasonCodes,
    objectiveBlockers: eligibility.objectiveBlockers,
    semanticBlockers: eligibility.semanticBlockers,
    pass2Eligibility: request.pass2Eligibility,
  };
  const traceBase = {
    schemaVersion: 1 as const,
    traceId,
    parentTraceId: pass1TraceId,
    source: "PLAYGROUND" as const,
    pass: "PASS 2" as const,
    captureFullTrace: request.captureFullTrace === true,
    startedAt: traceStartedAt,
    provider: target.providerId,
    model: configuredModelId,
    promptVersion: CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
    prompt: {
      effectiveSystem: SEMANTIC_REVIEW_SYSTEM_PROMPT,
      effectiveUser: prompt,
    },
    input: traceInput,
    responseContract: responseFormat,
    requestMetadata: {
      pass1TraceId: pass1TraceId ?? null,
      promptVersion: CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
      textOnly: true,
      imageCount: 0,
      maxCompletionTokens: SEMANTIC_REVIEW_MAX_COMPLETION_TOKENS,
      requestOptions: {
        max_completion_tokens: SEMANTIC_REVIEW_MAX_COMPLETION_TOKENS,
      },
      semanticReviewPlaygroundEnabled:
        settings.semanticReviewPlaygroundEnabled,
    },
    smartProfile: {
      aiProduced: request.originalSmartProfile as unknown as Record<
        string,
        unknown
      >,
      effective: request.effectiveSmartProfile as unknown as Record<
        string,
        unknown
      >,
    },
    vcp: request.visualContextProfile as unknown as Record<string, unknown>,
    decisions: {
      initial: {
        objectiveBlockers: eligibility.objectiveBlockers,
        semanticBlockers: eligibility.semanticBlockers,
        reasonCodes: eligibility.reasonCodes,
      },
    },
    pass2: {
      pass1TraceId: pass1TraceId ?? null,
      input: traceInput,
    },
    pass2Diagnostics: buildPass2Diagnostics(),
  };
  const persistTrace = async (
    lifecycleState:
      | "prompt_ready"
      | "request_sent"
      | "provider_response"
      | "provider_error"
      | "parsed"
      | "semantic_review"
      | "complete"
      | "failed",
    extra: Record<string, unknown> = {},
  ): Promise<void> => {
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
  const failWithTrace = async (error: SemanticReviewError): Promise<never> => {
    const diagnostics = error.diagnostics;
    if (diagnostics.patchValidation) {
      traceBase.pass2Diagnostics = buildPass2Diagnostics(
        { status: "REACHED", ...diagnostics.patchValidation },
      );
    }
    const { rawProviderResponse, ...safeDiagnostics } = diagnostics;
    const failedPass2Cost = estimateVisionCostUsd(
      configuredModelId,
      diagnostics.promptTokens ?? null,
      diagnostics.completionTokens ?? null,
    );
    const providerFailure =
      error.category === "provider_upstream_failure" ||
      error.category === "timeout_network";
    const parserFailure =
      error.category === "response_extraction_failure" ||
      error.category === "malformed_json" ||
      error.category === "semantic_result_validation_failure" ||
      error.category === "patch_validation_failure";
    if (
      diagnostics.responseContentShape ||
      diagnostics.httpStatus !== undefined
    ) {
      traceStages.push({
        stage: "provider_response",
        at: new Date().toISOString(),
        data: { ...safeDiagnostics },
      });
    }
    if (providerFailure) {
      traceStages.push({
        stage: "provider_error",
        at: new Date().toISOString(),
        data: { ...safeDiagnostics },
      });
    }
    traceStages.push({
      stage: "failed",
      at: new Date().toISOString(),
      data: {
        failureCategory: error.category,
        failureStage: error.stage,
        parser: parserFailure ? "FAILED" : "NOT REACHED",
        normalized: "NOT REACHED",
        vcp: "NOT REACHED",
        candidate: "NOT REACHED",
        persistence: "NOT REACHED",
        diagnostics: { ...safeDiagnostics },
      },
    });
    await persistTrace("failed", {
      providerError: { ...safeDiagnostics },
      ...(failedPass2Cost === null
        ? {}
        : { costs: { pass2: { totalUsd: failedPass2Cost } } }),
      ...(rawProviderResponse === undefined
        ? {}
        : {
            providerResponse: {
              raw: rawProviderResponse,
              shape: {
                content: diagnostics.responseContentShape,
                choices: diagnostics.responseChoiceCount,
              },
              finishReason: diagnostics.finishReason,
              usage: {
                promptTokens: diagnostics.promptTokens,
                completionTokens: diagnostics.completionTokens,
              },
            },
          }),
      pass2: {
        ...traceBase.pass2,
        pass1TraceId: pass1TraceId ?? null,
        failureCategory: error.category,
        failureStage: error.stage,
      },
      testResult: "FAIL",
    });
    logPipelineEvent("semantic_review.playground.failed", {
      traceId,
      pass1TraceId: pass1TraceId ?? null,
      ...safeDiagnostics,
    });
    throw error;
  };

  await persistTrace("prompt_ready");

  const apiKey =
    target.providerId === "openai"
      ? (keys.openAiApiKey ?? "")
      : keys.geminiApiKey;
  if (!apiKey) {
    return failWithTrace(
      semanticReviewFailure(
        "business_precondition",
        "precondition",
        "Semantic Review cannot run because the configured AI provider is unavailable.",
      ),
    );
  }

  if (eligibility.objectiveBlockers.length > 0) {
    return failWithTrace(
      semanticReviewFailure(
        "business_precondition",
        "precondition",
        "Semantic Review cannot run because objective issues remain.",
        { rejectionReason: "objective_blocker" },
      ),
    );
  }
  if (eligibility.semanticBlockers.length === 0) {
    return failWithTrace(
      semanticReviewFailure(
        "business_precondition",
        "precondition",
        "Semantic Review is not needed for this result.",
        { rejectionReason: "no_eligible_semantic_blocker" },
      ),
    );
  }
  if (
    !request.visualContextProfile.summary ||
    !request.visualContextProfile.detailedDescription
  ) {
    return failWithTrace(
      semanticReviewFailure(
        "business_precondition",
        "precondition",
        "Semantic Review cannot run because Visual Context is incomplete.",
        { rejectionReason: "visual_context_incomplete" },
      ),
    );
  }

  traceStages.push({
    stage: "request_sent",
    at: new Date().toISOString(),
    data: {
      textOnly: true,
      imageCount: 0,
      requestOptions: {
        max_completion_tokens: SEMANTIC_REVIEW_MAX_COMPLETION_TOKENS,
      },
      responseFormat,
    },
  });
  await persistTrace("request_sent");

  let result: Awaited<ReturnType<typeof callSemanticReviewer>>;
  try {
    result = await callSemanticReviewer({
      apiKey,
      providerTarget: target,
      modelId: configuredModelId,
      designId: "playground",
      prompt,
      currentSmartProfile: toPatchProfileRecord(request.originalSmartProfile),
      captureFullTrace: request.captureFullTrace === true,
      onRequestReady: async (requestBody) => {
        providerRequestSnapshot = requestBody;
        traceBase.pass2Diagnostics = buildPass2Diagnostics();
        await persistTrace("request_sent");
      },
    });
  } catch (error) {
    const semanticError =
      error instanceof SemanticReviewError
        ? error
        : semanticReviewFailure(
            "unknown_internal",
            "unknown",
            safeSemanticReviewErrorMessage("unknown_internal"),
            { errorName: error instanceof Error ? error.name : "UnknownError" },
          );
    return failWithTrace(semanticError);
  }

  traceBase.pass2Diagnostics = buildPass2Diagnostics(
    result.diagnostics.patchValidation
      ? { status: "REACHED", ...result.diagnostics.patchValidation }
      : patchValidationNotReached,
  );

  traceStages.push({
    stage: "provider_response",
    at: new Date().toISOString(),
    data: { ...result.diagnostics },
  });
  traceStages.push({
    stage: "parsed",
    at: new Date().toISOString(),
    data: {
      parser: "REACHED",
      semanticResult: result.result,
    },
  });

  let projected: ReturnType<typeof projectSemanticReviewPlaygroundResult>;
  try {
    projected = projectSemanticReviewPlaygroundResult({
      originalSmartProfile: request.originalSmartProfile,
      title: request.title,
      description: request.description,
      categoryId: request.categoryId,
      categoryName: request.categoryName,
      visualContextProfile: request.visualContextProfile,
      reviewResult: result.result,
      initialEligibleBlockers: eligibility.semanticBlockers,
      catalogWorkflowMode: settings.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled,
    });
  } catch (error) {
    const semanticError =
      error instanceof SemanticReviewError
        ? error
        : semanticReviewFailure(
            "unknown_internal",
            "unknown",
            safeSemanticReviewErrorMessage("unknown_internal"),
            { errorName: error instanceof Error ? error.name : "UnknownError" },
          );
    return failWithTrace(semanticError);
  }
  traceStages.push({
    stage: "semantic_review",
    at: new Date().toISOString(),
    data: {
      decision: result.result.decision,
      reviewerReportedBlockersResolved: result.result.blockersResolved,
      reviewerReportedBlockersUnresolved: result.result.blockersUnresolved,
      deterministicBlockersResolved: projected.deterministicBlockersResolved,
      deterministicBlockersUnresolved:
        projected.deterministicBlockersUnresolved,
      patches: result.result.patches ?? [],
      finalDecision: projected.finalAutomationDecision,
      finalObjectiveBlockers: projected.finalObjectiveBlockers,
      finalSemanticBlockers: projected.finalSemanticBlockers,
    },
  });
  traceStages.push({
    stage: "complete",
    at: new Date().toISOString(),
    data: {
      actual: projected.finalAutomationDecision,
      testResult: "PASS",
    },
  });
  await persistTrace("complete", {
    providerResponse: {
      raw:
        request.captureFullTrace === true ? result.rawProviderResponse : undefined,
      shape: {
        content: result.diagnostics.responseContentShape,
        choices: result.diagnostics.responseChoiceCount,
      },
      usage: {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      },
      finishReason: result.diagnostics.finishReason,
    },
    smartProfile: {
      aiProduced: request.originalSmartProfile,
      effective: projected.effectiveSmartProfile,
    },
    vcp: request.visualContextProfile,
    decisions: {
      initial: {
        objectiveBlockers: eligibility.objectiveBlockers,
        semanticBlockers: eligibility.semanticBlockers,
      },
      final: projected.finalAutomationDecision,
    },
    pass2: {
      pass1TraceId: pass1TraceId ?? null,
      input: {
        ...traceInput,
      },
      output: {
        result: result.result,
        effectiveSmartProfile: projected.effectiveSmartProfile,
        finalAutomationDecision: projected.finalAutomationDecision,
        deterministicBlockersResolved: projected.deterministicBlockersResolved,
        deterministicBlockersUnresolved:
          projected.deterministicBlockersUnresolved,
        reviewerReportedBlockers: projected.reviewerReportedBlockers,
      },
    },
    costs: {
      pass2:
        result.estimatedCostUsd === null
          ? undefined
          : { totalUsd: result.estimatedCostUsd },
    },
    actual: projected.finalAutomationDecision,
    testResult: "PASS",
  });
  return {
    result: result.result,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    estimatedCostUsd: result.estimatedCostUsd,
    provider:
      result.provider as AiEnrichmentSemanticReviewPlaygroundResponse["provider"],
    model: result.model,
    promptVersion: result.promptVersion,
    traceId,
    pass1TraceId,
    ...projected,
  };
}
