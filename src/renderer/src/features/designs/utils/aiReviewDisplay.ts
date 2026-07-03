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

/**
 * Combined cost across the first AI call and the optional tag rerank second call. Returns null
 * when neither cost is known (distinct from "N/A" display — callers decide how to render null).
 */
export function resolveCombinedAiEstimatedCost(
  firstCallCostUsd: number | null | undefined,
  tagRerankCostUsd: number | null | undefined,
): number | null {
  if (firstCallCostUsd == null && tagRerankCostUsd == null) {
    return null;
  }

  return (firstCallCostUsd ?? 0) + (tagRerankCostUsd ?? 0);
}

export function formatTagRerankStatusLabel(
  status: "skipped" | "succeeded" | "failed" | undefined,
): string {
  switch (status) {
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
    default:
      return "—";
  }
}
