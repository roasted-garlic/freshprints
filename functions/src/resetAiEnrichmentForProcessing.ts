import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { logPipelineMilestone } from "./ai/pipelineTiming";

interface ResetAiEnrichmentRequest {
  designId: string;
}

interface ResetAiEnrichmentResponse {
  designId: string;
  reset: true;
  aiReviewStatus: "pending";
  status: "imported";
}

function assertStaffCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin", "helper"].includes(caller.role)) {
    throw permissionDenied("Only active staff can reset AI processing.");
  }
}

function parseRequest(data: unknown): ResetAiEnrichmentRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const designId = "designId" in data && typeof data.designId === "string" ? data.designId.trim() : "";

  if (!designId) {
    throw invalidArgument("A design ID is required.");
  }

  return { designId };
}

function assertResetEligible(design: Record<string, unknown>): void {
  const isNeedsReview = design.status === "imported" && design.aiReviewStatus === "needs_review";
  const isRejected = design.status === "rejected";

  if (!isNeedsReview && !isRejected) {
    throw failedPrecondition("Only Needs Review or Rejected designs can be reset for AI processing.");
  }
}

export const resetAiEnrichmentForProcessing = onCall(
  async (request): Promise<ResetAiEnrichmentResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);

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

    assertResetEligible(design);

    await designRef.update({
      status: "imported",
      aiReviewStatus: "pending",
      aiProcessed: false,
      aiReviewed: false,
      aiProcessingStage: FieldValue.delete(),
      aiRequestedVisionModelId: FieldValue.delete(),
      aiRequestedReasoningEffort: FieldValue.delete(),
      aiSuggestions: FieldValue.delete(),
      aiAnalysis: FieldValue.delete(),
      smartProfile: FieldValue.delete(),
      aiReviewedAt: FieldValue.delete(),
      aiReviewedBy: FieldValue.delete(),
      aiReviewNotes: FieldValue.delete(),
      aiReviewConfidence: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logPipelineMilestone("ai.reset_for_processing", {
      designId,
      callerUid: request.auth.uid,
    });

    return {
      designId,
      reset: true,
      aiReviewStatus: "pending",
      status: "imported",
    };
  },
);
