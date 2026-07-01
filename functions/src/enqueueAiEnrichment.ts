import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { geminiApiKeySecret, openAiApiKeySecret } from "./lib/secrets";
import { adminDb } from "./lib/admin";
import { runAiEnrichmentPipeline } from "./ai/aiEnrichmentPipeline";
import {
  AI_ENRICHMENT_ACTIVE_STAGES,
  AI_ENRICHMENT_STALE_STAGE_MS,
} from "./ai/aiEnrichmentConfig";
import {
  isRerunFromReviewEligible,
  parseEnqueueAiEnrichmentRequest,
  shouldAllowAiEnqueueForReviewStatus,
} from "./ai/enqueueAiEnrichmentValidation";
import { logPipelineEvent } from "./lib/pipelineLog";
import { logPipelineMilestone } from "./ai/pipelineTiming";

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can re-run AI suggestions for rejected designs.");
  }
}

function isStaleAiProcessing(design: Record<string, unknown>): boolean {
  const currentStage = design.aiProcessingStage;

  if (!currentStage) {
    return true;
  }

  if (currentStage === "failed" || currentStage === "ready_for_review") {
    return false;
  }

  if (!AI_ENRICHMENT_ACTIVE_STAGES.includes(currentStage as (typeof AI_ENRICHMENT_ACTIVE_STAGES)[number])) {
    return false;
  }

  const updatedAt = design.updatedAt;

  if (!(updatedAt instanceof Timestamp)) {
    return true;
  }

  return Date.now() - updatedAt.toMillis() > AI_ENRICHMENT_STALE_STAGE_MS;
}

export const enqueueAiEnrichment = onCall(
  { secrets: [openAiApiKeySecret, geminiApiKeySecret], timeoutSeconds: 180, memory: "512MiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);

    let parsedRequest;

    try {
      parsedRequest = parseEnqueueAiEnrichmentRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const { designId, rerunRejected, rerunFromReview, visionModelIdOverride, reasoningEffortOverride } = parsedRequest;
    const designRef = adminDb.collection("designs").doc(designId);
    const designSnapshot = await designRef.get();

    if (!designSnapshot.exists) {
      throw invalidArgument("Design not found.");
    }

    const design = designSnapshot.data();

    if (!design) {
      throw invalidArgument("Design not found.");
    }

    if (rerunFromReview) {
      if (!isRerunFromReviewEligible(design)) {
        throw failedPrecondition(
          "Only imported designs in Needs Review can be re-run from the review workspace.",
        );
      }
    } else if (design.status === "rejected") {
      if (!rerunRejected) {
        throw failedPrecondition("Rejected designs require rerunRejected to re-queue AI processing.");
      }

      assertOwnerAdminCaller(caller);
    } else if (design.status !== "imported") {
      throw failedPrecondition("Only imported designs can be enqueued for AI processing.");
    }

    if (!shouldAllowAiEnqueueForReviewStatus(design, { rerunRejected, rerunFromReview })) {
      throw failedPrecondition("This design is no longer eligible for automatic AI enqueue.");
    }

    const previewPath = design.previewPath || design.thumbnailPath;

    if (!previewPath) {
      throw failedPrecondition("Derivatives must be ready before AI processing can start.");
    }

    const currentStage = design.aiProcessingStage;
    const isRerun = rerunRejected || rerunFromReview;

    if (
      !isRerun &&
      currentStage &&
      currentStage !== "failed" &&
      currentStage !== "ready_for_review"
    ) {
      if (!isStaleAiProcessing(design)) {
        logPipelineEvent("enqueue.skipped", { designId, reason: "already_processing", currentStage });
        return { designId, queued: false, reason: "already_processing" };
      }

      logPipelineEvent("enqueue.stale_requeued", { designId, currentStage });
    }

    if (
      isRerun &&
      currentStage &&
      currentStage !== "failed" &&
      currentStage !== "ready_for_review" &&
      !isStaleAiProcessing(design)
    ) {
      logPipelineEvent("enqueue.skipped", { designId, reason: "already_processing", currentStage });
      return { designId, queued: false, reason: "already_processing" };
    }

    const updatePayload: Record<string, unknown> = {
      aiProcessingStage: "queued",
      aiReviewStatus: "pending",
      aiProcessed: false,
      aiReviewed: false,
      aiRequestedVisionModelId: visionModelIdOverride ?? FieldValue.delete(),
      aiRequestedReasoningEffort: reasoningEffortOverride ?? FieldValue.delete(),
      aiSuggestions: FieldValue.delete(),
      aiAnalysis: FieldValue.delete(),
      aiReviewedAt: FieldValue.delete(),
      aiReviewedBy: FieldValue.delete(),
      aiReviewNotes: FieldValue.delete(),
      aiReviewConfidence: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (design.status === "rejected") {
      updatePayload.status = "imported";
    }

    await designRef.update(updatePayload);

    const eventName = rerunFromReview
      ? "enqueue.rerun_from_review"
      : rerunRejected
        ? "enqueue.rerun_rejected"
        : "enqueue.queued";

    logPipelineMilestone(eventName, {
      designId,
      callerUid: request.auth.uid,
      visionModelIdOverride: visionModelIdOverride ?? null,
      reasoningEffortOverride: reasoningEffortOverride ?? null,
    });
    await runAiEnrichmentPipeline(designId, openAiApiKeySecret.value(), geminiApiKeySecret.value());
    const completedSnapshot = await designRef.get();
    const completedDesign = completedSnapshot.data() ?? {};

    logPipelineMilestone("enqueue.completed_direct", {
      designId,
      aiProcessingStage:
        typeof completedDesign.aiProcessingStage === "string"
          ? completedDesign.aiProcessingStage
          : null,
      aiReviewStatus:
        typeof completedDesign.aiReviewStatus === "string" ? completedDesign.aiReviewStatus : null,
      status: typeof completedDesign.status === "string" ? completedDesign.status : null,
    });

    return {
      designId,
      queued: true,
      completed: true,
      aiProcessingStage:
        typeof completedDesign.aiProcessingStage === "string"
          ? completedDesign.aiProcessingStage
          : null,
      aiReviewStatus:
        typeof completedDesign.aiReviewStatus === "string" ? completedDesign.aiReviewStatus : null,
      status: typeof completedDesign.status === "string" ? completedDesign.status : null,
    };
  },
);
