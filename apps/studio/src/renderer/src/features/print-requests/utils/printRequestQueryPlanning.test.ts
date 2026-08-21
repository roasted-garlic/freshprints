import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase/firestore";

import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import {
  buildCustomerListQueryPlan,
  buildPrintRequestItemSummaries,
  buildPrintRequestItemsQueryPlan,
  buildPrintRequestListQueryPlan,
  sortPrintRequestItemsForDisplay,
} from "./printRequestQueryPlanning";

function buildItem(
  input: Pick<
    PrintRequestItem,
    "id" | "printRequestId" | "designId" | "customerUploadId" | "sourceType" | "quantity"
  > & {
    createdAtMillis?: number;
    sortOrder?: number;
  },
): PrintRequestItem {
  const createdAtMillis = input.createdAtMillis ?? 1;

  return {
    id: input.id,
    printRequestId: input.printRequestId,
    designId: input.designId,
    customerUploadId: input.customerUploadId,
    sourceType: input.sourceType,
    quantity: input.quantity,
    sortOrder: input.sortOrder,
    status: "pending",
    addedBy: "staff-1",
    createdAt: Timestamp.fromMillis(createdAtMillis),
    updatedAt: Timestamp.fromMillis(1),
  };
}

describe("print request query planning", () => {
  it("orders default request reads by updatedAt descending with a document-id tiebreaker", () => {
    assert.deepEqual(buildPrintRequestListQueryPlan(), {
      filters: [],
      orderBy: [
        { field: "updatedAt", direction: "desc" },
        { field: "__name__", direction: "desc" },
      ],
      limitCount: undefined,
      cursor: undefined,
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
    assert.deepEqual(buildPrintRequestListQueryPlan({ queueTab: "working" }).filters, [
      { field: "queueTab", operator: "==", value: "working" },
    ]);
  });

  it("plans the indexed isInternal + queueTab pair used by Studio Customer/Internal lists", () => {
    assert.deepEqual(
      buildPrintRequestListQueryPlan({ isInternal: false, queueTab: "working" }).filters,
      [
        { field: "isInternal", operator: "==", value: false },
        { field: "queueTab", operator: "==", value: "working" },
      ],
    );
    assert.deepEqual(
      buildPrintRequestListQueryPlan({ isInternal: true, queueTab: "queued" }).filters,
      [
        { field: "isInternal", operator: "==", value: true },
        { field: "queueTab", operator: "==", value: "queued" },
      ],
    );
  });

  it("rejects unindexed request filter combinations", () => {
    assert.throws(
      () => buildPrintRequestListQueryPlan({ status: "active", customerId: "customer-1" }),
      /Only one print request list filter/,
    );
    assert.throws(
      () => buildPrintRequestListQueryPlan({ queueTab: "working", customerId: "customer-1" }),
      /Only one print request list filter/,
    );
    assert.throws(
      () => buildPrintRequestListQueryPlan({ isInternal: true, status: "active" }),
      /Only one print request list filter/,
    );
  });

  it("passes through limitCount and cursor unchanged for pagination", () => {
    const cursor = { requestId: "request-9", updatedAtMillis: 12345 };
    const plan = buildPrintRequestListQueryPlan({ queueTab: "queued", limitCount: 51, cursor });
    assert.equal(plan.limitCount, 51);
    assert.deepEqual(plan.cursor, cursor);
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

  it("uses non-colliding stable identities for catalog, upload, and malformed legacy items", () => {
    const summaries = buildPrintRequestItemSummaries([
      buildItem({ id: "catalog-1", printRequestId: "request-1", designId: "same", quantity: 1 }),
      buildItem({
        id: "upload-1",
        printRequestId: "request-1",
        customerUploadId: "same",
        sourceType: "customer_upload",
        quantity: 2,
      }),
      buildItem({
        id: "upload-duplicate",
        printRequestId: "request-1",
        customerUploadId: "same",
        sourceType: "customer_upload",
        quantity: 3,
      }),
      buildItem({ id: "legacy-missing", printRequestId: "request-1", quantity: 4 }),
    ]);

    assert.deepEqual(summaries["request-1"], {
      totalQuantity: 10,
      uniqueDesignCount: 3,
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
