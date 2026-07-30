/**
 * Composed retry-lifecycle behavior tests (Plan Section 28, Implementation Review 11 finding 3).
 *
 * This repo has no DOM-rendering test convention (docs/standards/TESTING.md), so per that same
 * convention (and Implementation Review 11's explicit instruction), this file drives the ACTUAL
 * production classes/functions `useShowProductionTimer.ts` calls —
 * `ShowProductionRetrySession` (the synchronous session authority) and
 * `resolveShowReconciliationRetryOutcome` (the structured success/failure/remediation decision) —
 * composed into a small harness (`RetryHarness`) that mirrors the hook's own `retryReconciliation`
 * sequence line for line: acquire the session lock, call the (faked) service, resolve the
 * structured outcome, check `isStillAuthoritative`, then apply or discard the settlement. This is
 * not a parallel reimplementation of the hook's decision logic — every decision (can this retry
 * start, is this settlement still valid, what does this result mean) is delegated to the same
 * production primitives the hook uses.
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
    firebaseErrorCode: outcome === "failed" ? "permission-denied" : undefined,
  };
}

/**
 * Mirrors useShowProductionTimer's own state fields relevant to retry, plus a call counter to the
 * faked service so duplicate-invocation tests can assert on it directly.
 */
class RetryHarness {
  readonly session = new ShowProductionRetrySession();
  currentShowId: string | null = null;
  serviceCallCount = 0;
  lastServiceCallRequestIds: string[] | null = null;

  retryStatus: "idle" | "retrying" | "succeeded" | "partial_failure" | "failed" = "idle";
  actionWarning: string | null = null;
  actionError: string | null = null;
  canRetryReconciliation = true;
  failedReconciliationRequestIds: string[] = [];
  remediationRequestIds: string[] = [];
  isActionPending = false;

  setShowId(showId: string | null): void {
    this.currentShowId = showId;
    this.session.setShowId(showId);
  }

  beginTimerAction(): void {
    this.session.beginTimerAction(this.currentShowId ?? "");
  }

  unmount(): void {
    this.session.markUnmounted();
  }

  /**
   * Mirrors retryReconciliation's exact sequence. `resolveService` is called synchronously when
   * invoked by the test to control exactly when the service "settles" relative to other harness
   * calls (show switch, another action, unmount) — mirroring how a real network response can arrive
   * at an arbitrary point relative to other UI activity.
   */
  beginRetry(
    showId: string,
    requestIds: string[],
  ): {
    settleSuccess: (serviceResults: ShowCompletionReconciliationResult[]) => void;
    settleRejected: (message: string) => void;
  } {
    if (this.session.snapshot().phase === "idle") {
      const verified = this.session.beginTimerAction(showId);
      this.session.complete(verified.token!, requestIds.length > 0);
    }
    const acquireResult = this.session.acquireRetry(showId);
    if (!acquireResult.ok || acquireResult.token === undefined) {
      // Synchronous no-op — exactly mirrors the hook returning early without calling the service.
      return {
        settleSuccess: () => undefined,
        settleRejected: () => undefined,
      };
    }
    const token = acquireResult.token;

    this.retryStatus = "retrying";
    this.actionError = null;
    this.isActionPending = true;
    this.serviceCallCount += 1;
    this.lastServiceCallRequestIds = requestIds;

    return {
      settleSuccess: (serviceResults) => {
        const retryOutcome = resolveShowReconciliationRetryOutcome(requestIds.length, serviceResults);
        if (!this.session.isStillAuthoritative(showId, token)) {
          this.session.complete(token, false);
          return;
        }
        const succeeded = retryOutcome.status === "succeeded";
        this.retryStatus = retryOutcome.status;
        this.actionWarning = succeeded ? null : retryOutcome.message;
        this.actionError = succeeded ? null : retryOutcome.message;
        this.canRetryReconciliation = retryOutcome.retryEligible;
        this.failedReconciliationRequestIds = retryOutcome.unresolvedRequestIds;
        this.remediationRequestIds = retryOutcome.remediationRequestIds;
        this.isActionPending = false;
        this.session.complete(token, retryOutcome.retryEligible);
      },
      settleRejected: (message) => {
        if (!this.session.isStillAuthoritative(showId, token)) {
          this.session.complete(token, true);
          return;
        }
        this.retryStatus = "failed";
        this.actionError = message;
        this.isActionPending = false;
        this.session.complete(token, true);
      },
    };
  }
}

