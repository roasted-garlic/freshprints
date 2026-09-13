import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  hasRequiredAiEnrichmentPromptPlaceholders,
} from "../../packages/shared/src/constants/aiEnrichment.constants";
import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import {
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import {
  resolveVisionModelId,
  type AllowedVisionModelId,
} from "./ai/aiEnrichmentConfig";
import { AI_ENRICHMENT_SETTINGS_DOC_ID } from "./ai/loadAiEnrichmentSettings";
import { clearAiEnrichmentRuntimeCache } from "./ai/aiEnrichmentRuntimeCache";
import { logPipelineEvent } from "./lib/pipelineLog";
import { normalizeExplicitContentAutomationTermsInput } from "../../packages/shared/src/utils/explicitContentAutomation";

interface UpdateAiEnrichmentSettingsRequest {
  visionModelId: string;
  promptTemplate: string;
  semanticReviewerModelId?: string;
  /** When provided (including []), persist normalized list. When omitted, leave Firestore field unchanged. */
  explicitContentAutomationTerms?: string[];
}

interface UpdateAiEnrichmentSettingsResponse {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  semanticReviewerModelId: AllowedVisionModelId;
  explicitContentAutomationTerms?: string[];
}

function assertOwnerAdminCaller(
  caller: Awaited<ReturnType<typeof loadCallerProfile>>,
): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied(
      "Only owners and admins can update AI enrichment settings.",
    );
  }
}

function validateRequest(data: unknown): UpdateAiEnrichmentSettingsRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const visionModelId =
    "visionModelId" in data && typeof data.visionModelId === "string"
      ? data.visionModelId.trim()
      : "";

  if (!visionModelId) {
    throw invalidArgument("A vision model ID is required.");
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
      `The AI processing prompt must include ${AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER}.`,
    );
  }

  const semanticReviewerModelId =
    "semanticReviewerModelId" in data &&
    typeof data.semanticReviewerModelId === "string"
      ? data.semanticReviewerModelId.trim()
      : undefined;

  const explicitContentAutomationTerms =
    "explicitContentAutomationTerms" in data
      ? data.explicitContentAutomationTerms
      : undefined;

  if (
    explicitContentAutomationTerms !== undefined &&
    explicitContentAutomationTerms !== null &&
    !Array.isArray(explicitContentAutomationTerms)
  ) {
    throw invalidArgument(
      "explicitContentAutomationTerms must be an array of strings.",
    );
  }

  return {
    visionModelId,
    promptTemplate,
    semanticReviewerModelId,
    explicitContentAutomationTerms: Array.isArray(
      explicitContentAutomationTerms,
    )
      ? explicitContentAutomationTerms
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
      promptTemplate,
      semanticReviewerModelId: requestedSemanticReviewerModelId,
      explicitContentAutomationTerms: requestedExplicitTerms,
    } = validateRequest(request.data);
    const resolvedModelId = resolveVisionModelId(requestedModelId);

    if (resolvedModelId !== requestedModelId) {
      throw invalidArgument("The selected vision model is not allowed.");
    }

    const resolvedSemanticReviewerModelId = resolveVisionModelId(
      requestedSemanticReviewerModelId ?? "gemini-2.5-flash-lite",
    );
    if (
      resolvedSemanticReviewerModelId !==
      (requestedSemanticReviewerModelId ?? "gemini-2.5-flash-lite")
    ) {
      throw invalidArgument(
        "The selected semantic reviewer model is not allowed.",
      );
    }
    const resolvedExplicitTerms =
      requestedExplicitTerms !== undefined
        ? normalizeExplicitContentAutomationTermsInput(requestedExplicitTerms)
        : undefined;

    await adminDb
      .collection("settings")
      .doc(AI_ENRICHMENT_SETTINGS_DOC_ID)
      .set(
        {
          visionModelId: resolvedModelId,
          promptTemplate,
          semanticReviewerModelId: resolvedSemanticReviewerModelId,
          ...(resolvedExplicitTerms !== undefined
            ? { explicitContentAutomationTerms: resolvedExplicitTerms }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid,
        },
        { merge: true },
      );

    clearAiEnrichmentRuntimeCache();

    logPipelineEvent("settings.ai_enrichment.updated", {
      visionModelId: resolvedModelId,
      promptTemplate,
      semanticReviewerModelId: resolvedSemanticReviewerModelId,
      explicitContentAutomationTermsCount:
        resolvedExplicitTerms?.length ?? null,
      updatedBy: request.auth.uid,
    });

    return {
      visionModelId: resolvedModelId,
      promptTemplate,
      semanticReviewerModelId: resolvedSemanticReviewerModelId,
      ...(resolvedExplicitTerms !== undefined
        ? { explicitContentAutomationTerms: resolvedExplicitTerms }
        : {}),
    };
  },
);
