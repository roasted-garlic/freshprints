import type { DesignStatus } from "../types/designStatus.types";
import type { AiReviewStatus } from "../types/aiReview.types";
import { isDesignStatus } from "../types/designStatus.types";

/** Default restore target for legacy archived designs without `previousStatus`. */
export const LEGACY_RESTORE_FALLBACK_STATUS: DesignStatus = "imported";

export function isOperationalDesignStatus(status: DesignStatus): boolean {
  return status !== "archived";
}

export interface DesignRestoreContext {
  aiReviewed: boolean;
  aiReviewStatus?: AiReviewStatus;
  previousStatus?: DesignStatus;
}

/**
 * Resolves the operational status to apply when restoring an archived design.
 *
 * Fallback order for legacy records missing `previousStatus`:
 * 1. `ready` when `aiReviewed` is true (pre-AI-review catalog approval likely applied)
 * 2. `imported` otherwise — safe default for Phase 3C imports and unknown legacy rows
 */
export function resolveRestoreStatus(design: DesignRestoreContext): DesignStatus {
  if (
    design.previousStatus &&
    isDesignStatus(design.previousStatus) &&
    isOperationalDesignStatus(design.previousStatus)
  ) {
    return design.previousStatus;
  }

  if (design.aiReviewStatus === "approved" || design.aiReviewed) {
    return "ready";
  }

  return LEGACY_RESTORE_FALLBACK_STATUS;
}
