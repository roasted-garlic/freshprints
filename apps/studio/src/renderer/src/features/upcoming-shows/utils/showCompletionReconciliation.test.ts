import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reconcileCompletedPrintRequest } from "./showCompletionReconciliation";
import { ShowCompletionReconciliationRemediationError } from "./showCompletionReconciliation";
import { summarizeShowCompletionReconciliation } from "./showCompletionReconciliation";

function dependencies(overrides: Record<string, unknown> = {}) {
  let writeCount = 0;
  return {
    readRequest: async () => ({ status: "active" }),
    readItems: async () => [{ quantity: 5 }],
    readAllocations: async () => [{ status: "done", allocatedQuantity: 5 }],
    writeCompleted: async () => { writeCount += 1; },
    getWriteCount: () => writeCount,
    isPrintedStatus: (status: string) => status === "done" || status === "printed",
    ...overrides,
  };
}

describe("show completion reconciliation", () => {
  it("commits one eligible request without a post-write read", async () => {
    const deps = dependencies();
    const result = await reconcileCompletedPrintRequest("request-1", deps);
    assert.equal(result.printRequestId, "request-1");
    assert.equal(result.outcome, "completed");
    assert.equal(result.phase, "committed");
    assert.equal(result.commitment, "committed");
    assert.equal(result.retryEligible, false);
    assert.equal(result.writeRequired, true);
    assert.equal(deps.getWriteCount(), 1);
  });

  it("is an idempotent no-op for an already completed request", async () => {
    const deps = dependencies({ readRequest: async () => ({ status: "completed" }) });
    const result = await reconcileCompletedPrintRequest("request-1", deps);
    assert.equal(result.outcome, "already_terminal");
    assert.equal(result.phase, "eligibility");
    assert.equal(deps.getWriteCount(), 0);
  });

  it("does not complete a partially printed request", async () => {
    const deps = dependencies({
      readAllocations: async () => [{ status: "done", allocatedQuantity: 4 }],
    });
    const result = await reconcileCompletedPrintRequest("request-1", deps);
    assert.equal(result.outcome, "not_eligible");
    assert.equal(result.phase, "eligibility");
    assert.equal(deps.getWriteCount(), 0);
  });

  for (const [phase, override] of [
    ["request_read", { readRequest: async () => { throw new Error("request"); } }],
    ["item_read", { readItems: async () => { throw new Error("items"); } }],
    ["allocation_read", { readAllocations: async () => { throw new Error("allocations"); } }],
    ["request_write", { writeCompleted: async () => { throw new Error("write"); } }],
  ] as const) {
    it(`reports the exact ${phase} failure phase`, async () => {
      const result = await reconcileCompletedPrintRequest("request-1", dependencies(override));
      assert.equal(result.printRequestId, "request-1");
      assert.equal(result.outcome, "failed");
      assert.equal(result.phase, phase);
    });
  }

  it("distinguishes a malformed legacy allocation that needs remediation", async () => {
    const result = await reconcileCompletedPrintRequest("request-1", dependencies({
      readAllocations: async () => {
        throw new ShowCompletionReconciliationRemediationError(
          "allocation legacy-1 is incomplete",
          { missingFields: ["updatedAt"], legacyExtraFields: ["legacyMarker"] },
        );
      },
    }));
    assert.equal(result.outcome, "needs_remediation");
    assert.equal(result.phase, "allocation_read");
    assert.equal(result.retryEligible, false);
    assert.equal(result.parserStatus, "incompatible");
    assert.deepEqual(result.missingFields, ["updatedAt"]);
    assert.deepEqual(result.legacyExtraFields, ["legacyMarker"]);
  });

  it("preserves exact mapper-invalid request diagnostics", async () => {
    const result = await reconcileCompletedPrintRequest("request-1", dependencies({
      readRequest: async () => {
        throw new ShowCompletionReconciliationRemediationError(
          "incomplete request",
          { missingFields: ["itemCount"], legacyExtraFields: ["legacyShape"] },
        );
      },
    }));
    assert.equal(result.outcome, "needs_remediation");
    assert.equal(result.phase, "request_read");
    assert.equal(result.parserStatus, "incompatible");
    assert.deepEqual(result.missingFields, ["itemCount"]);
    assert.deepEqual(result.legacyExtraFields, ["legacyShape"]);
  });

  it("retains only transient failures for retry and keeps remediation separate", async () => {
    const transient = await reconcileCompletedPrintRequest("transient", dependencies({
      writeCompleted: async () => { throw new Error("temporary write rejection"); },
    }));
    const remediation = await reconcileCompletedPrintRequest("remediation", dependencies({
      readAllocations: async () => {
        throw new ShowCompletionReconciliationRemediationError("incomplete allocation");
      },
    }));
    const completed = await reconcileCompletedPrintRequest("completed", dependencies());
    assert.deepEqual(summarizeShowCompletionReconciliation([
      transient, remediation, completed,
    ]), {
      failedRequestIds: ["transient"],
      remediationRequestIds: ["remediation"],
    });
  });
});
