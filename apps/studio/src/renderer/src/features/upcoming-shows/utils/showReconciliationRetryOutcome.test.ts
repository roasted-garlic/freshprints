import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveShowReconciliationRetryOutcome } from "./showReconciliationRetryOutcome";
import type { ShowCompletionReconciliationResult } from "./showCompletionReconciliation";

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

describe("show reconciliation retry outcome", () => {
  it("succeeds only with zero unresolved/remediation results", () => {
    const outcome = resolveShowReconciliationRetryOutcome(1, [result("a", "completed", false)]);
    assert.equal(outcome.status, "succeeded");
    assert.deepEqual(outcome.unresolvedRequestIds, []);
    assert.deepEqual(outcome.remediationRequestIds, []);
    assert.equal(outcome.remediationCount, 0);
    assert.equal(outcome.retryEligible, false);
    assert.match(outcome.message, /reconciled/i);
  });

  it("retains only exact transient failures and distinguishes partial failure", () => {
    const outcome = resolveShowReconciliationRetryOutcome(2, [
      result("done", "completed", false),
      result("retry", "failed", true),
    ]);
    assert.equal(outcome.status, "partial_failure");
    assert.deepEqual(outcome.unresolvedRequestIds, ["retry"]);
    assert.deepEqual(outcome.remediationRequestIds, []);
    assert.equal(outcome.remediationCount, 0);
    assert.equal(outcome.retryEligible, true);
  });

  it("does not put remediation into the retry scope, and a remediation-only result is never succeeded", () => {
    const outcome = resolveShowReconciliationRetryOutcome(1, [
      result("repair", "needs_remediation", false),
    ]);
    assert.equal(outcome.status, "failed");
    assert.notEqual(outcome.status, "succeeded");
    assert.deepEqual(outcome.unresolvedRequestIds, []);
    assert.deepEqual(outcome.remediationRequestIds, ["repair"]);
    assert.equal(outcome.remediationCount, 1);
    assert.equal(outcome.retryEligible, false, "remediation-only has nothing left to retry");
    assert.match(outcome.message, /remediation/i);
  });

  it("a mix of transient failure and remediation is failed/partial, never succeeded, and both scopes are exact", () => {
    const outcome = resolveShowReconciliationRetryOutcome(3, [
      result("done", "completed", false),
      result("retry", "failed", true),
      result("repair", "needs_remediation", false),
    ]);
    assert.notEqual(outcome.status, "succeeded");
    assert.deepEqual(outcome.unresolvedRequestIds, ["retry"]);
    assert.deepEqual(outcome.remediationRequestIds, ["repair"]);
    assert.equal(outcome.retryEligible, true);
  });
});
