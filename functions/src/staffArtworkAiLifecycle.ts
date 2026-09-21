import type {
  StaffArtworkAiLifecycleRouting,
} from "../../packages/shared/src/types/staffArtwork/staffArtworkAiReview.types";

export function resolveStaffArtworkAiLifecycleRouting(
  design: Record<string, unknown> | null | undefined,
  options?: { isNewDesign?: boolean },
): StaffArtworkAiLifecycleRouting {
  if (options?.isNewDesign) {
    return { action: "plain_enqueue", reason: "new_imported_pending" };
  }

  if (!design) {
    return { action: "no_op", reason: "linked_design_missing" };
  }

  const status = design.status;
  const aiReviewStatus = design.aiReviewStatus;
  const aiProcessingStage = design.aiProcessingStage;

  if (
    status === "processing" ||
    (typeof aiProcessingStage === "string" &&
      aiProcessingStage.trim() !== "" &&
      aiProcessingStage !== "failed" &&
      aiProcessingStage !== "ready_for_review")
  ) {
    return { action: "no_op", reason: "already_processing" };
  }

  if (aiProcessingStage === "ready_for_review") {
    return { action: "no_op", reason: "unsupported_lifecycle" };
  }

  if (status === "imported" && (!aiReviewStatus || aiReviewStatus === "pending")) {
    return { action: "plain_enqueue", reason: "existing_imported_pending" };
  }

  if (status === "ready" && aiReviewStatus === "approved") {
    return { action: "reprocess_ready", reason: "existing_ready_approved" };
  }

  if (status === "rejected") {
    return { action: "reset_rejected", reason: "existing_rejected" };
  }

  if (status === "imported" && aiReviewStatus === "needs_review") {
    return { action: "no_op", reason: "already_needs_review" };
  }

  if (aiReviewStatus === "approved") {
    return { action: "no_op", reason: "already_approved" };
  }

  return { action: "no_op", reason: "unsupported_lifecycle" };
}
