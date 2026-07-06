import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assessShowCapacity, planAllocationSplit } from "./showCapacity";

describe("assessShowCapacity", () => {
  it("reports no cap when maxTotalQuantity is undefined", () => {
    const result = assessShowCapacity({ maxTotalQuantity: undefined, allocatedQuantity: 40 });

    assert.equal(result.remainingQuantity, undefined);
    assert.equal(result.isFull, false);
    assert.equal(result.isOverCapacity, false);
  });

  it("computes remaining capacity under the max", () => {
    const result = assessShowCapacity({ maxTotalQuantity: 100, allocatedQuantity: 60 });

    assert.equal(result.remainingQuantity, 40);
    assert.equal(result.isFull, false);
    assert.equal(result.isOverCapacity, false);
  });

  it("marks a show full when allocated quantity equals the max", () => {
    const result = assessShowCapacity({ maxTotalQuantity: 100, allocatedQuantity: 100 });

    assert.equal(result.remainingQuantity, 0);
    assert.equal(result.isFull, true);
    assert.equal(result.isOverCapacity, false);
  });

  it("marks a show over capacity when allocated quantity exceeds the max via staff override", () => {
    const result = assessShowCapacity({ maxTotalQuantity: 100, allocatedQuantity: 110 });

    assert.equal(result.remainingQuantity, -10);
    assert.equal(result.isFull, true);
    assert.equal(result.isOverCapacity, true);
  });
});

describe("planAllocationSplit", () => {
  it("fits the entire quantity when there is no capacity cap", () => {
    const plan = planAllocationSplit({ requestedQuantity: 25, remainingCapacity: undefined });

    assert.equal(plan.fittingQuantity, 25);
    assert.equal(plan.overflowQuantity, 0);
    assert.equal(plan.fitsEntirely, true);
  });

  it("fits the entire quantity when it is within remaining capacity", () => {
    const plan = planAllocationSplit({ requestedQuantity: 10, remainingCapacity: 20 });

    assert.equal(plan.fittingQuantity, 10);
    assert.equal(plan.overflowQuantity, 0);
    assert.equal(plan.fitsEntirely, true);
  });

  it("splits the quantity when it exceeds remaining capacity", () => {
    const plan = planAllocationSplit({ requestedQuantity: 10, remainingCapacity: 6 });

    assert.equal(plan.fittingQuantity, 6);
    assert.equal(plan.overflowQuantity, 4);
    assert.equal(plan.fitsEntirely, false);
  });

  it("fits nothing when remaining capacity is zero or negative", () => {
    const zeroPlan = planAllocationSplit({ requestedQuantity: 5, remainingCapacity: 0 });
    assert.equal(zeroPlan.fittingQuantity, 0);
    assert.equal(zeroPlan.overflowQuantity, 5);

    const negativePlan = planAllocationSplit({ requestedQuantity: 5, remainingCapacity: -3 });
    assert.equal(negativePlan.fittingQuantity, 0);
    assert.equal(negativePlan.overflowQuantity, 5);
  });
});
