import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  computeElapsedPrintMs,
  formatPrintElapsed,
  isShowPrintTimerPaused,
} from "@fresh-prints/shared/utils/showPrintTimer";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { isPastScheduledShow as isShowPastScheduled } from "../utils/groupShowsByUpcomingPast";
import { upcomingShowService } from "../services/upcomingShowService";
import type { ShowTimerActionResult } from "../services/upcomingShowService";
import { classifyCommittedShowTimerPhase } from "../utils/showTimerActionPhase";
import { resolveShowReconciliationRetryOutcome } from "../utils/showReconciliationRetryOutcome";
import { executeShowReconciliationRetry } from "../utils/showReconciliationRetryController";
import {
  deriveShowReconciliationRetryPresentation,
  ShowProductionRetrySession,
} from "../utils/showProductionRetrySession";
import type {
  RetrySessionAcquireReason,
  ShowProductionRetrySessionSnapshot,
} from "../utils/showProductionRetrySession";

interface UseShowProductionTimerOptions {
  show: UpcomingShow | null;
  hasActiveAllocations: boolean;
  onShowUpdated?: () => void | Promise<void>;
}

export type ShowReconciliationRetryStatus =
  | "idle"
  | "retrying"
  | "succeeded"
  | "partial_failure"
  | "failed";

