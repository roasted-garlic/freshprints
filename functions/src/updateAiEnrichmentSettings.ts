import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import {
  resolveOpenAiVisionModelId,
  type AllowedOpenAiVisionModelId,
} from "./ai/aiEnrichmentConfig";
import { AI_ENRICHMENT_SETTINGS_DOC_ID } from "./ai/loadAiEnrichmentSettings";
import { resolveAdditionalTagExclusions } from "./ai/aiTagExclusions";
import { logPipelineEvent } from "./lib/pipelineLog";

interface UpdateAiEnrichmentSettingsRequest {
  visionModelId: string;
  additionalTagExclusions?: string[];
}

interface UpdateAiEnrichmentSettingsResponse {
  visionModelId: AllowedOpenAiVisionModelId;
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

  if (!visionModelId) {
    throw invalidArgument("A vision model ID is required.");
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
    visionModelId,
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

    const { visionModelId: requestedModelId, additionalTagExclusions } = validateRequest(request.data);
    const resolvedModelId = resolveOpenAiVisionModelId(requestedModelId);

    if (resolvedModelId !== requestedModelId) {
      throw invalidArgument("The selected vision model is not allowed.");
    }

    const resolvedAdditionalTagExclusions = resolveAdditionalTagExclusions(additionalTagExclusions);

    await adminDb.collection("settings").doc(AI_ENRICHMENT_SETTINGS_DOC_ID).set(
      {
        visionModelId: resolvedModelId,
        additionalTagExclusions: resolvedAdditionalTagExclusions,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      },
      { merge: true },
    );

    logPipelineEvent("settings.ai_enrichment.updated", {
      visionModelId: resolvedModelId,
      additionalTagExclusionsCount: resolvedAdditionalTagExclusions.length,
      updatedBy: request.auth.uid,
    });

    return {
      visionModelId: resolvedModelId,
      additionalTagExclusions: resolvedAdditionalTagExclusions,
    };
  },
);
