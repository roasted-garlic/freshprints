import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countsTowardPerShowCustomerCap,
  perShowCustomerCapExceededMessage,
  sumCustomerQuantityOnShow,
  wouldExceedPerShowCustomerCap,
} from "./printRequestPerShowCustomerCap";

describe("printRequestPerShowCustomerCap", () => {
  it("excludes canceled from the sum", () => {
    const total = sumCustomerQuantityOnShow([
      { allocatedQuantity: 5, status: "queued" },
      { allocatedQuantity: 3, status: "printed" },
      { allocatedQuantity: 10, status: "canceled" },
      { allocatedQuantity: 2, status: "done" },
    ]);
    assert.equal(total, 10);
  });

  it("countsTowardPerShowCustomerCap", () => {
    assert.equal(countsTowardPerShowCustomerCap("queued"), true);
    assert.equal(countsTowardPerShowCustomerCap("canceled"), false);
  });

  it("wouldExceedPerShowCustomerCap", () => {
    assert.equal(wouldExceedPerShowCustomerCap(0, 15, 15), false);
    assert.equal(wouldExceedPerShowCustomerCap(0, 16, 15), true);
    assert.equal(wouldExceedPerShowCustomerCap(10, 6, 15), true);
    assert.equal(wouldExceedPerShowCustomerCap(10, 5, 15), false);
  });

  it("error message when request exceeds show room", () => {
    const msg = perShowCustomerCapExceededMessage({
      cap: 25,
      existingOnShowQty: 0,
      newRequestQty: 50,
    });
    assert.match(msg, /room for only 25 of your 50/);
    assert.match(msg, /Reduce your Current Request by 25/);
    assert.match(msg, /different show/);
    assert.doesNotMatch(msg, /—/);
    assert.doesNotMatch(msg, /Cap B/i);
  });

  it("error message when customer spots on the show are exhausted", () => {
    const msg = perShowCustomerCapExceededMessage({
      cap: 25,
      existingOnShowQty: 25,
      newRequestQty: 10,
    });
    assert.match(msg, /You've used all 25 of your print spots on this show/i);
    assert.match(msg, /Choose another show for more designs/);
    assert.doesNotMatch(msg, /already have a (print )?request/i);
    assert.doesNotMatch(msg, /—/);
  });

  it("error message when partial room remains under L with existing prints", () => {
    const msg = perShowCustomerCapExceededMessage({
      cap: 25,
      existingOnShowQty: 10,
      newRequestQty: 20,
    });
    assert.match(msg, /room for only 15 of your 20/);
    assert.doesNotMatch(msg, /already have a (print )?request/i);
  });

  describe("ADR-FP-122 — multiple separate requests accumulating to L (exact owner boundary)", () => {
    it("0 + 23 = 23 -> allow (well under cap)", () => {
      assert.equal(wouldExceedPerShowCustomerCap(0, 23, 25), false);
    });

    it("22 + 3 = 25 -> allow (owner live boundary)", () => {
      assert.equal(wouldExceedPerShowCustomerCap(22, 3, 25), false);
    });

    it("22 + 4 = 26 -> block", () => {
      assert.equal(wouldExceedPerShowCustomerCap(22, 4, 25), true);
    });

    it("23 + 2 = 25 -> allow (exactly at cap)", () => {
      assert.equal(wouldExceedPerShowCustomerCap(23, 2, 25), false);
    });

    it("23 + 3 = 26 -> block (one over cap)", () => {
      assert.equal(wouldExceedPerShowCustomerCap(23, 3, 25), true);
    });

    it("24 + 1 = 25 -> allow (exactly at cap)", () => {
      assert.equal(wouldExceedPerShowCustomerCap(24, 1, 25), false);
    });

    it("24 + 2 = 26 -> block", () => {
      assert.equal(wouldExceedPerShowCustomerCap(24, 2, 25), true);
    });

    it("25 + 1 = 26 -> block (already at cap, any additional quantity blocks)", () => {
      assert.equal(wouldExceedPerShowCustomerCap(25, 1, 25), true);
    });

    it("a second separate request's quantity is not double-counted: summing two requests' allocations equals their simple sum", () => {
      // Models two SEPARATE printRequestId values both allocating to the same show for the same
      // customer — sumCustomerQuantityOnShow must count each exactly once regardless of how many
      // distinct requests contributed to the total (ADR-FP-122 explicitly allows multiple requests
      // on one show now).
      const total = sumCustomerQuantityOnShow([
        { allocatedQuantity: 23, status: "pending" }, // request A
        { allocatedQuantity: 2, status: "pending" }, // request B, separate printRequestId
      ]);
      assert.equal(total, 25, "each request's allocation must be counted exactly once, total 25");
    });
  });
});
