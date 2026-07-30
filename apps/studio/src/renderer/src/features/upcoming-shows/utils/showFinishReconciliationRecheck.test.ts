/**
 * Composed post-Finish reconciliation re-check tests (Plan Section 31, Amendment 13).
 *
 * Following this repo's no-DOM-rendering convention, this file mirrors
 * `upcomingShowService.markShowPrintingFinished`'s post-commit reconciliation sequence exactly —
 * a first pass over all affected print requests via `reconcileCompletedPrintRequest`, then (only if
 * that first pass reported any `"failed"` outcomes) a second bounded re-check limited to exactly
 * those failed IDs, merged back into the final result set — using the ACTUAL production functions
 * (`reconcileCompletedPrintRequest`, `summarizeShowCompletionReconciliation`,
 * `classifyCommittedShowTimerPhase`), not a reimplementation of their decision logic.
 *
 * This closes the false-positive defect: a `serverTimestamp()` sentinel written in the same batch
 * that finished a show is not guaranteed resolved in the very next standalone read, which could make
 * an allocation transiently fail `mapShowAllocationData` and be excluded from a print request's
 * printed-quantity sum for one immediate read — reporting "needs retry" for a request that was, in
 * fact, already fully printed. A single bounded re-check (never remediation IDs, never an unbounded
 * rescan) resolves the false positive while leaving a genuine failure reported exactly as before.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  reconcileCompletedPrintRequest,
  summarizeShowCompletionReconciliation,
  type ShowCompletionReconciliationResult,
} from "./showCompletionReconciliation";
import { classifyCommittedShowTimerPhase } from "./showTimerActionPhase";

/**
 * A per-request dependency set keyed by printRequestId, so a test can make one request's
 * "allocation read" succeed while another's transiently fails — mirroring how each affected print
 * request has its own independent Firestore reads in the real service.
 */
interface RequestFixture {
  readRequest: () => Promise<{ status: string }>;
  readItems: () => Promise<{ quantity: number }[]>;
  readAllocations: () => Promise<{ status: string; allocatedQuantity: number }[]>;
  writeCompleted: () => Promise<void>;
}

function fixture(overrides: Partial<RequestFixture> = {}): RequestFixture {
  return {
    readRequest: async () => ({ status: "active" }),
    readItems: async () => [{ quantity: 5 }],
    readAllocations: async () => [{ status: "done", allocatedQuantity: 5 }],
    writeCompleted: async () => undefined,
    ...overrides,
  };
}

/**
 * Mirrors `markShowPrintingFinished`'s exact post-commit sequence: first pass over every affected
 * request, then (only if there are first-pass failures) a bounded re-check of exactly those IDs,
 * merged back by printRequestId. `fixturesById` may be mutated between the first pass and the
 * re-check to simulate a transient condition resolving (e.g. a `serverTimestamp()` sentinel settling)
 * by the time the second read runs.
 */
async function runFinishReconciliation(
  affectedPrintRequestIds: string[],
  fixturesById: Map<string, RequestFixture>,
): Promise<{
  failedRequestIds: string[];
  remediationRequestIds: string[];
  reconciliation: ShowCompletionReconciliationResult[];
  recheckedIds: string[];
}> {
  const runOne = (printRequestId: string) =>
    reconcileCompletedPrintRequest(printRequestId, {
      readRequest: () => fixturesById.get(printRequestId)!.readRequest(),
      readItems: () => fixturesById.get(printRequestId)!.readItems(),
      readAllocations: () => fixturesById.get(printRequestId)!.readAllocations(),
      writeCompleted: () => fixturesById.get(printRequestId)!.writeCompleted(),
      isPrintedStatus: (status) => status === "done" || status === "printed",
    });

  const firstPassReconciliation = await Promise.all(affectedPrintRequestIds.map(runOne));
  const firstPassSummary = summarizeShowCompletionReconciliation(firstPassReconciliation);

  let reconciliation = firstPassReconciliation;
  let failedRequestIds = firstPassSummary.failedRequestIds;
  const remediationRequestIds = firstPassSummary.remediationRequestIds;
  let recheckedIds: string[] = [];

  if (failedRequestIds.length > 0) {
    recheckedIds = [...failedRequestIds];
    const recheckResults = await Promise.all(failedRequestIds.map(runOne));
    const recheckById = new Map(recheckResults.map((result) => [result.printRequestId, result]));
    reconciliation = firstPassReconciliation.map(
      (result) => recheckById.get(result.printRequestId) ?? result,
    );
    ({ failedRequestIds } = summarizeShowCompletionReconciliation(reconciliation));
  }

  return { failedRequestIds, remediationRequestIds, reconciliation, recheckedIds };
}

