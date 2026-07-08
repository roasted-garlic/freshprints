import type { Timestamp } from "firebase/firestore";

import type { Design } from "./design.types";

/** AI review outcome — separate from operational `DesignStatus`. */
export type AiReviewStatus = "pending" | "approved" | "rejected" | "needs_review";

export const aiReviewStatuses: AiReviewStatus[] = [
  "pending",
  "approved",
  "rejected",
  "needs_review",
];

export function isAiReviewStatus(value: string): value is AiReviewStatus {
  return aiReviewStatuses.includes(value as AiReviewStatus);
}

export interface AiReviewMutationInput {
  aiReviewVersion?: string;
  aiReviewNotes?: string;
  aiReviewConfidence?: number;
}

export interface AiReviewStateFields {
  aiReviewStatus: AiReviewStatus;
  aiReviewed: boolean;
  aiProcessed: boolean;
  aiReviewedAt?: Timestamp;
  aiReviewedBy?: string;
  aiReviewVersion?: string;
  aiReviewNotes?: string;
  aiReviewConfidence?: number;
}

/** Fields written by `designService.applyCatalogApprovalUpdate` only. */
export interface CatalogApprovalUpdate {
  status: "ready" | "rejected";
  aiReviewStatus: AiReviewStatus;
  aiReviewed: boolean;
  aiProcessed: boolean;
  aiReviewedBy: string;
  aiReviewVersion?: string;
  aiReviewNotes?: string;
  aiReviewConfidence?: number;
}

/** Fields written by `designService.applyAiReviewUpdate` only. */
export type AiReviewStateUpdate = AiReviewStateFields & {
  clearReviewedAt?: boolean;
  clearReviewedBy?: boolean;
  clearReviewConfidence?: boolean;
};

export type DesignAiReviewSource = Pick<
  Design,
  | "status"
  | "aiReviewStatus"
  | "aiReviewed"
  | "aiProcessed"
  | "aiReviewedAt"
  | "aiReviewedBy"
  | "aiReviewVersion"
  | "aiReviewNotes"
  | "aiReviewConfidence"
>;

export interface ResolvedDesignAiReviewDisplay {
  aiReviewStatus: AiReviewStatus;
  aiReviewed: boolean;
  aiProcessed: boolean;
  aiReviewedAt?: Timestamp;
  aiReviewedBy?: string;
  aiReviewVersion?: string;
  aiReviewNotes?: string;
  aiReviewConfidence?: number;
  usesDisplayFallback: boolean;
}
