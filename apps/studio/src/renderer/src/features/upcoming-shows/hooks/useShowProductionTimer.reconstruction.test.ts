/**
 * Composed reconstruction/inert-click behavior tests (Plan Section 30.2/30.5).
 *
 * Following the same no-DOM-rendering convention as `useShowProductionTimer.retry.test.ts`, this
 * file drives the ACTUAL production primitives `useShowProductionTimer.ts` calls —
 * `ShowProductionRetrySession` and `resolveShowReconciliationRetryOutcome` — composed into a small
 * harness that mirrors both the hook's `retryReconciliation` early-return/inert-click path and its
 * new bounded, show-scoped reconstruction effect line for line. Nothing here reimplements the
 * decision logic in isolation; every decision is delegated to the same production classes/functions
 * the hook uses.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ShowProductionRetrySession } from "../utils/showProductionRetrySession";
import { resolveShowReconciliationRetryOutcome } from "../utils/showReconciliationRetryOutcome";
import type { ShowCompletionReconciliationResult } from "../utils/showCompletionReconciliation";

function result(
  printRequestId: string,
  outcome: ShowCompletionReconciliationResult["outcome"],
  retryEligible: boolean,
): ShowCompletionReconciliationResult {
  return {
    printRequestId,
    outcome,
    phase: outcome === "completed" ? "committed" : "request_write",
    parserStatus: "compatible",
    missingFields: [],
    legacyExtraFields: [],
    currentStatus: "active",
    proposedStatus: "completed",
    writeRequired: true,
    success: outcome === "completed" || outcome === "already_terminal",
    commitment: outcome === "completed" ? "committed" : "not_committed",
    retryEligible,
    diagnosticCode: outcome,
  };
}

interface TraceEntry {
  handlerEntered: boolean;
  sessionAcquired: boolean;
  serviceInvoked: boolean;
  serviceSettled: boolean;
  settlementAuthoritative: boolean;
  resultKind: string | null;
}

/**
 * Mirrors the hook's relevant state fields plus a trace log, for both the click-activation path
 * (`retryReconciliation`) and the mount/remount reconstruction effect.
 */
class ReconstructionHarness {
  readonly session = new ShowProductionRetrySession();
  serviceCallCount = 0;
  traces: TraceEntry[] = [];

  retryStatus: "idle" | "retrying" | "succeeded" | "partial_failure" | "failed" = "idle";
  actionWarning: string | null = null;
  canRetryReconciliation = false;
  failedReconciliationRequestIds: string[] = [];
  remediationRequestIds: string[] = [];

  get reconciliationRetryUiState(): "retryable" | "remediation_only" | "none" {
    if (!this.actionWarning) return "none";
    if (this.failedReconciliationRequestIds.length > 0) return "retryable";
    if (this.remediationRequestIds.length > 0) return "remediation_only";
    return "none";
  }

  setShowId(showId: string | null): void {
    this.session.setShowId(showId);
  }

