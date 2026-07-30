import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ShowCompletionReconciliationResult } from "./showCompletionReconciliation";
import { executeShowReconciliationRetry } from "./showReconciliationRetryController";
import { ShowProductionRetrySession } from "./showProductionRetrySession";

function completed(id: string): ShowCompletionReconciliationResult {
  return {
    printRequestId: id,
    outcome: "completed",
    phase: "committed",
    parserStatus: "compatible",
    missingFields: [],
    legacyExtraFields: [],
    currentStatus: "active",
    proposedStatus: "completed",
    writeRequired: true,
    success: true,
    commitment: "committed",
    retryEligible: false,
    diagnosticCode: "completed",
  };
}

function retryable(id: string): ShowCompletionReconciliationResult {
  return {
    ...completed(id),
    outcome: "failed",
    phase: "request_write",
    success: false,
    commitment: "not_committed",
    retryEligible: true,
    diagnosticCode: "failed",
    firebaseErrorCode: "unavailable",
  };
}

function availableSession(showId = "show-1"): ShowProductionRetrySession {
  const session = new ShowProductionRetrySession();
  session.setShowId(showId);
  const finish = session.beginTimerAction(showId);
  session.complete(finish.token!, true);
  return session;
}

describe("production show reconciliation retry controller", () => {
  it("acquires synchronously, invokes the service once, and resolves the exact scope", async () => {
    const session = availableSession();
    let calls = 0;
    let acquiredPhase = "";
    const execution = await executeShowReconciliationRetry({
      session,
      showId: "show-1",
      requestIds: ["req-1"],
      onAcquired: () => {
        acquiredPhase = session.snapshot().phase;
      },
      invoke: async (ids) => {
        calls += 1;
        assert.deepEqual(ids, ["req-1"]);
        return { results: [completed("req-1")] };
      },
    });

    assert.equal(acquiredPhase, "explicit_retry");
    assert.equal(calls, 1);
    assert.equal(execution.kind, "resolved");
    assert.equal(session.snapshot().phase, "idle");
  });

  it("blocks a rapid duplicate while the first production execution is pending", async () => {
    const session = availableSession();
    let calls = 0;
    let release!: (value: { results: ShowCompletionReconciliationResult[] }) => void;
    const pending = new Promise<{ results: ShowCompletionReconciliationResult[] }>((resolve) => {
      release = resolve;
    });
    const invoke = async () => {
      calls += 1;
      return pending;
    };

    const first = executeShowReconciliationRetry({
      session, showId: "show-1", requestIds: ["req-1"], invoke,
    });
    const duplicate = await executeShowReconciliationRetry({
      session, showId: "show-1", requestIds: ["req-1"], invoke,
    });
    assert.equal(duplicate.kind, "acquisition_failed");
    assert.equal(calls, 1);
    release({ results: [completed("req-1")] });
    await first;
  });

  it("releases retry availability in finally after service rejection", async () => {
    const session = availableSession();
    let release:
      | {
          previous: string;
          next: string;
          reason: string;
          stale: boolean;
        }
      | undefined;
    const execution = await executeShowReconciliationRetry({
      session,
      showId: "show-1",
      requestIds: ["req-1"],
      invoke: async () => {
        throw Object.assign(new Error("offline"), { code: "unavailable" });
      },
      onReleased: (event) => {
        release = {
          previous: event.previous.phase,
          next: event.next.phase,
          reason: event.reason,
          stale: event.staleSettlementDiscarded,
        };
      },
    });
    assert.equal(execution.kind, "rejected");
    assert.equal(session.canStartRetry("show-1"), true);
    assert.deepEqual(release, {
      previous: "explicit_retry",
      next: "retry_available",
      reason: "retry_rejected",
      stale: false,
    });
  });

  it("discards a settlement after unmount and cannot reactivate its stale token", async () => {
    const session = availableSession();
    let release!: (value: { results: ShowCompletionReconciliationResult[] }) => void;
    const pending = new Promise<{ results: ShowCompletionReconciliationResult[] }>((resolve) => {
      release = resolve;
    });
    let staleRelease = false;
    const executionPromise = executeShowReconciliationRetry({
      session,
      showId: "show-1",
      requestIds: ["req-1"],
      invoke: async () => pending,
      onReleased: (event) => {
        staleRelease = event.staleSettlementDiscarded;
      },
    });
    session.markUnmounted();
    release({ results: [retryable("req-1")] });
    const execution = await executionPromise;
    assert.equal(execution.kind, "stale_discarded");
    assert.equal(session.snapshot().phase, "disposed");
    assert.equal(staleRelease, true);
  });

  it("supports Strict-Mode cleanup/setup and remount reconstruction availability", () => {
    const session = new ShowProductionRetrySession();
    session.setShowId("show-1");
    session.markUnmounted();
    session.markMounted();
    const reconstruction = session.beginReconstruction("show-1");
    assert.equal(reconstruction.ok, true);
    session.complete(reconstruction.token!, true);
    assert.equal(session.canStartRetry("show-1"), true);
  });
});
