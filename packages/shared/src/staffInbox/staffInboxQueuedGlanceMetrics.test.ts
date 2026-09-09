import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { StaffInboxPortalAllocationSnapshot } from "./staffInbox.types";
import {
  buildStaffInboxQueuedGlanceMetrics,
  filterAllocationsForQueuedGroup,
} from "./staffInboxQueuedGlanceMetrics";

function allocation(
  overrides: Partial<StaffInboxPortalAllocationSnapshot> &
    Pick<StaffInboxPortalAllocationSnapshot, "printRequestId" | "upcomingShowId" | "status">,
): StaffInboxPortalAllocationSnapshot {
  return {
    requestNameSnapshot: "CR-1",
    createdAtMillis: 1,
    allocatedQuantity: 1,
    printRequestItemId: "item-1",
    ...overrides,
  };
}

describe("staffInboxQueuedGlanceMetrics", () => {
  it("aggregates unique designs and print qty from active allocations", () => {
    const metrics = buildStaffInboxQueuedGlanceMetrics([
      allocation({
        printRequestId: "req-1",
        upcomingShowId: "show-1",
        status: "queued",
        designId: "d1",
        allocatedQuantity: 2,
        printWidthInches: 3,
        printHeightInches: 3,
        printRequestItemId: "item-a",
      }),
      allocation({
        printRequestId: "req-1",
        upcomingShowId: "show-1",
        status: "pending",
        designId: "d2",
        allocatedQuantity: 3,
        printWidthInches: 10,
        printHeightInches: 10,
        printRequestItemId: "item-b",
      }),
      allocation({
        printRequestId: "req-1",
        upcomingShowId: "show-1",
        status: "canceled",
        designId: "d3",
        allocatedQuantity: 99,
        printRequestItemId: "item-c",
      }),
    ]);

    assert.deepEqual(metrics, {
      designCount: 2,
      printQuantity: 5,
      pricingUnits: [
        { printWidthInches: 3, printHeightInches: 3, quantity: 2 },
        { printWidthInches: 10, printHeightInches: 10, quantity: 3 },
      ],
    });
  });

  it("counts upload-backed and item-backed identities without designId", () => {
    const metrics = buildStaffInboxQueuedGlanceMetrics([
      allocation({
        printRequestId: "req-1",
        upcomingShowId: "show-1",
        status: "queued",
        customerUploadId: "up-1",
        allocatedQuantity: 1,
        printRequestItemId: "item-u",
      }),
      allocation({
        printRequestId: "req-1",
        upcomingShowId: "show-1",
        status: "queued",
        allocatedQuantity: 4,
        printRequestItemId: "item-only",
      }),
    ]);

    assert.equal(metrics?.designCount, 2);
    assert.equal(metrics?.printQuantity, 5);
    assert.equal(metrics?.pricingUnits.length, 0);
  });

  it("returns null when no active allocations remain", () => {
    assert.equal(
      buildStaffInboxQueuedGlanceMetrics([
        allocation({
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          status: "canceled",
          allocatedQuantity: 2,
        }),
      ]),
      null,
    );
  });

  it("filters allocations to one request+show group", () => {
    const filtered = filterAllocationsForQueuedGroup(
      [
        allocation({
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          status: "queued",
        }),
        allocation({
          printRequestId: "req-1",
          upcomingShowId: "show-2",
          status: "queued",
        }),
        allocation({
          printRequestId: "req-2",
          upcomingShowId: "show-1",
          status: "queued",
        }),
      ],
      "req-1",
      "show-1",
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.upcomingShowId, "show-1");
  });
});
