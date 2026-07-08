import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { derivePrintRequestQueueState } from "./printRequestQueueState";

describe("derivePrintRequestQueueState", () => {
  it("returns not_queued when nothing has been allocated", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 0,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "not_queued");
  });

  it("returns not_queued for a request with no items", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 0,
      totalAllocatedQuantity: 0,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "not_queued");
  });

  it("returns partially_queued when only part of the total quantity is allocated to shows", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 12,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "partially_queued");
  });

  it("returns queued when the full requested quantity is allocated across one or more shows", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 20,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "queued");
  });

  it("returns partially_printed when some allocated quantity has been printed but not all", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 20,
      totalPrintedQuantity: 8,
    });

    assert.equal(state, "partially_printed");
  });

  it("returns printed when the full requested quantity has been printed", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 20,
      totalPrintedQuantity: 20,
    });

    assert.equal(state, "printed");
  });
});
