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
 * Uses `previousStatus` when present. Legacy records without `previousStatus`
 * fall back to `imported` — never to `ready` without an explicit prior status.
 */
export function resolveRestoreStatus(design: DesignRestoreContext): DesignStatus {
  if (
    design.previousStatus &&
    isDesignStatus(design.previousStatus) &&
    isOperationalDesignStatus(design.previousStatus)
  ) {
    return design.previousStatus;
  }

  return LEGACY_RESTORE_FALLBACK_STATUS;
}
