import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatShowAllocationAttachmentLine,
  formatShowAllocationRequestGroupStatusLabel,
  partitionShowAllocationsByCanceled,
  sumShowAllocationQuantities,
} from "./showAllocationAttachmentDisplay";

describe("showAllocationAttachmentDisplay", () => {
  it("formats a design allocation line with size and quantity", () => {
    assert.equal(
      formatShowAllocationAttachmentLine({
        designTitleSnapshot: "Fresh Prints Logo",
        sizeLabel: "10×14",
        allocatedQuantity: 2,
        status: "queued",
      }),
      "Fresh Prints Logo · 10×14 · Qty 2",
    );
  });

  it("labels canceled rows as Released on past shows", () => {
    assert.equal(
      formatShowAllocationRequestGroupStatusLabel(
        [{ allocatedQuantity: 1, status: "canceled" }],
        { treatCanceledAsReleased: true },
      ),
      "Released",
    );
  });

  it("sums historical released quantities separately from active rows", () => {
    const allocations = [
      { allocatedQuantity: 3, status: "done" as const },
      { allocatedQuantity: 5, status: "canceled" as const },
    ];

    const { active, released } = partitionShowAllocationsByCanceled(allocations);
    assert.equal(sumShowAllocationQuantities(active), 3);
    assert.equal(sumShowAllocationQuantities(released), 5);
    assert.equal(sumShowAllocationQuantities(allocations), 8);
  });
});
