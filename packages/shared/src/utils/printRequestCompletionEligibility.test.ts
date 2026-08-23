import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePrintRequestCompletionEligibility } from "./printRequestCompletionEligibility";

test("evaluatePrintRequestCompletionEligibility returns eligible when printed qty meets requested", () => {
  assert.equal(
    evaluatePrintRequestCompletionEligibility({
      requestStatus: "active",
      items: [{ quantity: 5 }],
      allocations: [{ status: "done", allocatedQuantity: 5 }],
    }),
    "eligible",
  );
});

test("evaluatePrintRequestCompletionEligibility returns not_eligible for partial multi-sheet work", () => {
  assert.equal(
    evaluatePrintRequestCompletionEligibility({
      requestStatus: "active",
      items: [{ quantity: 10 }],
      allocations: [
        { status: "done", allocatedQuantity: 4 },
        { status: "pending", allocatedQuantity: 6 },
      ],
    }),
    "not_eligible",
  );
});

test("evaluatePrintRequestCompletionEligibility returns already_terminal for completed", () => {
  assert.equal(
    evaluatePrintRequestCompletionEligibility({
      requestStatus: "completed",
      items: [{ quantity: 1 }],
      allocations: [{ status: "done", allocatedQuantity: 1 }],
    }),
    "already_terminal",
  );
});