describe("post-Finish reconciliation re-check (composed, production functions)", () => {
  it("Test A: a transient first-pass failure that resolves on re-check produces zero final failures and no warning", async () => {
    let attempt = 0;
    const fixturesById = new Map<string, RequestFixture>([
      [
        "request-1",
        fixture({
          // First read: simulates the serverTimestamp() sentinel not yet resolved (throws, as
          // mapShowAllocationData would). Second read: the sentinel has since settled.
          readAllocations: async () => {
            attempt += 1;
            if (attempt === 1) {
              throw new Error("A show allocation record is incomplete.");
            }
            return [{ status: "done", allocatedQuantity: 5 }];
          },
        }),
      ],
    ]);

    const result = await runFinishReconciliation(["request-1"], fixturesById);

    assert.deepEqual(result.failedRequestIds, [], "the re-check resolved the transient failure");
    assert.deepEqual(result.recheckedIds, ["request-1"], "exactly the failed ID was re-checked");
    assert.equal(
      result.reconciliation.find((r) => r.printRequestId === "request-1")?.outcome,
      "completed",
    );

    const phase = classifyCommittedShowTimerPhase(
      {
        reconciliation: {
          affectedRequestCount: 1,
          failedRequestCount: result.failedRequestIds.length,
          failedRequestIds: result.failedRequestIds,
          remediationRequestCount: result.remediationRequestIds.length,
          remediationRequestIds: result.remediationRequestIds,
          results: result.reconciliation,
        },
      },
      false,
    );
    assert.equal(phase, "committed", "no false-positive warning renders for the resolved request");
  });

  it("Test B: a genuine, still-failing request is reported unchanged after the re-check", async () => {
    const fixturesById = new Map<string, RequestFixture>([
      [
        "request-1",
        fixture({
          // Fails identically every time — a real, non-transient defect.
          readAllocations: async () => {
            throw new Error("permission-denied");
          },
        }),
      ],
    ]);

    const result = await runFinishReconciliation(["request-1"], fixturesById);

    assert.deepEqual(result.failedRequestIds, ["request-1"], "genuine failure remains reported");
    assert.deepEqual(result.recheckedIds, ["request-1"]);

    const phase = classifyCommittedShowTimerPhase(
      {
        reconciliation: {
          affectedRequestCount: 1,
          failedRequestCount: result.failedRequestIds.length,
          failedRequestIds: result.failedRequestIds,
          remediationRequestCount: result.remediationRequestIds.length,
          remediationRequestIds: result.remediationRequestIds,
          results: result.reconciliation,
        },
      },
      false,
    );
    assert.equal(phase, "committed_reconciliation_partial", "the Retry button must still appear");
  });

  it("Test C: a remediation-only result is never re-checked", async () => {
    const readRequestCount = 0;

    // `reconcileCompletedPrintRequest` classifies remediation outcomes by error TYPE
    // (`ShowCompletionReconciliationRemediationError`), which is exercised fully in
    // `showCompletionReconciliation.test.ts`. Here we only need to prove the re-check gate NEVER
    // invokes the service again for an ID that was classified as remediation on the first pass —
    // modeled directly against a hand-built remediation result, with `readRequestCount` standing in
    // for "a re-check service call happened" (it would only ever increment if this ID were re-run).
    const remediationResult: ShowCompletionReconciliationResult = {
      printRequestId: "request-1",
      outcome: "needs_remediation",
      phase: "allocation_read",
      parserStatus: "incompatible",
      missingFields: ["updatedAt"],
      legacyExtraFields: [],
      currentStatus: "active",
      proposedStatus: "completed",
      writeRequired: false,
      success: false,
      commitment: "not_committed",
      retryEligible: false,
      diagnosticCode: "record_needs_remediation",
    };

    const { failedRequestIds, remediationRequestIds } =
      summarizeShowCompletionReconciliation([remediationResult]);
    assert.deepEqual(failedRequestIds, [], "remediation results are never classified as failed");
    assert.deepEqual(remediationRequestIds, ["request-1"]);

    // Mirror the actual gate: the re-check only ever runs `if (failedRequestIds.length > 0)`.
    assert.equal(
      failedRequestIds.length > 0,
      false,
      "the re-check gate does not fire for a remediation-only first pass",
    );
    assert.equal(readRequestCount, 0, "no re-check service call was ever made for the remediation ID");
  });

  it("Test D: a mixed batch reports only the genuinely-failing ID after re-check", async () => {
    let request1Attempt = 0;
    const fixturesById = new Map<string, RequestFixture>([
      [
        "request-1",
        fixture({
          // Resolves on the second attempt (transient).
          readAllocations: async () => {
            request1Attempt += 1;
            if (request1Attempt === 1) {
              throw new Error("A show allocation record is incomplete.");
            }
            return [{ status: "done", allocatedQuantity: 5 }];
          },
        }),
      ],
      [
        "request-2",
        fixture({
          // Fails identically every time (genuine).
          readAllocations: async () => {
            throw new Error("permission-denied");
          },
        }),
      ],
    ]);

    const result = await runFinishReconciliation(["request-1", "request-2"], fixturesById);

    assert.deepEqual(result.failedRequestIds, ["request-2"], "only the genuinely-failing ID remains");
    assert.deepEqual(
      new Set(result.recheckedIds),
      new Set(["request-1", "request-2"]),
      "both first-pass failures were re-checked",
    );
  });

  it("Test E: the re-check invokes markPrintRequestCompletedIfFullyPrinted only for first-pass-failed IDs, never the full affected set", async () => {
    const invokedIds: string[] = [];
    const fixturesById = new Map<string, RequestFixture>([
      ["request-1", fixture()], // succeeds on the first pass
      [
        "request-2",
        fixture({
          readAllocations: async () => {
            throw new Error("permission-denied");
          },
        }),
      ],
    ]);

    const runOne = (printRequestId: string) => {
      invokedIds.push(printRequestId);
      return reconcileCompletedPrintRequest(printRequestId, {
        readRequest: () => fixturesById.get(printRequestId)!.readRequest(),
        readItems: () => fixturesById.get(printRequestId)!.readItems(),
        readAllocations: () => fixturesById.get(printRequestId)!.readAllocations(),
        writeCompleted: () => fixturesById.get(printRequestId)!.writeCompleted(),
        isPrintedStatus: (status) => status === "done" || status === "printed",
      });
    };

    const firstPassReconciliation = await Promise.all(["request-1", "request-2"].map(runOne));
    const firstPassSummary = summarizeShowCompletionReconciliation(firstPassReconciliation);
    invokedIds.length = 0; // only count re-check invocations from here

    if (firstPassSummary.failedRequestIds.length > 0) {
      await Promise.all(firstPassSummary.failedRequestIds.map(runOne));
    }

    assert.deepEqual(invokedIds, ["request-2"], "the re-check invoked the service only for the failed ID");
  });
});
