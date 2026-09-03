import type { DeleteEligibleUnapprovedDesignItemResult } from "@fresh-prints/shared/types/admin/deleteEligibleUnapprovedDesign.types";

const HARD_DELETE_TOTAL_FAILURE_FALLBACK =
  "Unable to permanently delete the selected design(s).";

/**
 * Message for AI Processing hard-delete when the callable returns with zero
 * deleted / skipped-already-deleted results. Prefer the first failed item's
 * server error; fall back to a safe generic string.
 */
export function resolveHardDeleteTotalFailureMessage(
  results: readonly DeleteEligibleUnapprovedDesignItemResult[],
): string {
  const firstFailedError = results.find(
    (result) => result.status === "failed" && result.error?.trim(),
  )?.error;

  if (firstFailedError?.trim()) {
    return firstFailedError.trim();
  }

  return HARD_DELETE_TOTAL_FAILURE_FALLBACK;
}
