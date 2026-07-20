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
  it("says the show is full when no spots remain", () => {
    assert.equal(
      formatShowCapacityExceededMessage(5, 0),
      "This show is already full. Please choose another show.",
    );
  });

  it("asks the customer to remove or lower when remaining spots are insufficient", () => {
    assert.equal(
      formatShowCapacityExceededMessage(15, 5),
      "You can add at most 5 prints to this show. Your request has 15 prints. Remove or lower quantities by 10 before adding to this show.",
    );
  });
});
