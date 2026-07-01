import type { AiReviewStatus } from "../types/aiReview.types";

export function formatAiReviewStatusLabel(status: AiReviewStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "needs_review":
      return "Needs review";
    default:
      return status;
  }
}

export function getAiReviewStatusBadgeVariant(
  status: AiReviewStatus,
): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    case "needs_review":
      return "warning";
    case "pending":
    default:
      return "default";
  }
}

export function formatAiReviewConfidence(confidence: number | undefined): string {
  if (confidence === undefined) {
    return "—";
  }

  return `${Math.round(confidence * 100)}%`;
}

/** Matches the Settings AI Playground result formatting (`$X.XXXXXX`, 6 decimal places). */
export function formatAiEstimatedCost(value: number | null | undefined): string {
  return value != null ? `$${value.toFixed(6)}` : "N/A";
}