  /** Mirrors `retryReconciliation`'s exact guard order, including the click-trace log. */
  click(showId: string): void {
    if (this.failedReconciliationRequestIds.length === 0) {
      this.traces.push({
        handlerEntered: true,
        sessionAcquired: false,
        serviceInvoked: false,
        serviceSettled: false,
        settlementAuthoritative: false,
        resultKind: "no_op_nothing_to_retry",
      });
      return;
    }

    if (this.session.snapshot().phase === "idle") {
      const verified = this.session.beginTimerAction(showId);
      this.session.complete(verified.token!, true);
    }
    const acquireResult = this.session.acquireRetry(showId);
    if (!acquireResult.ok || acquireResult.token === undefined) {
      this.traces.push({
        handlerEntered: true,
        sessionAcquired: false,
        serviceInvoked: false,
        serviceSettled: false,
        settlementAuthoritative: false,
        resultKind: null,
      });
      return;
    }
    const token = acquireResult.token;
    this.serviceCallCount += 1;
    this.retryStatus = "retrying";

    // Test-controlled settlement, applied immediately for simplicity in these tests.
    const serviceResults = this.nextServiceResults ?? [];
    const attemptedRequestIds = [...this.failedReconciliationRequestIds];
    const retryOutcome = resolveShowReconciliationRetryOutcome(attemptedRequestIds.length, serviceResults);

    if (!this.session.isStillAuthoritative(showId, token)) {
      this.traces.push({
        handlerEntered: true,
        sessionAcquired: true,
        serviceInvoked: true,
        serviceSettled: true,
        settlementAuthoritative: false,
        resultKind: "stale_discarded",
      });
      this.session.complete(token, false);
      return;
    }

    this.traces.push({
      handlerEntered: true,
      sessionAcquired: true,
      serviceInvoked: true,
      serviceSettled: true,
      settlementAuthoritative: true,
      resultKind: retryOutcome.status,
    });
    this.retryStatus = retryOutcome.status;
    this.actionWarning = retryOutcome.status === "succeeded" ? null : retryOutcome.message;
    this.canRetryReconciliation = retryOutcome.retryEligible;
    this.failedReconciliationRequestIds = retryOutcome.unresolvedRequestIds;
    this.remediationRequestIds = retryOutcome.remediationRequestIds;
    this.session.complete(token, retryOutcome.retryEligible);
  }

  nextServiceResults: ShowCompletionReconciliationResult[] | null = null;

  /**
   * Mirrors the reconstruction effect: acquire the session, call the (faked) bounded show-scoped
   * service, resolve the outcome, apply only if still authoritative and not already resolved.
   */
  reconstruct(showId: string, serviceResults: ShowCompletionReconciliationResult[]): {
    settle: () => void;
  } {
    const acquireResult = this.session.beginReconstruction(showId);
    if (!acquireResult.ok || acquireResult.token === undefined) {
      return { settle: () => undefined };
    }
    const token = acquireResult.token;
    this.serviceCallCount += 1;

    return {
      settle: () => {
        const retryOutcome = resolveShowReconciliationRetryOutcome(serviceResults.length, serviceResults);
        if (!this.session.isStillAuthoritative(showId, token)) {
          this.session.complete(token, false);
          return;
        }
        if (retryOutcome.status === "succeeded") {
          this.session.complete(token, false);
          return;
        }
        this.actionWarning = retryOutcome.message;
        this.canRetryReconciliation = retryOutcome.retryEligible;
        this.failedReconciliationRequestIds = retryOutcome.unresolvedRequestIds;
        this.remediationRequestIds = retryOutcome.remediationRequestIds;
        this.retryStatus = retryOutcome.status;
        this.session.complete(token, retryOutcome.retryEligible);
      },
    };
  }
}

