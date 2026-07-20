import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatPortalOverflowGateTitle,
  formatPortalShowDoesNotFitEntireRequestMessage,
  formatPortalShowQueueBlockedMessage,
  planPortalShowQueueFit,
  remainingPerShowCustomerCap,
  remainingUnallocatedQuantityForItem,
  sumAllocatedQuantityByItemId,
  sumRemainingUnallocatedQuantity,
} from "./portalShowQueueFit";

describe("planPortalShowQueueFit", () => {
  it("partial fit when customer limit remaining is tighter than request", () => {
    const fit = planPortalShowQueueFit({
      requestedQuantity: 50,
      customerLimitRemaining: 25,
      showRemainingCapacity: undefined,
    });
    assert.equal(fit.fittingQuantity, 25);
    assert.equal(fit.overflowQuantity, 25);
    assert.equal(fit.fitsEntirely, false);
    assert.equal(fit.isBlocked, false);
    assert.equal(fit.limitingFactor, "customer_limit");
  });

  it("fits entirely when under L and capacity", () => {
    const fit = planPortalShowQueueFit({
      requestedQuantity: 20,
      customerLimitRemaining: 25,
      showRemainingCapacity: 100,
    });
    assert.equal(fit.fitsEntirely, true);
    assert.equal(fit.fittingQuantity, 20);
    assert.equal(fit.limitingFactor, "none");
  });

  it("uses tighter show capacity over customer limit", () => {
    const fit = planPortalShowQueueFit({
      requestedQuantity: 50,
      customerLimitRemaining: 25,
      showRemainingCapacity: 10,
    });
    assert.equal(fit.fittingQuantity, 10);
    assert.equal(fit.overflowQuantity, 40);
    assert.equal(fit.limitingFactor, "show_capacity");
  });

  it("blocks when customer limit remaining is 0", () => {
    const fit = planPortalShowQueueFit({
      requestedQuantity: 50,
      customerLimitRemaining: 0,
      showRemainingCapacity: 100,
    });
    assert.equal(fit.isBlocked, true);
    assert.equal(fit.fittingQuantity, 0);
    assert.equal(fit.limitingFactor, "customer_limit");
  });

  it("blocks when show is full", () => {
    const fit = planPortalShowQueueFit({
      requestedQuantity: 50,
      customerLimitRemaining: 25,
      showRemainingCapacity: 0,
    });
    assert.equal(fit.isBlocked, true);
    assert.equal(fit.fittingQuantity, 0);
    assert.equal(fit.limitingFactor, "show_capacity");
  });
});

describe("remainingPerShowCustomerCap", () => {
  it("computes remaining seats", () => {
    assert.equal(remainingPerShowCustomerCap(0, 25), 25);
    assert.equal(remainingPerShowCustomerCap(10, 25), 15);
    assert.equal(remainingPerShowCustomerCap(25, 25), 0);
    assert.equal(remainingPerShowCustomerCap(30, 25), 0);
  });
});

describe("allocation remaining helpers", () => {
  it("sums remaining unallocated quantity", () => {
    const allocated = sumAllocatedQuantityByItemId([
      { printRequestItemId: "a", allocatedQuantity: 2, status: "pending" },
      { printRequestItemId: "a", allocatedQuantity: 1, status: "canceled" },
      { printRequestItemId: "b", allocatedQuantity: 3, status: "pending" },
    ]);
    assert.equal(allocated.get("a"), 2);
    assert.equal(allocated.get("b"), 3);
    assert.equal(remainingUnallocatedQuantityForItem(5, 2), 3);
    assert.equal(
      sumRemainingUnallocatedQuantity(
        [
          { id: "a", quantity: 5 },
          { id: "b", quantity: 3 },
        ],
        allocated,
      ),
      3,
    );
  });
});

describe("copy", () => {
  it("overflow title and hard-reject message are customer-safe", () => {
    assert.equal(
      formatPortalOverflowGateTitle({ perShowLimit: 25 }),
      "Each Customer Is Limited to 25 Prints Per Show",
    );
    const msg = formatPortalShowDoesNotFitEntireRequestMessage({
      fittingQuantity: 10,
      totalQuantity: 25,
    });
    assert.match(msg, /room for only 10 of your 25/);
    assert.match(msg, /Reduce your Current Request to 10 or fewer/);
    assert.match(msg, /different show/);
    assert.doesNotMatch(msg, /Choose which prints|remainder|Cap B/i);
    assert.doesNotMatch(msg, /—/);
  });

  it("blocked messages", () => {
    assert.match(
      formatPortalShowQueueBlockedMessage("customer_limit", 25),
      /You've used all 25 print spots on this show/i,
    );
    assert.match(formatPortalShowQueueBlockedMessage("customer_limit", 25), /Choose another show for more designs/);
    assert.match(
      formatPortalShowQueueBlockedMessage("customer_limit"),
      /You've used all 25 print spots on this show/i,
    );
    assert.match(formatPortalShowQueueBlockedMessage("show_capacity"), /full/i);
  });
});
