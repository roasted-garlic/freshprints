import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  reconcileShowCompletionWithCommittedVerification,
  verifyFailedReconciliationWithCommittedState,
} from "./postFinishCommittedVerification";
import {
  reconcileCompletedPrintRequest,
  ShowCompletionReconciliationRemediationError,
  type ShowCompletionReconciliationResult,
} from "./showCompletionReconciliation";

function result(
  printRequestId: string,
  outcome: ShowCompletionReconciliationResult["outcome"],
): ShowCompletionReconciliationResult {
  const success = outcome !== "failed" && outcome !== "needs_remediation";
  return {
    printRequestId,
    outcome,
    phase: outcome === "needs_remediation" ? "allocation_read" : "committed",
    parserStatus: outcome === "needs_remediation" ? "incompatible" : "compatible",
    missingFields: outcome === "needs_remediation" ? ["designId"] : [],
    legacyExtraFields: [],
    proposedStatus: "completed",
    writeRequired: outcome === "completed",
    success,
    commitment: outcome === "completed" ? "committed" : "not_committed",
    retryEligible: outcome === "failed",
    diagnosticCode: outcome,
  };
}

describe("committed post-Finish verification", () => {
  it("uses one server-only pass for exactly provisional failed IDs", async () => {
    const calls: Array<{ id: string; source: string }> = [];
    const verified = await verifyFailedReconciliationWithCommittedState(
      [
        result("complete", "completed"),
        result("transient", "failed"),
        result("remediation", "needs_remediation"),
      ],
      async (id, source) => {
        calls.push({ id, source });
        return result(id, "already_terminal");
      },
    );

    assert.deepEqual(calls, [{ id: "transient", source: "server" }]);
    assert.deepEqual(verified.candidateRequestIds, ["transient"]);
    assert.deepEqual(verified.failedRequestIds, []);
    assert.deepEqual(verified.remediationRequestIds, ["remediation"]);
  });

  it("keeps a genuine server failure retryable and committed malformed data remediation-only", async () => {
    const failed = await verifyFailedReconciliationWithCommittedState(
      [result("retryable", "failed")],
      async (id) => result(id, "failed"),
    );
    assert.deepEqual(failed.failedRequestIds, ["retryable"]);

    let calls = 0;
    const remediation = await verifyFailedReconciliationWithCommittedState(
      [result("repair", "needs_remediation")],
      async (id) => {
        calls += 1;
        return result(id, "already_terminal");
      },
    );
    assert.equal(calls, 0);
    assert.deepEqual(remediation.remediationRequestIds, ["repair"]);
  });

  it("replaces the provisional failure once; no later provisional settlement can overwrite it", async () => {
    const provisional = result("request-1", "failed");
    const verified = await verifyFailedReconciliationWithCommittedState(
      [provisional],
      async (id) => result(id, "already_terminal"),
    );
    assert.equal(verified.results[0]?.outcome, "already_terminal");
    assert.equal(provisional.outcome, "failed");
  });

  it("executes the production orchestration with default then server source for a real timestamp-remediation classification", async () => {
    const calls: Array<{ id: string; source: string }> = [];
    const reconciled = await reconcileShowCompletionWithCommittedVerification(
      ["request-1"],
      async (id, source) => {
        calls.push({ id, source });
        return reconcileCompletedPrintRequest(id, {
          readRequest: async () => ({ status: source === "server" ? "completed" : "active" }),
          readItems: async () => [{ quantity: 5 }],
          readAllocations: async () => {
            if (source === "default") {
              throw new ShowCompletionReconciliationRemediationError(
                "pending timestamp",
                { missingFields: ["updatedAt"] },
              );
            }
            return [{ status: "done", allocatedQuantity: 5 }];
          },
          writeCompleted: async () => undefined,
          isPrintedStatus: (status) => status === "done",
        });
      },
    );

    assert.equal(reconciled.provisionalResults[0]?.outcome, "needs_remediation");
    assert.deepEqual(calls, [
      { id: "request-1", source: "default" },
      { id: "request-1", source: "server" },
    ]);
    assert.deepEqual(reconciled.failedRequestIds, []);
    assert.deepEqual(reconciled.remediationRequestIds, []);
    assert.equal(reconciled.results[0]?.outcome, "already_terminal");
  });

  it("verifies a timestamp-shaped provisional remediation but preserves committed remediation", async () => {
    const timestampRemediation = {
      ...result("request-1", "needs_remediation"),
      missingFields: ["updatedAt"],
    };
    const verified = await verifyFailedReconciliationWithCommittedState(
      [timestampRemediation],
      async (id, source) => {
        assert.equal(source, "server");
        return {
          ...result(id, "needs_remediation"),
          missingFields: ["designId"],
        };
      },
    );
    assert.deepEqual(verified.candidateRequestIds, ["request-1"]);
    assert.deepEqual(verified.remediationRequestIds, ["request-1"]);
  });

  it("wires request, item, and allocation reconciliation reads to server-only Firebase APIs", async () => {
    const printRequestServiceSource = await readFile(
      new URL("../../print-requests/services/printRequestService.ts", import.meta.url),
      "utf8",
    );
    const upcomingShowServiceSource = await readFile(
      new URL("../services/upcomingShowService.ts", import.meta.url),
      "utf8",
    );

    assert.match(printRequestServiceSource, /getPrintRequestForShowReconciliation[\s\S]*getDocFromServer/);
    assert.match(printRequestServiceSource, /listPrintRequestItemsForShowReconciliation[\s\S]*getDocsFromServer/);
    assert.match(upcomingShowServiceSource, /listShowAllocationsForPrintRequestForReconciliation[\s\S]*getDocsFromServer/);
    assert.match(
      upcomingShowServiceSource,
      /retryShowCompletionReconciliation[\s\S]*markPrintRequestCompletedIfFullyPrinted\(caller, printRequestId, "server"\)/,
    );
  });
});
