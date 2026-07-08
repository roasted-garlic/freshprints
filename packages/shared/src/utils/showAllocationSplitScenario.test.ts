import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planAllocationSplit } from "./showCapacity";

describe("splitting a print request item across multiple shows", () => {
  it("splits a quantity-10 item into 6 allocated to Show A and 4 remaining for Show B", () => {
    const requestedQuantity = 10;
    const showARemainingCapacity = 6;

    const showAPlan = planAllocationSplit({ requestedQuantity, remainingCapacity: showARemainingCapacity });

    assert.equal(showAPlan.fittingQuantity, 6);
    assert.equal(showAPlan.overflowQuantity, 4);
    assert.equal(showAPlan.fitsEntirely, false);

    // The overflow from Show A becomes the new requested quantity for Show B.
    const showBPlan = planAllocationSplit({ requestedQuantity: showAPlan.overflowQuantity, remainingCapacity: undefined });

    assert.equal(showBPlan.fittingQuantity, 4);
    assert.equal(showBPlan.overflowQuantity, 0);
    assert.equal(showBPlan.fitsEntirely, true);
    assert.equal(showAPlan.fittingQuantity + showBPlan.fittingQuantity, requestedQuantity);
  });
});
