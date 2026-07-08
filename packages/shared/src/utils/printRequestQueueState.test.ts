import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { derivePrintRequestQueueState, isPrintRequestFullyPrinted } from "./printRequestQueueState";

describe("derivePrintRequestQueueState", () => {
  it("returns not_queued when nothing has been allocated", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "not_queued");
  });

  it("returns not_queued for a request with no items", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 0,
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "not_queued");
  });

  it("returns partially_queued when only part of the total quantity is allocated to shows", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 12,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "partially_queued");
  });

  it("returns queued when the full requested quantity is allocated across one or more shows", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 20,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "queued");
  });

  it("returns printing when any allocated quantity is in progress", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 20,
      totalInProgressQuantity: 20,
      totalPrintedQuantity: 0,
    });

    assert.equal(state, "printing");
  });

  it("returns partially_printed when some allocated quantity has been printed but not all", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 20,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 8,
    });

    assert.equal(state, "partially_printed");
  });

  it("returns printed when the full requested quantity has been printed", () => {
    const state = derivePrintRequestQueueState({
      totalRequestedQuantity: 20,
      totalAllocatedQuantity: 20,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 20,
    });

    assert.equal(state, "printed");
  });
});

describe("isPrintRequestFullyPrinted", () => {
  it("returns true when lifecycle status is completed", () => {
    assert.equal(
      isPrintRequestFullyPrinted({
        status: "completed",
        totalRequestedQuantity: 5,
        totalAllocatedQuantity: 5,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 3,
      }),
      true,
    );
  });

  it("returns true when queue state is printed", () => {
    assert.equal(
      isPrintRequestFullyPrinted({
        status: "active",
        totalRequestedQuantity: 5,
        totalAllocatedQuantity: 5,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 5,
      }),
      true,
    );
  });

  it("returns false when only partially printed", () => {
    assert.equal(
      isPrintRequestFullyPrinted({
        status: "active",
        totalRequestedQuantity: 5,
        totalAllocatedQuantity: 5,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 2,
      }),
      false,
    );
  });
});