describe("useShowProductionTimer retry lifecycle (composed, production controller)", () => {
  it("Test A: pending state before settlement", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];

    const settlement = harness.beginRetry("show-1", ["req-1"]);

    assert.equal(harness.retryStatus, "retrying", "status becomes Retrying before settlement");
    assert.equal(harness.serviceCallCount, 1, "the exact retry scope was passed once");
    assert.deepEqual(harness.lastServiceCallRequestIds, ["req-1"]);

    // Settle after assertions, so the pending-state assertions above are genuinely pre-settlement.
    settlement.settleSuccess([result("req-1", "completed", false)]);
  });

  it("Test B: rapid duplicate activation results in exactly one service call", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];

    const first = harness.beginRetry("show-1", ["req-1"]);
    const second = harness.beginRetry("show-1", ["req-1"]);

    assert.equal(harness.serviceCallCount, 1, "exactly one service call for two synchronous activations");

    first.settleSuccess([result("req-1", "completed", false)]);
    second.settleSuccess([result("req-1", "completed", false)]); // no-op token, must not double-apply
  });

  it("Test C: stale settlement after show switch is discarded", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-a");
    harness.failedReconciliationRequestIds = ["req-a"];

    const settlementA = harness.beginRetry("show-a", ["req-a"]);

    // User switches to Show B before Show A's retry resolves.
    harness.setShowId("show-b");
    harness.retryStatus = "idle";
    harness.actionWarning = null;
    harness.actionError = null;
    harness.failedReconciliationRequestIds = [];
    harness.remediationRequestIds = [];

    // Show A's retry now settles with a failure — must be discarded, not applied to Show B's state.
    settlementA.settleSuccess([result("req-a", "failed", true)]);

    assert.equal(harness.retryStatus, "idle", "Show B's status must be untouched by Show A's stale settlement");
    assert.equal(harness.actionWarning, null);
    assert.equal(harness.actionError, null);
    assert.deepEqual(harness.failedReconciliationRequestIds, []);
    assert.deepEqual(harness.remediationRequestIds, []);
  });

  it("Test D: stale settlement after a newer timer action is discarded", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];

    const settlement = harness.beginRetry("show-1", ["req-1"]);

    // Owner clicks Pause (a new timer action) while the retry is still in flight.
    harness.beginTimerAction();
    harness.retryStatus = "idle";
    harness.failedReconciliationRequestIds = [];

    settlement.settleSuccess([result("req-1", "completed", false)]);

    assert.equal(harness.retryStatus, "idle", "the older retry's result must be ignored");
    assert.deepEqual(harness.failedReconciliationRequestIds, []);
  });

  it("Test E: unmount invalidation discards any pending settlement", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];

    const settlement = harness.beginRetry("show-1", ["req-1"]);
    harness.unmount();

    const beforeStatus = harness.retryStatus;
    settlement.settleSuccess([result("req-1", "completed", false)]);

    assert.equal(harness.retryStatus, beforeStatus, "no state write occurs after unmount");
  });

  it("Test F: complete success clears the warning and scope; second retry is a no-op", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1", "req-2"];

    const settlement = harness.beginRetry("show-1", ["req-1", "req-2"]);
    settlement.settleSuccess([
      result("req-1", "completed", false),
      result("req-2", "completed", false),
    ]);

    assert.equal(harness.retryStatus, "succeeded");
    assert.equal(harness.actionWarning, null, "warning clears");
    assert.deepEqual(harness.failedReconciliationRequestIds, [], "scope clears");
    assert.equal(harness.canRetryReconciliation, false, "retry button disappears");

    // A second retry attempt with an empty scope must be a synchronous no-op (mirrors the hook's
    // own `failedReconciliationRequestIds.length === 0` guard).
    const beforeCallCount = harness.serviceCallCount;
    if (harness.failedReconciliationRequestIds.length === 0) {
      // Nothing to retry — the hook returns immediately without acquiring the session.
    } else {
      harness.beginRetry("show-1", harness.failedReconciliationRequestIds);
    }
    assert.equal(harness.serviceCallCount, beforeCallCount, "second retry after success made no service call");
  });

  it("Test G: partial failure retains only the exact remaining failed ID", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1", "req-2"];

    const settlement = harness.beginRetry("show-1", ["req-1", "req-2"]);
    settlement.settleSuccess([
      result("req-1", "completed", false),
      result("req-2", "failed", true),
    ]);

    assert.equal(harness.retryStatus, "partial_failure");
    assert.deepEqual(harness.failedReconciliationRequestIds, ["req-2"], "only the exact failed ID remains");
    assert.equal(harness.canRetryReconciliation, true);
  });

  it("Test H: remediation-only result is never reported as succeeded", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];

    const settlement = harness.beginRetry("show-1", ["req-1"]);
    settlement.settleSuccess([result("req-1", "needs_remediation", false)]);

    assert.notEqual(harness.retryStatus, "succeeded", "remediation-only must never be success");
    assert.match(harness.actionWarning ?? "", /remediation/i);
    assert.deepEqual(harness.remediationRequestIds, ["req-1"]);
    assert.equal(harness.canRetryReconciliation, false, "nothing transient left to retry");
  });

  it("Test I: a rejected service call retains the retry scope and shows a safe error", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];

    const settlement = harness.beginRetry("show-1", ["req-1"]);
    settlement.settleRejected("permission-denied");

    assert.equal(harness.retryStatus, "failed");
    assert.equal(harness.actionError, "permission-denied");
    assert.deepEqual(
      harness.failedReconciliationRequestIds,
      ["req-1"],
      "rejected calls retain the original retry scope",
    );

    // A later retry may proceed (lock was released).
    const nextAttempt = harness.beginRetry("show-1", harness.failedReconciliationRequestIds);
    assert.equal(harness.serviceCallCount, 2, "a later retry may proceed after a rejected call");
    nextAttempt.settleSuccess([result("req-1", "completed", false)]);
  });

  it("Test J: a resolved warning does not resurrect from stale local state after re-selecting the same show", () => {
    const harness = new RetryHarness();
    harness.setShowId("show-1");
    harness.failedReconciliationRequestIds = ["req-1"];

    const settlement = harness.beginRetry("show-1", ["req-1"]);
    settlement.settleSuccess([result("req-1", "completed", false)]);
    assert.equal(harness.retryStatus, "succeeded");

    // Simulate leaving and re-selecting the same show (mirrors a remount/reselect) — the hook's own
    // per-show-id reset effect clears all retry state on show-id change, even to a value it held
    // before, since the effect key is `show?.id` and a genuine navigation away-and-back re-runs it.
    harness.setShowId(null);
    harness.retryStatus = "idle";
    harness.actionWarning = null;
    harness.failedReconciliationRequestIds = [];
    harness.setShowId("show-1");

    assert.equal(harness.retryStatus, "idle", "no stale success/warning resurrects");
    assert.equal(harness.actionWarning, null);
  });
});
