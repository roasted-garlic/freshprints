import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";

import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { openAiApiKeySecret } from "./lib/secrets";
import { adminDb } from "./lib/admin";
import { runAiEnrichmentPipeline } from "./ai/aiEnrichmentPipeline";
import {
  AI_ENRICHMENT_ACTIVE_STAGES,
  AI_ENRICHMENT_MAX_INSTANCES,
  AI_ENRICHMENT_STALE_STAGE_MS,
} from "./ai/aiEnrichmentConfig";
import {
  isRerunFromReviewEligible,
  parseEnqueueAiEnrichmentRequest,
  shouldAllowAiEnqueueForReviewStatus,
} from "./ai/enqueueAiEnrichmentValidation";
import { logPipelineEvent } from "./lib/pipelineLog";

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
  { secrets: [openAiApiKeySecret] },
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

    const { designId, rerunRejected, rerunFromReview } = parsedRequest;
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

    logPipelineEvent(eventName, {
      designId,
      callerUid: request.auth.uid,
    });
    return { designId, queued: true };
  },
);

export const onDesignAiEnrichmentQueued = onDocumentUpdated(
  {
    document: "designs/{designId}",
    secrets: [openAiApiKeySecret],
    timeoutSeconds: 180,
    memory: "512MiB",
    maxInstances: AI_ENRICHMENT_MAX_INSTANCES,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after || after.aiProcessingStage !== "queued") {
      return;
    }

    if (before?.aiProcessingStage === "queued") {
      return;
    }

    const designId = event.params.designId;
    logPipelineEvent("trigger.fired", {
      designId,
      previousStage: before?.aiProcessingStage ?? null,
    });
    await runAiEnrichmentPipeline(designId, openAiApiKeySecret.value());
  },
);
