export type ShowProductionRetryPhase =
  | "idle"
  | "timer_action"
  | "post_finish_verification"
  | "reconstruction"
  | "retry_available"
  | "explicit_retry"
  | "disposed";

export type RetrySessionAcquireReason =
  | "acquired"
  | "unmounted"
  | "show_mismatch"
  | "phase_busy";

export interface RetrySessionAcquireResult {
  ok: boolean;
  reason: RetrySessionAcquireReason;
  token?: number;
}

export interface ShowProductionRetrySessionSnapshot {
  phase: ShowProductionRetryPhase;
  generation: number;
  mounted: boolean;
  activeOperationKind: ShowProductionRetryPhase;
}

export interface ShowReconciliationRetryPresentation {
  state: "retryable" | "finalizing" | "remediation_only" | "none";
  buttonDisabled: boolean;
  buttonLabel: "Retry request updates" | "Retrying…";
}

/** Production-used presentation derived from the same phase authority as acquisition. */
export function deriveShowReconciliationRetryPresentation(input: {
  hasWarning: boolean;
  retryableCount: number;
  remediationCount: number;
  phase: ShowProductionRetryPhase;
  canStartRetry: boolean;
}): ShowReconciliationRetryPresentation {
  if (!input.hasWarning) {
    return { state: "none", buttonDisabled: true, buttonLabel: "Retry request updates" };
  }
  if (input.retryableCount > 0) {
    if (input.phase === "explicit_retry") {
      return { state: "retryable", buttonDisabled: true, buttonLabel: "Retrying…" };
    }
    if (input.canStartRetry) {
      return { state: "retryable", buttonDisabled: false, buttonLabel: "Retry request updates" };
    }
    return { state: "finalizing", buttonDisabled: true, buttonLabel: "Retry request updates" };
  }
  if (input.remediationCount > 0) {
    return {
      state: "remediation_only",
      buttonDisabled: true,
      buttonLabel: "Retry request updates",
    };
  }
  return { state: "none", buttonDisabled: true, buttonLabel: "Retry request updates" };
}

/**
 * Production-owned synchronous authority for timer/reconstruction/retry exclusion.
 * React state may describe the result, but only this token-authoritative session can make Retry
 * available or acquire it.
 */
export class ShowProductionRetrySession {
  private currentShowId: string | null = null;
  private generation = 0;
  private mounted = true;
  private phase: ShowProductionRetryPhase = "idle";

  /** Strict-Mode-safe effect setup. A real final unmount has no later setup to reactivate it. */
  markMounted(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.generation += 1;
    this.phase = "idle";
  }

  markUnmounted(): void {
    this.mounted = false;
    this.generation += 1;
    this.phase = "disposed";
  }

  setShowId(showId: string | null): void {
    if (showId === this.currentShowId) return;
    this.currentShowId = showId;
    this.generation += 1;
    this.phase = this.mounted ? "idle" : "disposed";
  }

  snapshot(): ShowProductionRetrySessionSnapshot {
    return {
      phase: this.phase,
      generation: this.generation,
      mounted: this.mounted,
      activeOperationKind: this.phase,
    };
  }

  private rejectionReason(showId: string): Exclude<RetrySessionAcquireReason, "acquired"> | null {
    if (!this.mounted || this.phase === "disposed") return "unmounted";
    if (this.currentShowId !== null && showId !== this.currentShowId) return "show_mismatch";
    return null;
  }

  private begin(
    showId: string,
    allowedPhases: readonly ShowProductionRetryPhase[],
    nextPhase: ShowProductionRetryPhase,
  ): RetrySessionAcquireResult {
    const rejection = this.rejectionReason(showId);
    if (rejection) return { ok: false, reason: rejection };
    if (!allowedPhases.includes(this.phase)) return { ok: false, reason: "phase_busy" };
    this.generation += 1;
    this.phase = nextPhase;
    return { ok: true, reason: "acquired", token: this.generation };
  }

  beginTimerAction(showId: string = this.currentShowId ?? ""): RetrySessionAcquireResult {
    // A new user timer action supersedes any available or reconstructing retry scope.
    const rejection = this.rejectionReason(showId);
    if (rejection) return { ok: false, reason: rejection };
    this.generation += 1;
    this.phase = "timer_action";
    return { ok: true, reason: "acquired", token: this.generation };
  }

  beginReconstruction(showId: string): RetrySessionAcquireResult {
    return this.begin(showId, ["idle"], "reconstruction");
  }

  canStartRetry(showId: string): boolean {
    return this.rejectionReason(showId) === null && this.phase === "retry_available";
  }

  acquireRetry(showId: string): RetrySessionAcquireResult {
    return this.begin(showId, ["retry_available"], "explicit_retry");
  }


  isStillAuthoritative(showId: string, token: number): boolean {
    return (
      this.mounted
      && this.currentShowId === showId
      && this.generation === token
      && this.phase !== "disposed"
    );
  }

  /**
   * Atomic authoritative release. A stale token cannot expose Retry. The verified classification
   * and lock release become one session transition.
   */
  complete(
    token: number,
    hasVerifiedRetryableScope: boolean,
  ): boolean {
    if (this.generation !== token || !this.mounted || this.phase === "disposed") return false;
    this.phase = hasVerifiedRetryableScope ? "retry_available" : "idle";
    return true;
  }

}
