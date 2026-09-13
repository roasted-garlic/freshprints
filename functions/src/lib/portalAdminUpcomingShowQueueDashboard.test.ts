import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPortalAdminUpcomingShowQueueDashboard } from "./portalAdminUpcomingShowQueueDashboard";

function ts(ms: number) {
  return {
    toMillis: () => ms,
    toDate: () => new Date(ms),
  };
}

describe("buildPortalAdminUpcomingShowQueueDashboard", () => {
  const now = new Date("2026-09-09T18:00:00.000Z");
  const futureA = Date.parse("2026-09-10T01:00:00.000Z");
  const futureB = Date.parse("2026-09-11T01:00:00.000Z");
  const past = Date.parse("2026-09-08T01:00:00.000Z");

  it("lists upcoming whatnot shows, excludes past and staff sheets, defaults to first", () => {
    const response = buildPortalAdminUpcomingShowQueueDashboard({
      now,
      projectId: "fresh-prints-dev",
      shows: [
        { id: "past", data: { title: "Past", source: "whatnot", scheduledStartAt: ts(past), maxTotalQuantity: 50 } },
        { id: "staff", data: { title: "Staff", source: "staff_gang_sheet", scheduledStartAt: ts(futureA) } },
        { id: "b", data: { title: "Later", source: "whatnot", scheduledStartAt: ts(futureB), maxTotalQuantity: 40 } },
        { id: "a", data: { title: "Soon", source: "whatnot", scheduledStartAt: ts(futureA), maxTotalQuantity: 40 } },
        { id: "fix", data: { title: "Fixture", source: "dev_fixture", scheduledStartAt: ts(futureA) } },
      ],
      selectedShowAllocations: [
        {
          id: "alloc-1",
          data: {
            upcomingShowId: "a",
            printRequestId: "pr-1",
            allocatedQuantity: 5,
            status: "queued",
            designId: "d1",
            sourceType: "catalog_design",
            requestNameSnapshot: "Request One",
            createdAt: ts(futureA),
          },
        },
        {
          id: "alloc-2",
          data: {
            upcomingShowId: "a",
            printRequestId: "pr-1",
            allocatedQuantity: 3,
            status: "pending",
            designId: "d1",
            sourceType: "catalog_design",
            requestNameSnapshot: "Request One",
            createdAt: ts(futureA + 1),
          },
        },
        {
          id: "alloc-3",
          data: {
            upcomingShowId: "a",
            printRequestId: "pr-2",
            allocatedQuantity: 2,
            status: "canceled",
            designId: "d2",
            sourceType: "catalog_design",
            requestNameSnapshot: "History",
            createdAt: ts(futureA + 2),
          },
        },
      ],
      requests: new Map([
        ["pr-1", { name: "Request One", isInternal: false, customerUsernameSnapshot: "buyer" }],
      ]),
    });

    assert.deepEqual(
      response.shows.map((show) => show.showId),
      ["a", "fix", "b"],
    );
    assert.equal(response.selectedShowId, "a");
    assert.equal(response.selected?.designQty, 1);
    assert.equal(response.selected?.printQty, 8);
    assert.equal(response.selected?.prQty, 1);
    assert.equal(response.selected?.capacity.percentUsed, 20);
    assert.equal(response.selected?.requests.length, 1);
    assert.equal(response.selected?.requests[0]?.customerIdentityLabel, "@buyer");
  });

  it("keeps over-capacity percent truthful and excludes fixtures outside DEV", () => {
    const response = buildPortalAdminUpcomingShowQueueDashboard({
      now,
      projectId: "fresh-prints-prod",
      requestedShowId: "show-1",
      shows: [
        {
          id: "show-1",
          data: { title: "Busy", source: "whatnot", scheduledStartAt: ts(futureA), maxTotalQuantity: 10 },
        },
        {
          id: "fix",
          data: { title: "Fixture", source: "dev_fixture", scheduledStartAt: ts(futureA) },
        },
      ],
      selectedShowAllocations: [
        {
          id: "alloc-1",
          data: {
            upcomingShowId: "show-1",
            printRequestId: "pr-1",
            allocatedQuantity: 12,
            status: "queued",
            designId: "d1",
            createdAt: ts(futureA),
          },
        },
      ],
      requests: new Map([["pr-1", { name: "Over", isInternal: true }]]),
    });

    assert.deepEqual(
      response.shows.map((show) => show.showId),
      ["show-1"],
    );
    assert.equal(response.selected?.capacity.isOverCapacity, true);
    assert.equal(response.selected?.capacity.percentUsed, 120);
    assert.match(response.selected?.capacity.usedLabel ?? "", /12 of 10 used/);
  });
});
