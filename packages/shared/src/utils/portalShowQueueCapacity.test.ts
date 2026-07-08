import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canFitPrintRequestOnShow,
  formatShowCapacityExceededMessage,
  sumPrintRequestItemQuantities,
} from "./portalShowQueueCapacity";

describe("sumPrintRequestItemQuantities", () => {
  it("sums item quantities", () => {
    assert.equal(
      sumPrintRequestItemQuantities([
        { quantity: 2 },
        { quantity: 3 },
      ]),
      5,
    );
  });
});

describe("canFitPrintRequestOnShow", () => {
  it("allows any quantity when show has no max", () => {
    assert.equal(
      canFitPrintRequestOnShow({
        totalQuantity: 100,
        allocatedQuantity: 50,
      }),
      true,
    );
  });

  it("allows when quantity fits remaining capacity", () => {
    assert.equal(
      canFitPrintRequestOnShow({
        totalQuantity: 5,
        maxTotalQuantity: 20,
        allocatedQuantity: 10,
      }),
      true,
    );
  });

  it("blocks when quantity exceeds remaining capacity", () => {
    assert.equal(
      canFitPrintRequestOnShow({
        totalQuantity: 15,
        maxTotalQuantity: 20,
        allocatedQuantity: 10,
      }),
      false,
    );
  });
});

describe("formatShowCapacityExceededMessage", () => {
  it("formats a user-safe capacity message", () => {
    assert.match(formatShowCapacityExceededMessage(15, 5), /5 spots left/);
    assert.match(formatShowCapacityExceededMessage(15, 5), /15 prints/);
  });
});
