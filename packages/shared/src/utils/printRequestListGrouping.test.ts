import assert from "node:assert/strict";
import { test } from "node:test";

import { derivePrintRequestListTab } from "./printRequestListGrouping";

test("derivePrintRequestListTab: draft with no allocations is Working", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 10,
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
      status: "draft",
    }),
    "working",
  );
});

test("derivePrintRequestListTab: any active allocation is Queued", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 10,
      totalAllocatedQuantity: 4,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
      status: "active",
    }),
    "queued",
  );
});

test("derivePrintRequestListTab: in-progress allocations are Printing", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 10,
      totalAllocatedQuantity: 10,
      totalInProgressQuantity: 10,
      totalPrintedQuantity: 0,
      status: "active",
    }),
    "printing",
  );
});

test("derivePrintRequestListTab: fully printed quantity is Printed", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 10,
      totalAllocatedQuantity: 10,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 10,
      status: "active",
    }),
    "printed",
  );
});

test("derivePrintRequestListTab: completed status is Printed even without allocation data", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 0,
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
      status: "completed",
    }),
    "printed",
  );
});

test("derivePrintRequestListTab: partially printed but not fully is still Queued", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 10,
      totalAllocatedQuantity: 10,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 4,
      status: "active",
    }),
    "queued",
  );
});

test("derivePrintRequestListTab: editing status with no allocations is Editing", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 10,
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
      status: "editing",
    }),
    "editing",
  );
});

test("derivePrintRequestListTab: editing with allocations is Queued (allocation wins)", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 10,
      totalAllocatedQuantity: 4,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
      status: "editing",
    }),
    "queued",
  );
});

test("derivePrintRequestListTab: draft with no allocations stays Working (not Editing)", () => {
  assert.equal(
    derivePrintRequestListTab({
      totalRequestedQuantity: 0,
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
      status: "draft",
    }),
    "working",
  );
});
