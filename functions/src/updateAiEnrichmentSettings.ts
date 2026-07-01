import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  hasRequiredAiEnrichmentPromptPlaceholders,
} from "../../shared/constants/aiEnrichment.constants";
import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import {
  resolveOpenAiReasoningEffort,
  resolveVisionModelId,
  type AllowedOpenAiReasoningEffort,
  type AllowedVisionModelId,
} from "./ai/aiEnrichmentConfig";
import { AI_ENRICHMENT_SETTINGS_DOC_ID } from "./ai/loadAiEnrichmentSettings";
import { resolveAdditionalTagExclusions } from "./ai/aiTagExclusions";
import { clearAiEnrichmentRuntimeCache } from "./ai/aiEnrichmentRuntimeCache";
import { logPipelineEvent } from "./lib/pipelineLog";

interface UpdateAiEnrichmentSettingsRequest {
  reasoningEffort: string;
  visionModelId: string;
  promptTemplate: string;
  additionalTagExclusions?: string[];
}

interface UpdateAiEnrichmentSettingsResponse {
  reasoningEffort: AllowedOpenAiReasoningEffort;
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  additionalTagExclusions: string[];
}

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can update AI enrichment settings.");
  }
}

function validateRequest(data: unknown): UpdateAiEnrichmentSettingsRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const visionModelId =
    "visionModelId" in data && typeof data.visionModelId === "string" ? data.visionModelId.trim() : "";
  const reasoningEffort =
    "reasoningEffort" in data && typeof data.reasoningEffort === "string"
      ? data.reasoningEffort.trim()
      : "";

  if (!visionModelId) {
    throw invalidArgument("A vision model ID is required.");
  }

  if (!reasoningEffort) {
    throw invalidArgument("A reasoning effort value is required.");
  }

  const promptTemplate =
    "promptTemplate" in data && typeof data.promptTemplate === "string"
      ? data.promptTemplate.trim()
      : "";

  if (!promptTemplate) {
    throw invalidArgument("An AI processing prompt is required.");
  }

  if (promptTemplate.length > AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH) {
    throw invalidArgument("The AI processing prompt is too long.");
  }

  if (!hasRequiredAiEnrichmentPromptPlaceholders(promptTemplate)) {
    throw invalidArgument(
      `The AI processing prompt must include ${AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER}.`,
    );
  }

  const additionalTagExclusions =
    "additionalTagExclusions" in data ? data.additionalTagExclusions : undefined;

  if (
    additionalTagExclusions !== undefined &&
    additionalTagExclusions !== null &&
    !Array.isArray(additionalTagExclusions)
  ) {
    throw invalidArgument("Additional tag exclusions must be an array of strings.");
  }

  return {
    reasoningEffort,
    visionModelId,
    promptTemplate,
    additionalTagExclusions: Array.isArray(additionalTagExclusions)
      ? additionalTagExclusions
      : undefined,
  };
}

export const updateAiEnrichmentSettings = onCall(
  async (request): Promise<UpdateAiEnrichmentSettingsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdminCaller(caller);

    const {
      visionModelId: requestedModelId,
      reasoningEffort: requestedReasoningEffort,
      promptTemplate,
      additionalTagExclusions,
    } = validateRequest(request.data);
    const resolvedModelId = resolveVisionModelId(requestedModelId);
    const resolvedReasoningEffort = resolveOpenAiReasoningEffort(requestedReasoningEffort);

    if (resolvedModelId !== requestedModelId) {
      throw invalidArgument("The selected vision model is not allowed.");
    }

    if (resolvedReasoningEffort !== requestedReasoningEffort) {
      throw invalidArgument("The selected reasoning effort is not allowed.");
    }

    const resolvedAdditionalTagExclusions = resolveAdditionalTagExclusions(additionalTagExclusions);

    await adminDb.collection("settings").doc(AI_ENRICHMENT_SETTINGS_DOC_ID).set(
      {
        visionModelId: resolvedModelId,
        reasoningEffort: resolvedReasoningEffort,
        promptTemplate,
        additionalTagExclusions: resolvedAdditionalTagExclusions,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      },
      { merge: true },
    );

    clearAiEnrichmentRuntimeCache();

    logPipelineEvent("settings.ai_enrichment.updated", {
      visionModelId: resolvedModelId,
      reasoningEffort: resolvedReasoningEffort,
      promptTemplate,
      additionalTagExclusionsCount: resolvedAdditionalTagExclusions.length,
      updatedBy: request.auth.uid,
    });

    return {
      reasoningEffort: resolvedReasoningEffort,
      visionModelId: resolvedModelId,
      promptTemplate,
      additionalTagExclusions: resolvedAdditionalTagExclusions,
    };
  },
);
