import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import { groupAllocationsByRequest } from "./groupAllocationsByRequest";

function buildAllocation(overrides: Partial<ShowAllocation> = {}): ShowAllocation {
  return {
    id: "alloc-1",
    upcomingShowId: "show-1",
    printRequestId: "request-1",
    printRequestItemId: "item-1",
    designId: "design-1",
    requestNameSnapshot: "sarahsmith-CR001",
    allocatedQuantity: 5,
    sourceItemQuantitySnapshot: 5,
    status: "pending",
    addedBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toDate: () => new Date("2026-01-01") } as ShowAllocation["createdAt"],
    updatedAt: { toDate: () => new Date("2026-01-01") } as ShowAllocation["updatedAt"],
    ...overrides,
  };
}

describe("groupAllocationsByRequest", () => {
  it("groups multiple item allocations from the same request together", () => {
    const first = buildAllocation({ id: "alloc-1", printRequestItemId: "item-1", allocatedQuantity: 5 });
    const second = buildAllocation({ id: "alloc-2", printRequestItemId: "item-2", allocatedQuantity: 3 });

    const groups = groupAllocationsByRequest([first, second]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].printRequestId, "request-1");
    assert.equal(groups[0].allocations.length, 2);
  });

  it("keeps allocations from different requests in separate groups", () => {
    const requestOne = buildAllocation({ id: "alloc-1", printRequestId: "request-1" });
    const requestTwo = buildAllocation({ id: "alloc-2", printRequestId: "request-2", requestNameSnapshot: "internal-IR001" });

    const groups = groupAllocationsByRequest([requestOne, requestTwo]);

    assert.equal(groups.length, 2);
    assert.deepEqual(
      groups.map((group) => group.printRequestId).sort(),
      ["request-1", "request-2"],
    );
  });

  it("returns an empty array for no allocations", () => {
    assert.deepEqual(groupAllocationsByRequest([]), []);
  });

  it("sorts groups by most recently attached request first", () => {
    const olderRequest = buildAllocation({
      id: "alloc-1",
      printRequestId: "request-old",
      requestNameSnapshot: "older-CR001",
      createdAt: { toDate: () => new Date("2026-01-01"), toMillis: () => new Date("2026-01-01").getTime() } as ShowAllocation["createdAt"],
    });
    const newerRequest = buildAllocation({
      id: "alloc-2",
      printRequestId: "request-new",
      requestNameSnapshot: "newer-CR002",
      createdAt: { toDate: () => new Date("2026-02-01"), toMillis: () => new Date("2026-02-01").getTime() } as ShowAllocation["createdAt"],
    });

    const groups = groupAllocationsByRequest([olderRequest, newerRequest]);

    assert.deepEqual(
      groups.map((group) => group.printRequestId),
      ["request-new", "request-old"],
    );
  });
});
