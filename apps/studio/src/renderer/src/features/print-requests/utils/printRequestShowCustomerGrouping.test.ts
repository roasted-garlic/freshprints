import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import {
  clipAllocationsToShow,
  filterPrintRequestsByShow,
  filterPrintRequestsForShowAndSearch,
  groupPrintRequestsByCustomerWithinShow,
} from "./printRequestShowCustomerGrouping";

function request(overrides: Partial<PrintRequest> = {}): PrintRequest {
  return {
    id: "request-1",
    name: "Request One",
    status: "active",
    requestOrigin: "portal_customer",
    isInternal: false,
    customerId: "customer-1",
    customerUsernameSnapshot: "customer-one",
    customerDisplayNameSnapshot: "Customer One",
    itemCount: 1,
    updatedAt: { toMillis: () => 1 } as PrintRequest["updatedAt"],
    ...overrides,
  } as PrintRequest;
}

function allocation(
  upcomingShowId: string,
  status: "pending" | "queued" | "canceled" = "queued",
): ShowAllocation {
  return {
    id: `${upcomingShowId}-allocation`,
    upcomingShowId,
    printRequestId: "request-1",
    printRequestItemId: "item-1",
    allocatedQuantity: 2,
    status,
  } as ShowAllocation;
}

describe("print request show isolation and customer grouping", () => {
  it("uses active allocation show membership and clips multi-show relationships", () => {
    const first = request({ id: "request-1" });
    const second = request({ id: "request-2", customerId: "customer-2" });
    const allocationsByRequestId = {
      "request-1": [allocation("show-a"), allocation("show-b")],
      "request-2": [allocation("show-a", "canceled")],
    };

    assert.deepEqual(
      filterPrintRequestsByShow({
        requests: [first, second],
        allocationsByRequestId,
        showId: "show-b",
      }).map((item) => item.id),
      ["request-1"],
    );
    assert.deepEqual(
      clipAllocationsToShow({
        requests: [first],
        allocationsByRequestId,
        showId: "show-b",
      })["request-1"].map((item) => item.upcomingShowId),
      ["show-b"],
    );
  });

  it("keeps customer groups separate by show and prefers canonical customer id", () => {
    const first = request({ id: "request-1", customerId: "customer-1" });
    const second = request({ id: "request-2", customerId: "customer-1" });
    const legacy = request({
      id: "request-3",
      customerId: undefined,
      customerUsernameSnapshot: "Legacy User",
    });
    const summaries = {
      "request-1": { totalQuantity: 2 },
      "request-2": { totalQuantity: 3 },
      "request-3": { totalQuantity: 4 },
    };

    const firstShow = groupPrintRequestsByCustomerWithinShow({
      requests: [first, legacy],
      summariesByRequestId: summaries,
      getRequestPriceUsd: (item) => (item.id === "request-3" ? null : 10),
    });
    const secondShow = groupPrintRequestsByCustomerWithinShow({
      requests: [second],
      summariesByRequestId: summaries,
      getRequestPriceUsd: () => 12,
    });

    assert.equal(firstShow[0].key, "customer:customer-1");
    assert.equal(firstShow[0].totalQuantity, 2);
    assert.equal(firstShow[0].totalPriceUsd, 10);
    assert.equal(secondShow[0].key, "customer:customer-1");
    assert.equal(secondShow[0].totalQuantity, 3);
  });

  it("expands customer identity matches within the selected show but keeps request matches narrow", () => {
    const first = request({ id: "request-1", name: "Blue shirt" });
    const second = request({ id: "request-2", name: "Red hat" });
    const allocationsByRequestId = {
      "request-1": [allocation("show-a")],
      "request-2": [allocation("show-a")],
    };
    const customersById = new Map([
      ["customer-1", { id: "customer-1", username: "customer-one", displayName: "Customer One" }],
    ]);

    assert.deepEqual(
      filterPrintRequestsForShowAndSearch({
        requests: [first, second],
        allocationsByRequestId,
        showId: "show-a",
        query: "customer-one",
        customersById,
      }).map((item) => item.id),
      ["request-1", "request-2"],
    );
    assert.deepEqual(
      filterPrintRequestsForShowAndSearch({
        requests: [first, second],
        allocationsByRequestId,
        showId: "show-a",
        query: "blue shirt",
        customersById,
      }).map((item) => item.id),
      ["request-1"],
    );
  });

  it("aggregates quantity and existing per-request prices without duplicating tier logic", () => {
    const first = request({ id: "request-1" });
    const second = request({ id: "request-2" });
    const groups = groupPrintRequestsByCustomerWithinShow({
      requests: [first, second],
      summariesByRequestId: {
        "request-1": { totalQuantity: 2 },
        "request-2": { totalQuantity: 5 },
      },
      getRequestPriceUsd: (item) => (item.id === "request-1" ? 11.5 : 8.25),
    });

    assert.equal(groups[0].totalQuantity, 7);
    assert.equal(groups[0].totalPriceUsd, 19.75);
  });
});
