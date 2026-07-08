import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessPlacedCopyAvailability,
  canPlaceAnotherCopy,
  countPlacedCopiesByAllocation,
} from "./gangSheetItemQuantity";

describe("countPlacedCopiesByAllocation", () => {
  it("counts placed items per allocation", () => {
    const counts = countPlacedCopiesByAllocation([
      { showAllocationId: "alloc-1" },
      { showAllocationId: "alloc-1" },
      { showAllocationId: "alloc-2" },
    ]);

    assert.equal(counts.get("alloc-1"), 2);
    assert.equal(counts.get("alloc-2"), 1);
  });

  it("returns an empty map for no placed items", () => {
    const counts = countPlacedCopiesByAllocation([]);
    assert.equal(counts.size, 0);
  });
});

describe("assessPlacedCopyAvailability", () => {
  it("reports remaining placeable quantity under the allocation cap", () => {
    const [result] = assessPlacedCopyAvailability(
      [{ showAllocationId: "alloc-1", allocatedQuantity: 5 }],
      [{ showAllocationId: "alloc-1" }, { showAllocationId: "alloc-1" }],
    );

    assert.equal(result.placedCount, 2);
    assert.equal(result.remainingPlaceable, 3);
    assert.equal(result.isFullyPlaced, false);
  });

  it("marks fully placed when placed count equals allocated quantity", () => {
    const [result] = assessPlacedCopyAvailability(
      [{ showAllocationId: "alloc-1", allocatedQuantity: 2 }],
      [{ showAllocationId: "alloc-1" }, { showAllocationId: "alloc-1" }],
    );

    assert.equal(result.remainingPlaceable, 0);
    assert.equal(result.isFullyPlaced, true);
  });

  it("never reports negative remaining when over-placed", () => {
    const [result] = assessPlacedCopyAvailability(
      [{ showAllocationId: "alloc-1", allocatedQuantity: 1 }],
      [{ showAllocationId: "alloc-1" }, { showAllocationId: "alloc-1" }, { showAllocationId: "alloc-1" }],
    );

    assert.equal(result.remainingPlaceable, 0);
    assert.equal(result.isFullyPlaced, true);
  });

  it("reports zero placed for an allocation with no placed items", () => {
    const [result] = assessPlacedCopyAvailability(
      [{ showAllocationId: "alloc-1", allocatedQuantity: 4 }],
      [],
    );

    assert.equal(result.placedCount, 0);
    assert.equal(result.remainingPlaceable, 4);
    assert.equal(result.isFullyPlaced, false);
  });
});

describe("canPlaceAnotherCopy", () => {
  it("allows placement under the allocated quantity", () => {
    const allowed = canPlaceAnotherCopy(3, [{ showAllocationId: "alloc-1" }], "alloc-1");
    assert.equal(allowed, true);
  });

  it("blocks placement once the allocated quantity is reached", () => {
    const allowed = canPlaceAnotherCopy(
      2,
      [{ showAllocationId: "alloc-1" }, { showAllocationId: "alloc-1" }],
      "alloc-1",
    );
    assert.equal(allowed, false);
  });

  it("ignores placed items belonging to other allocations", () => {
    const allowed = canPlaceAnotherCopy(
      1,
      [{ showAllocationId: "alloc-2" }, { showAllocationId: "alloc-2" }],
      "alloc-1",
    );
    assert.equal(allowed, true);
  });
});
