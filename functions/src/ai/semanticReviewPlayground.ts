import { randomUUID } from "node:crypto";

import type {
  AiEnrichmentSemanticReviewPlaygroundRequest,
  AiEnrichmentSemanticReviewPlaygroundResponse,
} from "../../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import {
  getSemanticReviewEligibleBlockers,
  getSemanticReviewObjectiveBlockers,
} from "../../../packages/shared/src/utils/semanticReviewPolicy";
import { computeCatalogAutomationDecision } from "./automationDecisionShadow";
import {
  applySemanticReviewPatches,
  buildSemanticReviewPrompt,
} from "./semanticReviewCore";
import { callSemanticReviewer } from "./semanticReviewProvider";
import { resolveProviderTarget } from "./providers/resolveProviderTarget";
import { loadCachedAiEnrichmentSettings } from "./aiEnrichmentRuntimeCache";

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
  let finalAutomationDecision = computeCatalogAutomationDecision({
    smartProfile: effectiveSmartProfile,
    title: input.title,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    description: input.description,
    visibleText: effectiveSmartProfile.visibleText,
    catalogWorkflowMode: input.catalogWorkflowMode,
    catalogAutonomousLiveEnabled: input.catalogAutonomousLiveEnabled,
  });

  if (
    input.reviewResult.decision === "NEEDS_REVIEW" ||
    input.reviewResult.blockersUnresolved.length > 0
  ) {
    finalAutomationDecision = {
      ...finalAutomationDecision,
      decision: "needs_review",
      wouldAutoApprove: false,
      shouldPublishReady: false,
      reasonCodes: [
        ...new Set([
          ...finalAutomationDecision.reasonCodes,
          ...input.reviewResult.blockersUnresolved,
          "semantic_review_needs_review",
        ]),
      ],
    };
  }

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
    finalSemanticBlockers: getSemanticReviewEligibleBlockers(
      finalAutomationDecision.reasonCodes,
    ),
  };
}

export async function runAiEnrichmentSemanticReviewPlayground(
  keys: { geminiApiKey: string; openAiApiKey?: string },
  request: AiEnrichmentSemanticReviewPlaygroundRequest,
): Promise<AiEnrichmentSemanticReviewPlaygroundResponse> {
  const settings = await loadCachedAiEnrichmentSettings({
    functionName: "runAiEnrichmentSemanticReviewPlayground",
    invocationId: randomUUID(),
  });
  const configuredModelId = settings.semanticReviewerModelId;
  const target = resolveProviderTarget(
    configuredModelId.startsWith("gpt-") ? "openai" : "google",
  );
  const apiKey =
    target.providerId === "openai"
      ? (keys.openAiApiKey ?? "")
      : keys.geminiApiKey;
  if (!apiKey)
    throw new Error(`No API key configured for ${target.providerId}.`);
  const eligibility = resolvePlaygroundEligibility({ request, settings });
  if (eligibility.objectiveBlockers.length > 0) {
    throw new Error(
      `Semantic Review is blocked by objective issues: ${eligibility.objectiveBlockers.join(", ")}.`,
    );
  }
  if (eligibility.semanticBlockers.length === 0) {
    throw new Error("Semantic Review is not needed for this result.");
  }
  if (
    !request.visualContextProfile.summary ||
    !request.visualContextProfile.detailedDescription
  ) {
    throw new Error(
      "Semantic Review is unavailable because Visual Context is incomplete.",
    );
  }
  const result = await callSemanticReviewer({
    apiKey,
    providerTarget: target,
    modelId: configuredModelId,
    designId: "playground",
    prompt: buildSemanticReviewPrompt({
      ...request,
      blockers: eligibility.reasonCodes,
      effectiveSmartProfile: request.originalSmartProfile,
    }),
    currentSmartProfile: toPatchProfileRecord(request.originalSmartProfile),
  });
  const projected = projectSemanticReviewPlaygroundResult({
    originalSmartProfile: request.originalSmartProfile,
    title: request.title,
    description: request.description,
    categoryId: request.categoryId,
    categoryName: request.categoryName,
    visualContextProfile: request.visualContextProfile,
    reviewResult: result.result,
    catalogWorkflowMode: settings.catalogWorkflowMode,
    catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled,
  });
  return {
    ...result,
    provider:
      result.provider as AiEnrichmentSemanticReviewPlaygroundResponse["provider"],
    ...projected,
  };
}
