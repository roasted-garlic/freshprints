import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequestItem } from "../../../../../../shared/types/printRequest/printRequest.types";
import {
  buildCustomerListQueryPlan,
  buildPrintRequestItemSummaries,
  buildPrintRequestItemsQueryPlan,
  buildPrintRequestListQueryPlan,
  sortPrintRequestItemsForDisplay,
} from "./printRequestQueryPlanning";

function buildItem(
  input: Pick<PrintRequestItem, "id" | "printRequestId" | "designId" | "quantity"> & {
    createdAtMillis?: number;
    sortOrder?: number;
  },
): PrintRequestItem {
  const createdAtMillis = input.createdAtMillis ?? 1;

  return {
    id: input.id,
    printRequestId: input.printRequestId,
    designId: input.designId,
    quantity: input.quantity,
    sortOrder: input.sortOrder,
    status: "pending",
    addedBy: "staff-1",
    createdAt: { toMillis: () => createdAtMillis, toDate: () => new Date(createdAtMillis) } as PrintRequestItem["createdAt"],
    updatedAt: { toMillis: () => 1, toDate: () => new Date(1) } as PrintRequestItem["updatedAt"],
  };
}

describe("print request query planning", () => {
  it("orders default request reads by updatedAt descending", () => {
    assert.deepEqual(buildPrintRequestListQueryPlan(), {
      filters: [],
      orderBy: [{ field: "updatedAt", direction: "desc" }],
    });
  });

  it("plans supported single request filters with updatedAt ordering", () => {
    assert.deepEqual(buildPrintRequestListQueryPlan({ status: "active" }).filters, [
      { field: "status", operator: "==", value: "active" },
    ]);
    assert.deepEqual(buildPrintRequestListQueryPlan({ customerId: "customer-1" }).filters, [
      { field: "customerId", operator: "==", value: "customer-1" },
    ]);
    assert.deepEqual(buildPrintRequestListQueryPlan({ isInternal: true }).filters, [
      { field: "isInternal", operator: "==", value: true },
    ]);
  });

  it("rejects unindexed request filter combinations", () => {
    assert.throws(
      () => buildPrintRequestListQueryPlan({ status: "active", customerId: "customer-1" }),
      /Only one print request list filter/,
    );
  });

  it("plans request-scoped item reads with optional status", () => {
    assert.deepEqual(buildPrintRequestItemsQueryPlan("request-1", { status: "printed" }), {
      filters: [
        { field: "printRequestId", operator: "==", value: "request-1" },
        { field: "status", operator: "==", value: "printed" },
      ],
      orderBy: [],
    });
  });

  it("requires a request ID for item reads", () => {
    assert.throws(() => buildPrintRequestItemsQueryPlan(" "), /print request ID is required/);
  });

  it("plans ordered customer reads and optional guest filtering", () => {
    assert.deepEqual(buildCustomerListQueryPlan({ isGuest: false }), {
      filters: [{ field: "isGuest", operator: "==", value: false }],
      orderBy: [{ field: "displayName", direction: "asc" }],
    });
  });
});

describe("print request item summaries", () => {
  it("aggregates total quantity and unique design count per request", () => {
    const summaries = buildPrintRequestItemSummaries([
      buildItem({ id: "item-1", printRequestId: "request-1", designId: "design-1", quantity: 2 }),
      buildItem({ id: "item-2", printRequestId: "request-1", designId: "design-1", quantity: 3 }),
      buildItem({ id: "item-3", printRequestId: "request-1", designId: "design-2", quantity: 4 }),
      buildItem({ id: "item-4", printRequestId: "request-2", designId: "design-3", quantity: 1 }),
    ]);

    assert.deepEqual(summaries, {
      "request-1": { totalQuantity: 9, uniqueDesignCount: 2 },
      "request-2": { totalQuantity: 1, uniqueDesignCount: 1 },
    });
  });
});

describe("print request item display ordering", () => {
  it("sorts by sortOrder, then createdAt, then document ID without hiding legacy items", () => {
    const items = [
      buildItem({ id: "legacy-b", printRequestId: "request-1", designId: "design-1", quantity: 1, createdAtMillis: 20 }),
      buildItem({ id: "ordered-2", printRequestId: "request-1", designId: "design-2", quantity: 1, sortOrder: 2, createdAtMillis: 30 }),
      buildItem({ id: "legacy-a", printRequestId: "request-1", designId: "design-3", quantity: 1, createdAtMillis: 20 }),
      buildItem({ id: "ordered-1", printRequestId: "request-1", designId: "design-4", quantity: 1, sortOrder: 1, createdAtMillis: 40 }),
    ];

    assert.deepEqual(
      sortPrintRequestItemsForDisplay(items).map((item) => item.id),
      ["ordered-1", "ordered-2", "legacy-a", "legacy-b"],
    );
  });
});
