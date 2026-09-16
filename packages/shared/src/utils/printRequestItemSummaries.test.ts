import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPrintRequestItemSummaries } from "./printRequestItemSummaries";

function item(input: {
  id: string;
  printRequestId?: string;
  sourceType?: "catalog_design" | "customer_upload" | "staff_artwork";
  designId?: string;
  customerUploadId?: string;
  staffArtworkId?: string;
  quantity: number;
}) {
  return {
    printRequestId: input.printRequestId ?? "request-1",
    id: input.id,
    sourceType: input.sourceType,
    designId: input.designId,
    customerUploadId: input.customerUploadId,
    staffArtworkId: input.staffArtworkId,
    quantity: input.quantity,
  };
}

describe("printRequestItemSummaries", () => {
  it("counts two designs and sums 19 + 6 items to 25", () => {
    const summary = buildPrintRequestItemSummaries([
      item({ id: "full", designId: "full-design", quantity: 19 }),
      item({ id: "oversize", designId: "oversize-design", quantity: 6 }),
    ])["request-1"];

    assert.equal(summary?.uniqueDesignCount, 2);
    assert.equal(summary?.totalQuantity, 25);
  });

  it("deduplicates same artwork rows while summing quantities", () => {
    const summary = buildPrintRequestItemSummaries([
      item({ id: "catalog-size-1", designId: "design-1", quantity: 19 }),
      item({ id: "catalog-size-2", designId: "design-1", quantity: 6 }),
    ])["request-1"];

    assert.deepEqual(summary, { totalQuantity: 25, uniqueDesignCount: 1, sizeClassRows: [] });
  });

  it("reproduces the production-shaped 19 Designs / 25 Items request", () => {
    const items = [
      ...Array.from({ length: 5 }, (_, index) =>
        item({ id: `catalog-${index}`, designId: `design-${index}`, quantity: 1 }),
      ),
      ...Array.from({ length: 13 }, (_, index) =>
        item({
          id: `upload-${index}`,
          sourceType: "customer_upload",
          customerUploadId: `upload-${index}`,
          quantity: index === 0 ? 4 : 1,
        }),
      ),
      item({
        id: "upload-duplicate-a",
        sourceType: "customer_upload",
        customerUploadId: "upload-duplicate",
        quantity: 3,
      }),
      item({
        id: "upload-duplicate-b",
        sourceType: "customer_upload",
        customerUploadId: "upload-duplicate",
        quantity: 1,
      }),
    ];

    const summary = buildPrintRequestItemSummaries(items)["request-1"];
    assert.equal(items.length, 20);
    assert.equal(summary?.uniqueDesignCount, 19);
    assert.equal(summary?.totalQuantity, 25);
  });

  it("does not collide equal raw IDs across catalog, upload, and Staff Artwork", () => {
    const summary = buildPrintRequestItemSummaries([
      item({ id: "catalog", designId: "same", quantity: 1 }),
      item({
        id: "upload",
        sourceType: "customer_upload",
        customerUploadId: "same",
        quantity: 2,
      }),
      item({
        id: "staff",
        sourceType: "staff_artwork",
        staffArtworkId: "same",
        quantity: 3,
      }),
    ])["request-1"];

    assert.deepEqual(summary, { totalQuantity: 6, uniqueDesignCount: 3, sizeClassRows: [] });
  });

  it("keeps item status separate from full-request contents", () => {
    const summary = buildPrintRequestItemSummaries([
      {
        id: "item-canceled-status",
        printRequestId: "request-1",
        designId: "design-1",
        status: "canceled",
        quantity: 2,
        printWidthInches: 10,
      },
    ])["request-1"];

    assert.deepEqual(summary, {
      uniqueDesignCount: 1,
      totalQuantity: 2,
      sizeClassRows: [{ printWidthInches: 10, quantity: 2 }],
    });
  });
});