/** Non-cryptographic, dev-diagnostic-only hash — never used for anything security-relevant. */
function hashShowIdForDiagnostics(showId: string): string {
  let hash = 0;
  for (let i = 0; i < showId.length; i += 1) {
    hash = (Math.imul(31, hash) + showId.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

function logRetrySessionTransition(input: {
  showId: string;
  previous: ShowProductionRetrySessionSnapshot;
  next: ShowProductionRetrySessionSnapshot;
  retryableCount: number;
  remediationCount: number;
  canStartRetry: boolean;
  acquisitionResult?: RetrySessionAcquireReason;
  releaseReason?: string;
  staleSettlementDiscarded?: boolean;
}): void {
  if (!import.meta.env.DEV) return;
  console.info("[useShowProductionTimer] retry session state transition", {
    showIdHash: hashShowIdForDiagnostics(input.showId),
    previousPhase: input.previous.phase,
    nextPhase: input.next.phase,
    generation: input.next.generation,
    activeOperationKind: input.next.activeOperationKind,
    retryableCount: input.retryableCount,
    remediationCount: input.remediationCount,
    canStartRetry: input.canStartRetry,
    acquisitionResult: input.acquisitionResult ?? null,
    releaseReason: input.releaseReason ?? null,
    staleSettlementDiscarded: input.staleSettlementDiscarded ?? false,
  });
}

export function useShowProductionTimer({
  show,
  hasActiveAllocations,
  onShowUpdated,
}: UseShowProductionTimerOptions) {
  const { user } = useAuth();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionWarning, setActionWarning] = useState<string | null>(null);
  const [canRetryReconciliation, setCanRetryReconciliation] = useState(false);
  const [failedReconciliationRequestIds, setFailedReconciliationRequestIds] = useState<string[]>(
    [],
  );
  const [remediationRequestIds, setRemediationRequestIds] = useState<string[]>([]);
  const [retryStatus, setRetryStatus] = useState<ShowReconciliationRetryStatus>("idle");
  const [retryAttemptCount, setRetryAttemptCount] = useState(0);
  const [, setRetrySessionRevision] = useState(0);

  // Synchronous, ref-backed retry-session authority (Plan Section 28, Implementation Review 11
  // finding 1) — created once per hook instance, never recreated on re-render. This is the sole
  // mechanism deciding whether a retry may start and whether its settlement is still authoritative;
  // React state above is only ever written AFTER this controller confirms the write is still valid.
  const retrySessionRef = useRef<ShowProductionRetrySession>();
  if (!retrySessionRef.current) {
    retrySessionRef.current = new ShowProductionRetrySession();
  }

  // Synchronously (in the render body, not an effect) keep the session's show-id tracking current —
  // an effect would run one tick too late relative to a retry that's already in flight when `show.id`
  // changes on this same render.
  retrySessionRef.current.setShowId(show?.id ?? null);

  useEffect(() => {
    retrySessionRef.current?.markMounted();
    setRetrySessionRevision((revision) => revision + 1);
    return () => {
      retrySessionRef.current?.markUnmounted();
    };
  }, []);

  useEffect(() => {
    setActionError(null);
    setActionWarning(null);
    setCanRetryReconciliation(false);
    setFailedReconciliationRequestIds([]);
    setRemediationRequestIds([]);
    setRetryStatus("idle");
    setRetryAttemptCount(0);
  }, [show?.id]);

  // Plan Section 30.2 — the effect above blanks all retry/warning state on every show-id change
  // (including a remount from navigating away from Show Queue and back), and until now nothing ever
  // reconstructed it from real Firestore state afterward, so a genuinely-still-unresolved show would
  // silently lose its warning/Retry button. This reconstructs it via a bounded, show-scoped check
  // (this show's own allocations only, never an unbounded scan of all print requests) whenever the
  // selected show is finished, reusing the exact same reconciliation classification a real retry uses.
  useEffect(() => {
    if (!user || !show || (show.productionStatus !== "completed" && show.productionStatus !== "fully_printed")) {
      return;
    }
    const session = retrySessionRef.current;
    if (!session) {
      return;
    }
    const showId = show.id;
    let cancelled = false;

    // Acquired through the same session as a user-initiated retry — this mutually excludes a
    // reconstruction check and a live Retry click for the same show, so the two can never race each
    // other into a double-write or a lost update (Plan Section 30.5e).
    const acquireResult = session.beginReconstruction(showId);
    if (!acquireResult.ok || acquireResult.token === undefined) {
      return;
    }
    const token = acquireResult.token;
    setRetrySessionRevision((revision) => revision + 1);

    void (async () => {
      let hasVerifiedRetryableScope = false;
      try {
        const allocations = await upcomingShowService.listShowAllocations(user, showId);
        if (cancelled) {
          return;
        }
        const affectedPrintRequestIds = [
          ...new Set(
            allocations
              .filter((allocation) => allocation.status !== "canceled")
              .map((allocation) => allocation.printRequestId),
          ),
        ];
        if (affectedPrintRequestIds.length === 0) {
          return;
        }
        const result = await upcomingShowService.retryShowCompletionReconciliation(
          user,
          affectedPrintRequestIds,
        );
        if (cancelled) {
          return;
        }
        const retryOutcome = resolveShowReconciliationRetryOutcome(
          affectedPrintRequestIds.length,
          result.results,
        );
        // Apply only if this show is still the one the hook is tracking and no superseding
        // action/retry/show-switch invalidated this token while the reads were pending — same
        // authority the hook already uses for a real retry's settlement.
        if (!session.isStillAuthoritative(showId, token)) {
          return;
        }
        const succeeded = retryOutcome.status === "succeeded";
        hasVerifiedRetryableScope = retryOutcome.retryEligible;
        if (succeeded) {
          // Genuinely already resolved — never resurrect a stale warning.
          return;
        }
        setActionWarning(retryOutcome.message);
        setCanRetryReconciliation(retryOutcome.retryEligible);
        setFailedReconciliationRequestIds(retryOutcome.unresolvedRequestIds);
        setRemediationRequestIds(retryOutcome.remediationRequestIds);
        setRetryStatus(retryOutcome.status);
      } finally {
        session.complete(token, hasVerifiedRetryableScope);
        setRetrySessionRevision((revision) => revision + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally keyed on primitives only (show?.id/show?.productionStatus) below, not the `show`
    // object itself, so a live subscription refresh that doesn't change these fields never re-triggers
    // this reconstruction check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show?.id, show?.productionStatus, user]);

  const isPrinting = show?.productionStatus === "printing";
  const isFinished = show?.productionStatus === "completed" || show?.productionStatus === "fully_printed";
  const isPaused = show
    ? isShowPrintTimerPaused({
        productionStatus: show.productionStatus,
        activePrintStartedAtMs: show.activePrintStartedAt?.toMillis(),
        printPausedAtMs: show.printPausedAt?.toMillis(),
      })
    : false;

  useEffect(() => {
    if (!isPrinting || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isPaused, isPrinting]);

  const elapsedMs = useMemo(() => {
    if (!show) {
      return 0;
    }

    return computeElapsedPrintMs({
      accumulatedPrintMs: show.accumulatedPrintMs,
      activePrintStartedAtMs: show.activePrintStartedAt?.toMillis(),
      nowMs,
    });
  }, [nowMs, show]);

  const formattedElapsed = formatPrintElapsed(elapsedMs);

  const isPastScheduledShow = show ? isShowPastScheduled(show, new Date()) : false;
  const canStart = Boolean(
    show &&
      hasActiveAllocations &&
      !isPastScheduledShow &&
      (show.productionStatus === "open" || show.productionStatus === "full"),
  );
  const canPause = Boolean(show && isPrinting && !isPaused && !isPastScheduledShow);
  const canResume = Boolean(show && isPaused && !isPastScheduledShow);
  const canMarkFinished = Boolean(show && isPrinting && !isPastScheduledShow);

  const runAction = useCallback(
    async (
      actionName: "start" | "pause" | "resume" | "finish",
      action: (showId: string) => Promise<ShowTimerActionResult>,
    ) => {
      if (!user || !show) {
        return;
      }

      const session = retrySessionRef.current;
      if (!session) return;
      const previousSession = session.snapshot();
      const acquisition = session.beginTimerAction(show.id);
      logRetrySessionTransition({
        showId: show.id,
        previous: previousSession,
        next: session.snapshot(),
        retryableCount: failedReconciliationRequestIds.length,
        remediationCount: remediationRequestIds.length,
        canStartRetry: session.canStartRetry(show.id),
        acquisitionResult: acquisition.reason,
      });
      if (!acquisition.ok || acquisition.token === undefined) return;
      const timerToken = acquisition.token;
      setRetrySessionRevision((revision) => revision + 1);

      setIsActionPending(true);
      setActionError(null);
      setActionWarning(null);
      setCanRetryReconciliation(false);
      setFailedReconciliationRequestIds([]);
      setRemediationRequestIds([]);
      setRetryStatus("idle");
      setRetryAttemptCount(0);

      let verifiedRetryableCount = 0;
      try {
        let result: ShowTimerActionResult;
        try {
          result = await action(show.id);
        } catch (error) {
          const errorCode =
            error && typeof error === "object" && "code" in error
              ? String((error as { code: unknown }).code)
              : "unknown";
          console.error("[useShowProductionTimer] show printing action failed", {
            actionName, phase: "mutation", errorCode,
            errorMessage: error instanceof Error ? error.message : String(error),
            showIdHash: hashShowIdForDiagnostics(show.id),
          });
          setActionError(error instanceof Error ? error.message : "Unable to update show printing.");
          return;
        }

        if (classifyCommittedShowTimerPhase(result, false) === "committed_reconciliation_partial") {
          const reconciliation = result.reconciliation!;
          verifiedRetryableCount = reconciliation.failedRequestCount;
          const retryCopy = verifiedRetryableCount > 0
            ? `${reconciliation.failedRequestCount} request update(s) need retry.` : "";
          const remediationCopy = reconciliation.remediationRequestCount > 0
            ? `${reconciliation.remediationRequestCount} request record(s) need data remediation.` : "";
          setActionWarning(`Printing finished, but ${[retryCopy, remediationCopy].filter(Boolean).join(" ")}`);
          setCanRetryReconciliation(verifiedRetryableCount > 0);
          setFailedReconciliationRequestIds(reconciliation.failedRequestIds);
          setRemediationRequestIds(reconciliation.remediationRequestIds);
        }

        try {
          await onShowUpdated?.();
        } catch (error) {
          const committedPhase = classifyCommittedShowTimerPhase(result, true);
          console.warn("[useShowProductionTimer] show printing refresh failed after committed mutation", {
            actionName, phase: committedPhase,
            errorCode: error && typeof error === "object" && "code" in error
              ? String((error as { code: unknown }).code) : "unknown",
            errorMessage: error instanceof Error ? error.message : String(error),
            showIdHash: hashShowIdForDiagnostics(show.id),
          });
          setActionWarning("Printing was updated, but Show Queue could not refresh. Live state will retry automatically.");
        }
      } finally {
        const previous = session.snapshot();
        session.complete(timerToken, verifiedRetryableCount > 0);
        logRetrySessionTransition({
          showId: show.id,
          previous,
          next: session.snapshot(),
          retryableCount: verifiedRetryableCount,
          remediationCount: 0,
          canStartRetry: session.canStartRetry(show.id),
          releaseReason: "timer_action_finally",
        });
        setRetrySessionRevision((revision) => revision + 1);
        setIsActionPending(false);
      }
    },
    [failedReconciliationRequestIds.length, onShowUpdated, remediationRequestIds.length, show, user],
  );

  const retryReconciliation = useCallback(async () => {
    const session = retrySessionRef.current;
    const showIdHash = show ? hashShowIdForDiagnostics(show.id) : null;

    // Plan Section 30.2 — entered unconditionally on every activation attempt, including the
    // early-return paths below, so a click that produces no observable effect (previously
    // indistinguishable from a dropped click) now always leaves a diagnostic trace.
    const logTrace = (fields: {
      handlerEntered: boolean;
      sessionAcquired: boolean;
      serviceInvoked: boolean;
      serviceSettled: boolean;
      settlementAuthoritative: boolean;
      resultKind: "no_op_nothing_to_retry" | "succeeded" | "partial_failure" | "failed" | "rejected" | "stale_discarded" | null;
      remainingRetryableCount: number | null;
      remainingRemediationCount: number | null;
      errorCode: string | null;
      acquisitionReason?: "acquired" | "unmounted" | "show_mismatch" | "phase_busy";
    }) => {
      if (import.meta.env.DEV) {
        console.info("[useShowProductionTimer] request reconciliation retry activation", {
          showIdHash,
          renderedRetryableCount: failedReconciliationRequestIds.length,
          renderedRemediationCount: remediationRequestIds.length,
          ...fields,
        });
      }
    };

    if (!user || !show || !session) {
      logTrace({
        handlerEntered: true,
        sessionAcquired: false,
        serviceInvoked: false,
        serviceSettled: false,
        settlementAuthoritative: false,
        resultKind: null,
        remainingRetryableCount: null,
        remainingRemediationCount: null,
        errorCode: null,
      });
      return;
    }

    if (failedReconciliationRequestIds.length === 0) {
      // Nothing retryable — either already resolved or remediation-only. Surface a distinct,
      // non-silent status instead of the previous truly inert no-op (Plan Section 30.2 finding 1).
      logTrace({
        handlerEntered: true,
        sessionAcquired: false,
        serviceInvoked: false,
        serviceSettled: false,
        settlementAuthoritative: false,
        resultKind: "no_op_nothing_to_retry",
        remainingRetryableCount: 0,
        remainingRemediationCount: remediationRequestIds.length,
        errorCode: null,
      });
      return;
    }

    const previousRetrySession = session.snapshot();
    const showId = show.id;
    const attempt = retryAttemptCount + 1;
    const attemptedRequestIds = [...failedReconciliationRequestIds];
    const execution = await executeShowReconciliationRetry({
      session,
      showId,
      requestIds: attemptedRequestIds,
      invoke: (requestIds) =>
        upcomingShowService.retryShowCompletionReconciliation(user, requestIds),
      onAcquired: (acquisition) => {
        logRetrySessionTransition({
          showId,
          previous: previousRetrySession,
          next: session.snapshot(),
          retryableCount: attemptedRequestIds.length,
          remediationCount: remediationRequestIds.length,
          canStartRetry: session.canStartRetry(showId),
          acquisitionResult: acquisition.reason,
        });
        logTrace({
          handlerEntered: true,
          sessionAcquired: true,
          serviceInvoked: false,
          serviceSettled: false,
          settlementAuthoritative: true,
          resultKind: null,
          remainingRetryableCount: attemptedRequestIds.length,
          remainingRemediationCount: remediationRequestIds.length,
          errorCode: null,
          acquisitionReason: "acquired",
        });
        setRetryStatus("retrying");
        setRetryAttemptCount(attempt);
        setActionError(null);
        setIsActionPending(true);
        setRetrySessionRevision((revision) => revision + 1);
      },
      onReleased: (release) => {
        logRetrySessionTransition({
          showId,
          previous: release.previous,
          next: release.next,
          retryableCount: attemptedRequestIds.length,
          remediationCount: remediationRequestIds.length,
          canStartRetry: session.canStartRetry(showId),
          releaseReason: release.reason,
          staleSettlementDiscarded: release.staleSettlementDiscarded,
        });
      },
    });

    if (execution.kind === "acquisition_failed") {
      logRetrySessionTransition({
        showId,
        previous: previousRetrySession,
        next: session.snapshot(),
        retryableCount: attemptedRequestIds.length,
        remediationCount: remediationRequestIds.length,
        canStartRetry: session.canStartRetry(showId),
        acquisitionResult: execution.acquisition.reason,
      });
      logTrace({
        handlerEntered: true,
        sessionAcquired: false,
        serviceInvoked: false,
        serviceSettled: false,
        settlementAuthoritative: false,
        resultKind: null,
        remainingRetryableCount: failedReconciliationRequestIds.length,
        remainingRemediationCount: remediationRequestIds.length,
        errorCode: null,
        acquisitionReason: execution.acquisition.reason,
      });
      return;
    }

    if (execution.kind === "stale_discarded") {
      logTrace({
        handlerEntered: true,
        sessionAcquired: true,
        serviceInvoked: true,
        serviceSettled: true,
        settlementAuthoritative: false,
        resultKind: "stale_discarded",
        remainingRetryableCount: null,
        remainingRemediationCount: null,
        errorCode: null,
      });
      return;
    }

    if (execution.kind === "rejected") {
      // Rejected calls retain the original retry scope (per the required contract) — do not clear
      // failedReconciliationRequestIds here, so a later retry can proceed against the same IDs.
      logTrace({
        handlerEntered: true,
        sessionAcquired: true,
        serviceInvoked: true,
        serviceSettled: true,
        settlementAuthoritative: true,
        resultKind: "rejected",
        remainingRetryableCount: attemptedRequestIds.length,
        remainingRemediationCount: remediationRequestIds.length,
        errorCode: execution.errorCode,
      });
      setRetryStatus("failed");
      setActionError(execution.message);
      setIsActionPending(false);
      setRetrySessionRevision((revision) => revision + 1);
      return;
    }

    const retryOutcome = execution.outcome;
    const succeeded = retryOutcome.status === "succeeded";
    logTrace({
      handlerEntered: true,
      sessionAcquired: true,
      serviceInvoked: true,
      serviceSettled: true,
      settlementAuthoritative: true,
      resultKind: retryOutcome.status,
      remainingRetryableCount: retryOutcome.unresolvedRequestIds.length,
      remainingRemediationCount: retryOutcome.remediationRequestIds.length,
      errorCode: null,
    });
    setRetryStatus(retryOutcome.status);
    setActionWarning(succeeded ? null : retryOutcome.message);
    setActionError(succeeded ? null : retryOutcome.message);
    setCanRetryReconciliation(retryOutcome.retryEligible);
    setFailedReconciliationRequestIds(retryOutcome.unresolvedRequestIds);
    setRemediationRequestIds(retryOutcome.remediationRequestIds);
    setIsActionPending(false);
    setRetrySessionRevision((revision) => revision + 1);
  }, [failedReconciliationRequestIds, remediationRequestIds, retryAttemptCount, show, user]);

  // Plan Section 30.2 Workstream C — the final Retry UI contract distinguishes three states instead
  // of one binary warning/no-warning, so a remediation-only outcome (never retryable, per
  // `resolveShowReconciliationRetryOutcome`'s existing contract) renders its own explanatory message
  // rather than either a silently-absent warning or an inert button with nothing to click.
  const canStartRetry = Boolean(
    show
    && failedReconciliationRequestIds.length > 0
    && retrySessionRef.current?.canStartRetry(show.id),
  );
  const retryPresentation = deriveShowReconciliationRetryPresentation({
    hasWarning: Boolean(actionWarning),
    retryableCount: failedReconciliationRequestIds.length,
    remediationCount: remediationRequestIds.length,
    phase: retrySessionRef.current?.snapshot().phase ?? "disposed",
    canStartRetry,
  });

  return {
    formattedElapsed,
    elapsedMs,
    isPrinting,
    isPaused,
    isFinished,
    isPastScheduledShow,
    isActionPending,
    actionError,
    actionWarning,
    canRetryReconciliation: canStartRetry && canRetryReconciliation,
    canStartRetry,
    failedReconciliationRequestIds,
    remediationRequestIds,
    reconciliationRetryUiState: retryPresentation.state,
    retryButtonDisabled: retryPresentation.buttonDisabled,
    retryButtonLabel: retryPresentation.buttonLabel,
    retryStatus,
    retryAttemptCount,
    canStart,
    canPause,
    canResume,
    canMarkFinished,
    startPrinting: () => runAction("start", (showId) => upcomingShowService.startShowPrinting(user!, showId)),
    pausePrinting: () => runAction("pause", (showId) => upcomingShowService.pauseShowPrinting(user!, showId)),
    resumePrinting: () => runAction("resume", (showId) => upcomingShowService.resumeShowPrinting(user!, showId)),
    markFinished: () => runAction("finish", (showId) => upcomingShowService.markShowPrintingFinished(user!, showId)),
    retryReconciliation,
  };
}