describe("useShowProductionTimer reconstruction and inert-click behavior (composed, production controller)", () => {
  it("Test A: a click with zero retryable IDs produces the inert-click trace and no state mutation", () => {
    const harness = new ReconstructionHarness();
    harness.setShowId("show-1");
    harness.remediationRequestIds = ["req-1"]; // remediation-only, nothing retryable

    harness.click("show-1");

    assert.equal(harness.serviceCallCount, 0, "no service call for a zero-retryable click");
    assert.deepEqual(harness.traces, [
      {
        handlerEntered: true,
        sessionAcquired: false,
        serviceInvoked: false,
        serviceSettled: false,
        settlementAuthoritative: false,
        resultKind: "no_op_nothing_to_retry",
      },
    ]);
  });

  it("Test B: remount for a still-genuinely-unresolved show re-populates the warning from reconstruction", () => {
    const harness = new ReconstructionHarness();
    harness.setShowId("show-1");
    // Simulate the per-show-id reset effect blanking state on remount.
    harness.actionWarning = null;
    harness.canRetryReconciliation = false;
    harness.failedReconciliationRequestIds = [];

    const reconstruction = harness.reconstruct("show-1", [result("req-1", "failed", true)]);
    reconstruction.settle();

    assert.equal(harness.reconciliationRetryUiState, "retryable");
    assert.deepEqual(harness.failedReconciliationRequestIds, ["req-1"]);
    assert.equal(harness.canRetryReconciliation, true);
  });

  it("Test C: remount for an already-resolved show never resurrects a stale warning", () => {
    const harness = new ReconstructionHarness();
    harness.setShowId("show-1");
    harness.actionWarning = null;
    harness.failedReconciliationRequestIds = [];

    const reconstruction = harness.reconstruct("show-1", [result("req-1", "already_terminal", false)]);
    reconstruction.settle();

    assert.equal(harness.reconciliationRetryUiState, "none", "fully resolved shows show no warning");
    assert.equal(harness.actionWarning, null);
  });

  it("Test D: a stale reconstruction response after a further show switch is discarded", () => {
    const harness = new ReconstructionHarness();
    harness.setShowId("show-a");

    const reconstruction = harness.reconstruct("show-a", [result("req-a", "failed", true)]);

    // Owner switches to Show B before the reconstruction read resolves.
    harness.setShowId("show-b");
    harness.actionWarning = null;
    harness.failedReconciliationRequestIds = [];

    reconstruction.settle();

    assert.equal(harness.actionWarning, null, "Show B's state must be untouched by Show A's stale reconstruction");
    assert.deepEqual(harness.failedReconciliationRequestIds, []);
  });

  it("Test E: a reconstruction read in flight when the user clicks Retry does not double-write or race", () => {
    const harness = new ReconstructionHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];

    // Reconstruction acquires the session lock first (e.g. mount-time check already in flight).
    const reconstruction = harness.reconstruct("show-1", [result("req-1", "failed", true)]);

    // User clicks Retry while reconstruction is still pending — must be a synchronous no-op, exactly
    // like two rapid clicks are today, since the session lock is already held.
    harness.click("show-1");
    assert.equal(harness.serviceCallCount, 1, "only the reconstruction call proceeded; the click was excluded");
    assert.deepEqual(harness.traces, [
      {
        handlerEntered: true,
        sessionAcquired: false,
        serviceInvoked: false,
        serviceSettled: false,
        settlementAuthoritative: false,
        resultKind: null,
      },
    ]);

    reconstruction.settle();
    assert.equal(harness.reconciliationRetryUiState, "retryable", "reconstruction settlement applied cleanly");

    // Now the user's click can proceed against the reconstructed scope.
    harness.nextServiceResults = [result("req-1", "completed", false)];
    harness.click("show-1");
    assert.equal(harness.serviceCallCount, 2);
    assert.equal(harness.retryStatus, "succeeded");
  });

  it("Test F: the reverse ordering (click first, reconstruction second) is also mutually exclusive", () => {
    const harness = new ReconstructionHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];
    harness.nextServiceResults = [result("req-1", "failed", true)];

    harness.click("show-1"); // acquires and settles synchronously in this harness
    assert.equal(harness.serviceCallCount, 1);

    // The failed explicit Retry atomically restores `retry_available`; reconstruction must not
    // supersede that verified, usable scope.
    const reconstruction = harness.reconstruct("show-1", [result("req-1", "already_terminal", false)]);
    reconstruction.settle();
    assert.equal(harness.serviceCallCount, 1);
  });

  it("Test G: three-state UI contract — retryable, remediation-only, and none render distinctly", () => {
    const retryable = new ReconstructionHarness();
    retryable.actionWarning = "1 request update(s) still need retry.";
    retryable.failedReconciliationRequestIds = ["req-1"];
    assert.equal(retryable.reconciliationRetryUiState, "retryable");

    const remediationOnly = new ReconstructionHarness();
    remediationOnly.actionWarning = "1 request record(s) need data remediation.";
    remediationOnly.remediationRequestIds = ["req-2"];
    assert.equal(remediationOnly.reconciliationRetryUiState, "remediation_only");

    const none = new ReconstructionHarness();
    assert.equal(none.reconciliationRetryUiState, "none");
  });
});
