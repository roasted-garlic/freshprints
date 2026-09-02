import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";

import { buildMovedDestinationByPrintRequestId } from "./buildMovedDestinationByPrintRequestId";

function alloc(overrides: Partial<ShowAllocation> & Pick<ShowAllocation, "id">): ShowAllocation {
  return {
    upcomingShowId: "show-a",
    printRequestId: "pr-1",
    printRequestItemId: "item-1",
    designId: "design-1",
    requestNameSnapshot: "CR001",
    allocatedQuantity: 5,
    sourceItemQuantitySnapshot: 5,
    status: "canceled",
    addedBy: "staff",
    updatedBy: "staff",
    createdAt: { toMillis: () => 1 } as ShowAllocation["createdAt"],
    updatedAt: { toMillis: () => 1 } as ShowAllocation["updatedAt"],
    ...overrides,
  };
}

describe("buildMovedDestinationByPrintRequestId", () => {
  it("maps canceled source rows to destination via movedFromAllocationId", () => {
    const source = alloc({ id: "src-1", status: "canceled" });
    const dest = alloc({
      id: "dest-1",
      upcomingShowId: "show-b",
      status: "pending",
      movedFromAllocationId: "src-1",
    });

    const map = buildMovedDestinationByPrintRequestId({
      sourceShowId: "show-a",
      sourceAllocations: [source],
      relatedAllocations: [source, dest],
    });

    assert.deepEqual(map.get("pr-1")?.destinationShowIds, ["show-b"]);
  });

  it("ignores canceled rows with no lineage destination", () => {
    const source = alloc({ id: "src-1", status: "canceled" });
    const map = buildMovedDestinationByPrintRequestId({
      sourceShowId: "show-a",
      sourceAllocations: [source],
      relatedAllocations: [source],
    });
    assert.equal(map.has("pr-1"), false);
  });
});
