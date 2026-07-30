import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPortalQueueTransactionBlockReason } from "./portalQueueTransactionEligibility";

describe("ADR-FP-122 authoritative queue transaction eligibility", () => {
  const evaluate = (existing: number, added: number, sameRequest = false) =>
    getPortalQueueTransactionBlockReason({
      requestHasExistingAllocation: sameRequest,
      existingCustomerQuantityOnShow: existing,
      newRequestQuantity: added,
      customerShowCap: 25,
    });

  it("allows different request B when 22 + 3 reaches 25", () => assert.equal(evaluate(22, 3), null));
  it("blocks different request B when 22 + 4 exceeds 25", () =>
    assert.equal(evaluate(22, 4), "customer_show_cap_exceeded"));
  it("allows 23 + 2 and blocks 23 + 3", () => {
    assert.equal(evaluate(23, 2), null);
    assert.equal(evaluate(23, 3), "customer_show_cap_exceeded");
  });
  it("denies re-queueing request A even when capacity remains", () =>
    assert.equal(evaluate(22, 3, true), "request_already_allocated"));
});
