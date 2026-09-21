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
      customerGroupKeySalt: "response-a",
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
      customerGroupKeySalt: "response-b",
    });

    assert.deepEqual(
      response.shows.map((show) => show.showId),
      ["show-1"],
    );
    assert.equal(response.selected?.capacity.isOverCapacity, true);
    assert.equal(response.selected?.capacity.percentUsed, 120);
    assert.match(response.selected?.capacity.usedLabel ?? "", /12 of 10 used/);
  });

  it("returns response-scoped grouping and separate server pricing totals without raw identity fields", () => {
    const response = buildPortalAdminUpcomingShowQueueDashboard({
      now,
      projectId: "fresh-prints-prod",
      requestedShowId: "show-1",
      shows: [
        { id: "show-1", data: { title: "Pricing", source: "whatnot", scheduledStartAt: ts(futureA) } },
      ],
      selectedShowAllocations: [
        {
          id: "allocation-1",
          data: {
            printRequestId: "pr-1",
            printRequestItemId: "item-1",
            allocatedQuantity: 2,
            status: "queued",
            customerId: "cust-secret",
            createdAt: ts(futureA),
            pricingSnapshot: { unitPriceUsd: 7 },
          },
        },
        {
          id: "allocation-2",
          data: {
            printRequestId: "pr-2",
            printRequestItemId: "item-2",
            allocatedQuantity: 1,
            status: "queued",
            customerId: "cust-secret",
            createdAt: ts(futureA + 1),
          },
        },
      ],
      requests: new Map([
        ["pr-1", { name: "One", isInternal: false, customerId: "cust-secret", customerDisplayNameSnapshot: "Ada Customer" }],
        ["pr-2", { name: "Two", isInternal: false, customerId: "cust-secret", customerDisplayNameSnapshot: "Ada Customer" }],
      ]),
      requestItems: new Map([
        ["pr-1", [{ id: "item-1", data: { quantity: 2, printWidthInches: 3, printHeightInches: 3 } }]],
        ["pr-2", [{ id: "item-2", data: { quantity: 1, printWidthInches: 11, printHeightInches: 18 } }]],
      ]),
      customerGroupKeySalt: "response-c",
    });

    const requests = response.selected?.requests ?? [];
    assert.equal(requests.length, 2);
    const requestOne = requests.find((request) => request.printRequestId === "pr-1");
    const requestTwo = requests.find((request) => request.printRequestId === "pr-2");
    assert.ok(requestOne);
    assert.ok(requestTwo);
    assert.equal(requestOne.customerGroupKey, requestTwo.customerGroupKey);
    assert.equal(requestOne.requestTotalPriceUsd, 2);
    assert.equal(requestOne.selectedShowAllocationTotalPriceUsd, 14);
    assert.equal(requestTwo.requestTotalPriceUsd, 3);
    assert.equal(requestTwo.selectedShowAllocationTotalPriceUsd, 3);
    assert.notEqual(requestOne.customerGroupKey, "cust-secret");
    for (const request of requests) {
      assert.equal("customerId" in request, false);
      assert.equal("email" in request, false);
      assert.equal("username" in request, false);
      assert.doesNotMatch(JSON.stringify(request), /cust-secret/);
    }
  });

  it("groups same identity label when customerId is missing and keeps internals together", () => {
    const response = buildPortalAdminUpcomingShowQueueDashboard({
      now,
      projectId: "fresh-prints-prod",
      requestedShowId: "show-1",
      shows: [
        { id: "show-1", data: { title: "Label groups", source: "whatnot", scheduledStartAt: ts(futureA) } },
      ],
      selectedShowAllocations: [
        {
          id: "allocation-1",
          data: {
            printRequestId: "pr-1",
            printRequestItemId: "item-1",
            allocatedQuantity: 1,
            status: "queued",
            createdAt: ts(futureA),
            pricingSnapshot: { unitPriceUsd: 1 },
          },
        },
        {
          id: "allocation-2",
          data: {
            printRequestId: "pr-2",
            printRequestItemId: "item-2",
            allocatedQuantity: 1,
            status: "queued",
            createdAt: ts(futureA + 1),
            pricingSnapshot: { unitPriceUsd: 1 },
          },
        },
        {
          id: "allocation-3",
          data: {
            printRequestId: "pr-3",
            printRequestItemId: "item-3",
            allocatedQuantity: 1,
            status: "queued",
            createdAt: ts(futureA + 2),
            pricingSnapshot: { unitPriceUsd: 1 },
          },
        },
        {
          id: "allocation-4",
          data: {
            printRequestId: "pr-4",
            printRequestItemId: "item-4",
            allocatedQuantity: 1,
            status: "queued",
            createdAt: ts(futureA + 3),
            pricingSnapshot: { unitPriceUsd: 1 },
          },
        },
      ],
      requests: new Map([
        ["pr-1", { name: "One", isInternal: false, customerDisplayNameSnapshot: "Ada Customer" }],
        ["pr-2", { name: "Two", isInternal: false, customerDisplayNameSnapshot: "Ada Customer" }],
        ["pr-3", { name: "Staff A", isInternal: true }],
        ["pr-4", { name: "Staff B", isInternal: true }],
      ]),
      requestItems: new Map([
        ["pr-1", [{ id: "item-1", data: { quantity: 1, printWidthInches: 3, printHeightInches: 3 } }]],
        ["pr-2", [{ id: "item-2", data: { quantity: 1, printWidthInches: 3, printHeightInches: 3 } }]],
        ["pr-3", [{ id: "item-3", data: { quantity: 1, printWidthInches: 3, printHeightInches: 3 } }]],
        ["pr-4", [{ id: "item-4", data: { quantity: 1, printWidthInches: 3, printHeightInches: 3 } }]],
      ]),
      customerGroupKeySalt: "response-d",
    });

    const requests = response.selected?.requests ?? [];
    const adaKeys = requests
      .filter((request) => request.printRequestId === "pr-1" || request.printRequestId === "pr-2")
      .map((request) => request.customerGroupKey);
    const internalKeys = requests
      .filter((request) => request.printRequestId === "pr-3" || request.printRequestId === "pr-4")
      .map((request) => request.customerGroupKey);
    assert.equal(adaKeys.length, 2);
    assert.equal(adaKeys[0], adaKeys[1]);
    assert.equal(internalKeys.length, 2);
    assert.equal(internalKeys[0], internalKeys[1]);
    assert.notEqual(adaKeys[0], internalKeys[0]);
  });
});
