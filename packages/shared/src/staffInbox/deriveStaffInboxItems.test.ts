import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveStaffInboxBadgeCounts,
  deriveStaffInboxItems,
  listQueuedGroupKeys,
} from "./deriveStaffInboxItems";
import { buildStaffInboxItemId } from "./staffInboxItemIds";
import { listFullPortalShowIds } from "./staffInboxShowSnapshots";

const baseShow = {
  id: "show-1",
  productionStatus: "open",
  maxTotalQuantity: 10,
  allocatedQuantity: 5,
  updatedAtMillis: 300,
};

describe("deriveStaffInboxItems", () => {
  it("does not create working items for portal requests without allocations", () => {
    const items = deriveStaffInboxItems({
      portalRequests: [
        {
          id: "req-1",
          name: "CR-jane-1",
          itemCount: 2,
          customerDisplayNameSnapshot: "Jane",
          updatedAtMillis: 100,
        },
      ],
      portalAllocations: [],
      acknowledgedItemIds: new Set(),
      showTitleById: {},
      shows: [],
    });

    assert.equal(items.length, 0);
  });

  it("creates a queued item when portal allocations exist on a show", () => {
    const items = deriveStaffInboxItems({
      portalAllocations: [
        {
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          requestNameSnapshot: "CR-jane-1",
          status: "pending",
          createdAtMillis: 200,
        },
      ],
      acknowledgedItemIds: new Set(),
      showTitleById: { "show-1": "Friday Vinyl" },
      shows: [baseShow],
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.kind, "portal_queued");
    assert.equal(items[0]?.upcomingShowId, "show-1");
    assert.match(items[0]?.subtitle ?? "", /Friday Vinyl/);
  });

  it("creates a full item when a portal show reaches capacity", () => {
    const items = deriveStaffInboxItems({
      portalAllocations: [
        {
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          requestNameSnapshot: "CR-jane-1",
          status: "pending",
          createdAtMillis: 200,
        },
      ],
      acknowledgedItemIds: new Set(),
      showTitleById: { "show-1": "Friday Vinyl" },
      shows: [{ ...baseShow, allocatedQuantity: 10 }],
    });

    assert.equal(items.length, 2);
    assert.equal(items[0]?.kind, "portal_queued");
    assert.equal(items[1]?.kind, "show_queue_full");
  });

  it("sorts queued before show full when both share the same timestamp", () => {
    const items = deriveStaffInboxItems({
      portalAllocations: [
        {
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          requestNameSnapshot: "CR-jane-1",
          status: "pending",
          createdAtMillis: 500,
        },
      ],
      acknowledgedItemIds: new Set(),
      showTitleById: { "show-1": "Friday Vinyl" },
      shows: [{ ...baseShow, allocatedQuantity: 10, updatedAtMillis: 100 }],
    });

    assert.equal(items[0]?.kind, "portal_queued");
    assert.equal(items[0]?.occurredAtMillis, 500);
    assert.equal(items[1]?.kind, "show_queue_full");
    assert.equal(items[1]?.occurredAtMillis, 500);
  });

  it("hides acknowledged items", () => {
    const ackId = buildStaffInboxItemId("portal_queued", "req-1", "show-1");
    const items = deriveStaffInboxItems({
      portalAllocations: [
        {
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          requestNameSnapshot: "CR-jane-1",
          status: "pending",
          createdAtMillis: 100,
        },
      ],
      acknowledgedItemIds: new Set([ackId]),
      showTitleById: { "show-1": "Friday Vinyl" },
      shows: [baseShow],
    });

    assert.equal(items.length, 0);
  });

  it("derives badge counts from open items", () => {
    const items = deriveStaffInboxItems({
      portalAllocations: [
        {
          printRequestId: "req-2",
          upcomingShowId: "show-1",
          requestNameSnapshot: "CR-b-1",
          status: "pending",
          createdAtMillis: 150,
        },
      ],
      acknowledgedItemIds: new Set(),
      showTitleById: { "show-1": "Friday Vinyl" },
      shows: [baseShow],
    });

    const counts = deriveStaffInboxBadgeCounts(items);
    assert.equal(counts.printRequests, 1);
    assert.equal(counts.showQueue, 1);
  });

  it("lists queued group keys for toast detection", () => {
    const keys = listQueuedGroupKeys([
      {
        printRequestId: "req-1",
        upcomingShowId: "show-1",
        requestNameSnapshot: "CR-jane-1",
        status: "pending",
        createdAtMillis: 1,
      },
      {
        printRequestId: "req-1",
        upcomingShowId: "show-1",
        requestNameSnapshot: "CR-jane-1",
        status: "pending",
        createdAtMillis: 2,
      },
    ]);

    assert.deepEqual(keys, ["req-1:show-1"]);
  });

  it("lists full portal show ids", () => {
    const fullShowIds = listFullPortalShowIds(
      [{ ...baseShow, productionStatus: "full" }],
      [
        {
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          requestNameSnapshot: "CR-jane-1",
          status: "pending",
          createdAtMillis: 1,
        },
      ],
    );

    assert.deepEqual(fullShowIds, ["show-1"]);
  });
});
