/**
 * Owner-only: demote a Ready+approved design into AI Processing / Needs Review
 * so enrichment regenerates against the current prompt + taxonomy.
 *
 * Does NOT wipe smartProfile (unlike resetAiEnrichmentForProcessing).
 * Retains root title/description/categoryId and readyAt chronology.
 *
 *   Callable name: reprocessReadyDesignWithAi
 */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { geminiApiKeySecret } from "./lib/secrets";
import { runAiEnrichmentPipeline } from "./ai/aiEnrichmentPipeline";
import {
  AI_ENRICHMENT_ACTIVE_STAGES,
  AI_ENRICHMENT_STALE_STAGE_MS,
} from "./ai/aiEnrichmentConfig";
import { logPipelineEvent } from "./lib/pipelineLog";
import { logPipelineMilestone } from "./ai/pipelineTiming";
import {
  assertReadyDesignEligibleForOwnerAiReprocess,
  buildOwnerReadyAiReprocessDemotionUpdate,
} from "./ai/reprocessReadyDesignWithAiCore";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only the active owner can reprocess Ready designs with AI.");
  }
}

function parseRequest(data: unknown): { designId: string } {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const designId = "designId" in data && typeof data.designId === "string" ? data.designId.trim() : "";
  if (!designId) {
    throw invalidArgument("A design ID is required.");
  }
  return { designId };
}

function isActiveNonStaleProcessing(design: Record<string, unknown>): boolean {
  const stage = design.aiProcessingStage;
  if (!stage || stage === "failed" || stage === "ready_for_review") {
    return false;
  }
  if (!AI_ENRICHMENT_ACTIVE_STAGES.includes(stage as (typeof AI_ENRICHMENT_ACTIVE_STAGES)[number])) {
    return false;
  }
  const updatedAt = design.updatedAt;
  if (!(updatedAt instanceof Timestamp)) {
    return false;
  }
  return Date.now() - updatedAt.toMillis() <= AI_ENRICHMENT_STALE_STAGE_MS;
}

export const reprocessReadyDesignWithAi = onCall(
  { secrets: [geminiApiKeySecret], timeoutSeconds: 180, memory: "512MiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerCaller(caller);

    const { designId } = parseRequest(request.data);
    const designRef = adminDb.collection("designs").doc(designId);
    const designSnapshot = await designRef.get();

    if (!designSnapshot.exists) {
      throw invalidArgument("Design not found.");
    }

    const design = designSnapshot.data();
    if (!design) {
      throw invalidArgument("Design not found.");
    }

    const eligibility = assertReadyDesignEligibleForOwnerAiReprocess(design);
    if (!eligibility.ok) {
      if (eligibility.code === "already_processing") {
        throw failedPrecondition(
          "This design is already being processed. Wait for it to finish or use AI Processing retry.",
        );
      }
      if (eligibility.code === "not_ready") {
        throw failedPrecondition(
          "Only Ready approved Design Library designs can be reprocessed with AI.",
        );
      }
      throw failedPrecondition(eligibility.message);
    }

    if (isActiveNonStaleProcessing(design)) {
      throw failedPrecondition(
        "This design is already being processed. Wait for it to finish or use AI Processing retry.",
      );
    }

    const demotion = buildOwnerReadyAiReprocessDemotionUpdate({
      callerUid: request.auth.uid,
      now: FieldValue.serverTimestamp(),
    });

    await designRef.update(demotion);

    logPipelineMilestone("ai.owner_ready_reprocess.demoted", {
      designId,
      callerUid: request.auth.uid,
    });

    try {
      await runAiEnrichmentPipeline(designId, geminiApiKeySecret.value(), { mode: "queue" });
    } catch (error) {
      logPipelineEvent("ai.owner_ready_reprocess.pipeline_error", {
        designId,
        callerUid: request.auth.uid,
        message: error instanceof Error ? error.message : String(error),
      });
      // Demotion already applied; leave recoverable failed/pending state for AI Review retry.
      throw error;
    }

    const afterSnap = await designRef.get();
    const after = afterSnap.data() || {};

    logPipelineEvent("ai.owner_ready_reprocess.completed", {
      designId,
      callerUid: request.auth.uid,
      status: after.status ?? null,
      aiReviewStatus: after.aiReviewStatus ?? null,
      aiProcessingStage: after.aiProcessingStage ?? null,
    });

    return {
      designId,
      demoted: true as const,
      status: after.status ?? "imported",
      aiReviewStatus: after.aiReviewStatus ?? null,
      aiProcessingStage: after.aiProcessingStage ?? null,
      readyAtPreserved: after.readyAt != null,
    };
  },
);
