import type { ShowCompletionReconciliationResult } from "./showCompletionReconciliation";
import { resolveShowReconciliationRetryOutcome } from "./showReconciliationRetryOutcome";
import {
  type RetrySessionAcquireResult,
  ShowProductionRetrySession,
  type ShowProductionRetrySessionSnapshot,
} from "./showProductionRetrySession";

export type ShowReconciliationRetryExecution =
  | { kind: "acquisition_failed"; acquisition: RetrySessionAcquireResult }
  | { kind: "stale_discarded"; acquisition: RetrySessionAcquireResult }
  | {
      kind: "resolved";
      acquisition: RetrySessionAcquireResult;
      outcome: ReturnType<typeof resolveShowReconciliationRetryOutcome>;
    }
  | {
      kind: "rejected";
      acquisition: RetrySessionAcquireResult;
      message: string;
      errorCode: string;
    };

interface ExecuteShowReconciliationRetryOptions {
  session: ShowProductionRetrySession;
  showId: string;
  requestIds: readonly string[];
  invoke: (requestIds: string[]) => Promise<{ results: ShowCompletionReconciliationResult[] }>;
  onAcquired?: (acquisition: RetrySessionAcquireResult) => void;
  onReleased?: (release: {
    previous: ShowProductionRetrySessionSnapshot;
    next: ShowProductionRetrySessionSnapshot;
    reason: "retry_scope_resolved" | "retry_scope_remains" | "retry_rejected";
    staleSettlementDiscarded: boolean;
  }) => void;
}

/**
 * Production orchestration boundary for explicit Retry. Acquisition is synchronous before the
 * first await, the service is invoked at most once, stale settlements are discarded, and every
 * acquired path releases through the authoritative token in `finally`.
 */
export async function executeShowReconciliationRetry({
  session,
  showId,
  requestIds,
  invoke,
  onAcquired,
  onReleased,
}: ExecuteShowReconciliationRetryOptions): Promise<ShowReconciliationRetryExecution> {
  const acquisition = session.acquireRetry(showId);
  if (!acquisition.ok || acquisition.token === undefined) {
    return { kind: "acquisition_failed", acquisition };
  }

  const token = acquisition.token;
  const attemptedRequestIds = [...requestIds];
  let retainRetryAvailability = true;
  let releaseReason: "retry_scope_resolved" | "retry_scope_remains" | "retry_rejected" =
    "retry_scope_remains";
  let staleSettlementDiscarded = false;
  onAcquired?.(acquisition);

  try {
    let result: { results: ShowCompletionReconciliationResult[] };
    try {
      result = await invoke(attemptedRequestIds);
    } catch (error) {
      if (!session.isStillAuthoritative(showId, token)) {
        staleSettlementDiscarded = true;
        return { kind: "stale_discarded", acquisition };
      }
      releaseReason = "retry_rejected";
      return {
        kind: "rejected",
        acquisition,
        message: error instanceof Error ? error.message : "Unable to retry request updates.",
        errorCode:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "unknown",
      };
    }

    const outcome = resolveShowReconciliationRetryOutcome(
      attemptedRequestIds.length,
      result.results,
    );
    retainRetryAvailability = outcome.retryEligible;
    releaseReason = outcome.retryEligible ? "retry_scope_remains" : "retry_scope_resolved";
    if (!session.isStillAuthoritative(showId, token)) {
      staleSettlementDiscarded = true;
      return { kind: "stale_discarded", acquisition };
    }
    return { kind: "resolved", acquisition, outcome };
  } finally {
    const previous = session.snapshot();
    session.complete(token, retainRetryAvailability);
    onReleased?.({
      previous,
      next: session.snapshot(),
      reason: releaseReason,
      staleSettlementDiscarded,
    });
  }
}
