import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePrintRequestCompletionEligibility } from "../../../packages/shared/src/utils/printRequestCompletionEligibility";
import { computePrintRequestQueueTab } from "../../../packages/shared/src/utils/printRequestQueueTabRecompute";
import { isFinishableShowAllocationStatus } from "../../../packages/shared/src/utils/showFinishAllocationStatuses";

/**
 * Behavioral simulation of Internal Gang Sheet Mark Complete reconciliation:
 * finishable allocations → done, then eligibility + queueTab (no Firestore).
 */
function simulateStaffGangSheetFinishReconciliation(input: {
  requestStatus: "draft" | "active" | "editing" | "completed" | "archived";
  items: Array<{ quantity: number }>;
  allocations: Array<{ status: string; allocatedQuantity: number; sheetId: string }>;
  completedSheetId: string;
}) {
  const afterFinish = input.allocations.map((allocation) => {
    if (
      allocation.sheetId === input.completedSheetId &&
      isFinishableShowAllocationStatus(allocation.status as never)
    ) {
      return { ...allocation, status: "done" };
    }
    return allocation;
  });

  const eligibility = evaluatePrintRequestCompletionEligibility({
    requestStatus: input.requestStatus,
    items: input.items,
    allocations: afterFinish,
  });

  const nextStatus =
    eligibility === "eligible" ? ("completed" as const) : input.requestStatus;

  const queueTab = computePrintRequestQueueTab({
    status: nextStatus,
    items: input.items,
    allocations: afterFinish.map((allocation) => ({
      allocatedQuantity: allocation.allocatedQuantity,
      status: allocation.status as never,
    })),
  });

  return { afterFinish, eligibility, nextStatus, queueTab };
}

test("full Internal sheet finish moves eligible request to Printed queueTab", () => {
  const result = simulateStaffGangSheetFinishReconciliation({
    requestStatus: "active",
    items: [{ quantity: 3 }],
    allocations: [
      { status: "pending", allocatedQuantity: 1, sheetId: "sheet-a" },
      { status: "pending", allocatedQuantity: 2, sheetId: "sheet-a" },
    ],
    completedSheetId: "sheet-a",
  });

  assert.equal(result.eligibility, "eligible");
  assert.equal(result.nextStatus, "completed");
  assert.equal(result.queueTab, "printed");
  assert.ok(result.afterFinish.every((allocation) => allocation.status === "done"));
});

test("multiple PRs on one sheet each reach Printed when fully finished", () => {
  const first = simulateStaffGangSheetFinishReconciliation({
    requestStatus: "active",
    items: [{ quantity: 2 }],
    allocations: [{ status: "queued", allocatedQuantity: 2, sheetId: "sheet-a" }],
    completedSheetId: "sheet-a",
  });
  const second = simulateStaffGangSheetFinishReconciliation({
    requestStatus: "active",
    items: [{ quantity: 1 }],
    allocations: [{ status: "pending", allocatedQuantity: 1, sheetId: "sheet-a" }],
    completedSheetId: "sheet-a",
  });

  assert.equal(first.queueTab, "printed");
  assert.equal(second.queueTab, "printed");
});

test("partial multi-sheet work stays Queued and not eligible", () => {
  const result = simulateStaffGangSheetFinishReconciliation({
    requestStatus: "active",
    items: [{ quantity: 10 }],
    allocations: [
      { status: "pending", allocatedQuantity: 4, sheetId: "sheet-a" },
      { status: "pending", allocatedQuantity: 6, sheetId: "sheet-b" },
    ],
    completedSheetId: "sheet-a",
  });

  assert.equal(result.eligibility, "not_eligible");
  assert.equal(result.nextStatus, "active");
  assert.equal(result.queueTab, "queued");
  assert.equal(result.afterFinish[0]?.status, "done");
  assert.equal(result.afterFinish[1]?.status, "pending");
});

test("idempotent re-finish of already-done allocations stays Printed", () => {
  const result = simulateStaffGangSheetFinishReconciliation({
    requestStatus: "completed",
    items: [{ quantity: 2 }],
    allocations: [{ status: "done", allocatedQuantity: 2, sheetId: "sheet-a" }],
    completedSheetId: "sheet-a",
  });

  assert.equal(result.eligibility, "already_terminal");
  assert.equal(result.nextStatus, "completed");
  assert.equal(result.queueTab, "printed");
});

test("completing sheet A does not finish unrelated sheet B allocations", () => {
  const result = simulateStaffGangSheetFinishReconciliation({
    requestStatus: "active",
    items: [{ quantity: 5 }],
    allocations: [
      { status: "pending", allocatedQuantity: 2, sheetId: "sheet-a" },
      { status: "pending", allocatedQuantity: 3, sheetId: "sheet-b" },
    ],
    completedSheetId: "sheet-a",
  });

  assert.equal(result.afterFinish[0]?.status, "done");
  assert.equal(result.afterFinish[1]?.status, "pending");
  assert.equal(result.queueTab, "queued");
});
