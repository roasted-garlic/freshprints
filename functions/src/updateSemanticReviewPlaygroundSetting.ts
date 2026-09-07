import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { AI_ENRICHMENT_SETTINGS_DOC_ID } from "./ai/loadAiEnrichmentSettings";
import { clearAiEnrichmentRuntimeCache } from "./ai/aiEnrichmentRuntimeCache";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { logPipelineEvent } from "./lib/pipelineLog";

export function assertOwnerCaller(
  caller: Awaited<ReturnType<typeof loadCallerProfile>>,
): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied(
      "Only the owner can manage the Semantic Review experimental setting.",
    );
  }
}

export function validateEnabled(data: unknown): boolean {
  if (!data || typeof data !== "object" || !("enabled" in data)) {
    throw invalidArgument("enabled must be a boolean.");
  }
  if (typeof data.enabled !== "boolean") {
    throw invalidArgument("enabled must be a boolean.");
  }
  return data.enabled;
}

/**
 * `invoker: "public"` is required for Gen2 callable CORS preflight (OPTIONS has no
 * Authorization header). Firebase Auth + owner role are still enforced below.
 * Without allUsers run.invoker, Cloud Run returns 403 "Empty Authorization header".
 */
export const updateSemanticReviewPlaygroundSetting = onCall(
  { invoker: "public" },
  async (request) => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerCaller(caller);
    const enabled = validateEnabled(request.data);

    await adminDb
      .collection("settings")
      .doc(AI_ENRICHMENT_SETTINGS_DOC_ID)
      .set(
        {
          semanticReviewPlaygroundEnabled: enabled,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid,
        },
        { merge: true },
      );

    clearAiEnrichmentRuntimeCache();
    logPipelineEvent("settings.semantic_review_playground.updated", {
      enabled,
      updatedBy: request.auth.uid,
    });

    return { semanticReviewPlaygroundEnabled: enabled };
  },
);