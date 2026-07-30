import type { ShowCompletionReconciliationResult } from "./showCompletionReconciliation";

export type ShowReconciliationRetryStatus =
  | "succeeded"
  | "partial_failure"
  | "failed";

/**
 * Single, atomic decision point for what a resolved retry service result means (Plan Section 28,
 * Implementation Review 11 finding 2) — every field the production hook needs (status, the exact
 * remaining retryable IDs, the exact remediation IDs, a user-safe message, and whether the retry
 * affordance stays visible) is derived here, from the SAME structured per-request outcomes, so the
 * hook cannot independently re-derive (and diverge from) "was this actually a success" by checking
 * only `failedRequestCount`. Success requires zero unresolved transient failures AND zero
 * remediation-required records — a remediation-only result is never `succeeded`.
 */
export function resolveShowReconciliationRetryOutcome(
  attemptedCount: number,
  results: readonly ShowCompletionReconciliationResult[],
) {
  const unresolvedRequestIds = results
    .filter((result) => !result.success && result.retryEligible)
    .map((result) => result.printRequestId);
  const remediationRequestIds = results
    .filter((result) => result.outcome === "needs_remediation")
    .map((result) => result.printRequestId);
  const remediationCount = remediationRequestIds.length;
  const status: ShowReconciliationRetryStatus =
    unresolvedRequestIds.length === 0 && remediationCount === 0
      ? "succeeded"
      : unresolvedRequestIds.length > 0 && unresolvedRequestIds.length < attemptedCount
        ? "partial_failure"
        : "failed";

  const firstTransientFailure = results.find(
    (result) => result.retryEligible && !result.success,
  );

  const message =
    status === "succeeded"
      ? "Request completion updates are now reconciled."
      : status === "partial_failure" || status === "failed"
        ? unresolvedRequestIds.length > 0
          ? `${unresolvedRequestIds.length} request update(s) still need retry.${
              firstTransientFailure
                ? ` Failed during ${firstTransientFailure.phase}${
                    firstTransientFailure.firebaseErrorCode
                      ? ` (${firstTransientFailure.firebaseErrorCode})`
                      : ""
                  }.`
                : ""
            }`
          : `${remediationCount} request record(s) need data remediation.`
        : "";

  return {
    status,
    unresolvedRequestIds,
    remediationRequestIds,
    remediationCount,
    message,
    /** Whether the retry affordance should remain visible/actionable for another attempt. */
    retryEligible: unresolvedRequestIds.length > 0,
  };
}
