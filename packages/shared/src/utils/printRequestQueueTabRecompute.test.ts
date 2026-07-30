import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computePrintRequestQueueTab } from "./printRequestQueueTabRecompute";

describe("computePrintRequestQueueTab", () => {
  it("is working with no items", () => {
    assert.equal(
      computePrintRequestQueueTab({ status: "draft", items: [], allocations: [] }),
      "working",
    );
  });

  it("is working with items but no allocations", () => {
    assert.equal(
      computePrintRequestQueueTab({
        status: "editing",
        items: [{ quantity: 2 }],
        allocations: [],
      }),
      "working",
    );
  });

  it("is queued once any allocation exists", () => {
    assert.equal(
      computePrintRequestQueueTab({
        status: "active",
        items: [{ quantity: 3 }],
        allocations: [{ allocatedQuantity: 3, status: "pending" }],
      }),
      "queued",
    );
  });

  it("is printing when an allocation is in_progress", () => {
    assert.equal(
      computePrintRequestQueueTab({
        status: "active",
        items: [{ quantity: 3 }],
        allocations: [{ allocatedQuantity: 3, status: "in_progress" }],
      }),
      "printing",
    );
  });

  it("is printed once printed quantity meets requested quantity", () => {
    assert.equal(
      computePrintRequestQueueTab({
        status: "active",
        items: [{ quantity: 3 }],
        allocations: [{ allocatedQuantity: 3, status: "printed" }],
      }),
      "printed",
    );
  });

  it("treats status completed as printed regardless of allocations", () => {
    assert.equal(
      computePrintRequestQueueTab({ status: "completed", items: [], allocations: [] }),
      "printed",
    );
  });

  it("ignores canceled allocations entirely", () => {
    assert.equal(
      computePrintRequestQueueTab({
        status: "active",
        items: [{ quantity: 3 }],
        allocations: [{ allocatedQuantity: 3, status: "canceled" }],
      }),
      "working",
    );
  });

  it("sums multiple items and multiple allocations", () => {
    assert.equal(
      computePrintRequestQueueTab({
        status: "active",
        items: [{ quantity: 2 }, { quantity: 3 }],
        allocations: [
          { allocatedQuantity: 2, status: "printed" },
          { allocatedQuantity: 3, status: "printed" },
        ],
      }),
      "printed",
    );
  });

  it("treats non-finite quantities as zero without throwing", () => {
    assert.equal(
      computePrintRequestQueueTab({
        status: "draft",
        items: [{ quantity: Number.NaN }],
        allocations: [{ allocatedQuantity: Number.NaN, status: "pending" }],
      }),
      "working",
    );
  });
});
