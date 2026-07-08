import assert from "node:assert/strict";
import { test } from "node:test";

import { groupAllocationsByShow } from "./groupAllocationsByShow";
import type { ShowAllocation } from "../types/showAllocation/showAllocation.types";

function buildAllocation(overrides: Partial<ShowAllocation>): ShowAllocation {
  return {
    id: "alloc-1",
    upcomingShowId: "show-1",
    printRequestId: "request-1",
    printRequestItemId: "item-1",
    designId: "design-1",
    requestNameSnapshot: "Request 1",
    allocatedQuantity: 5,
    sourceItemQuantitySnapshot: 5,
    status: "pending",
    addedBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toDate: () => new Date() } as ShowAllocation["createdAt"],
    updatedAt: { toDate: () => new Date() } as ShowAllocation["updatedAt"],
    ...overrides,
  };
}

test("groupAllocationsByShow: groups allocations for the same show together", () => {
  const allocations = [
    buildAllocation({ id: "a1", upcomingShowId: "show-1", printRequestItemId: "item-1" }),
    buildAllocation({ id: "a2", upcomingShowId: "show-1", printRequestItemId: "item-2" }),
  ];

  const groups = groupAllocationsByShow(allocations);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].upcomingShowId, "show-1");
  assert.equal(groups[0].allocations.length, 2);
});

test("groupAllocationsByShow: splits allocations across multiple shows into separate groups", () => {
  const allocations = [
    buildAllocation({ id: "a1", upcomingShowId: "show-1" }),
    buildAllocation({ id: "a2", upcomingShowId: "show-2" }),
  ];

  const groups = groupAllocationsByShow(allocations);

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((group) => group.upcomingShowId).sort(),
    ["show-1", "show-2"],
  );
});

test("groupAllocationsByShow: empty input produces no groups", () => {
  assert.deepEqual(groupAllocationsByShow([]), []);
});
