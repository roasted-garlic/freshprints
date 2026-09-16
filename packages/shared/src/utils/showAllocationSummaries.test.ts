import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildProductionShapedShowAllocations,
  buildProductionShapedPrintRequestItems,
} from "./printRequestCountParity.fixture";
import {
  buildShowAllocationOperationalSummary,
  resolveShowAllocationDesignIdentity,
} from "./showAllocationSummaries";

describe("showAllocationSummaries", () => {
  it("reproduces the production-shaped active 19 Designs / 25 Items scope", () => {
    const summary = buildShowAllocationOperationalSummary(buildProductionShapedShowAllocations());

    assert.equal(buildProductionShapedPrintRequestItems().length, 20);
    assert.equal(summary.activeAllocationCount, 20);
    assert.equal(summary.canceledAllocationCount, 14);
    assert.equal(summary.uniqueDesignCount, 19);
    assert.equal(summary.totalQuantity, 25);
    assert.deepEqual(summary.sizeClassRows, [
      ...Array.from({ length: 19 }, () => ({ printWidthInches: 10, quantity: 1 })),
      { printWidthInches: 13, quantity: 6 },
    ]);
  });

  it("keeps canceled-only groups out of current metrics", () => {
    const summary = buildShowAllocationOperationalSummary([
      {
        allocationId: "history-only",
        printRequestItemId: "item-1",
        status: "canceled",
        allocatedQuantity: 12,
        printWidthInches: 10,
      },
    ]);

    assert.deepEqual(summary, {
      uniqueDesignCount: 0,
      totalQuantity: 0,
      activeAllocationCount: 0,
      canceledAllocationCount: 1,
      sizeClassRows: [],
      pricingUnits: [],
    });
  });

  it("handles split/move/requeue history by counting only active destination rows", () => {
    const summary = buildShowAllocationOperationalSummary([
      {
        allocationId: "source-canceled",
        printRequestItemId: "item-1",
        sourceType: "catalog_design",
        designId: "design-1",
        status: "canceled",
        allocatedQuantity: 5,
      },
      {
        allocationId: "destination-active",
        printRequestItemId: "item-1",
        sourceType: "catalog_design",
        designId: "design-1",
        status: "queued",
        allocatedQuantity: 5,
      },
    ]);

    assert.equal(summary.uniqueDesignCount, 1);
    assert.equal(summary.totalQuantity, 5);
    assert.equal(summary.activeAllocationCount, 1);
  });

  it("keeps a split request full-request total separate from each show's active scope", () => {
    const allocations = [
      {
        allocationId: "show-a",
        upcomingShowId: "show-a",
        printRequestId: "request-1",
        printRequestItemId: "item-1",
        sourceType: "catalog_design",
        designId: "design-1",
        status: "queued",
        allocatedQuantity: 3,
      },
      {
        allocationId: "show-b",
        upcomingShowId: "show-b",
        printRequestId: "request-1",
        printRequestItemId: "item-1",
        sourceType: "catalog_design",
        designId: "design-1",
        status: "queued",
        allocatedQuantity: 2,
      },
    ];

    const showASummary = buildShowAllocationOperationalSummary(
      allocations.filter((allocation) => allocation.upcomingShowId === "show-a"),
    );
    const showBSummary = buildShowAllocationOperationalSummary(
      allocations.filter((allocation) => allocation.upcomingShowId === "show-b"),
    );

    assert.equal(showASummary.uniqueDesignCount, 1);
    assert.equal(showASummary.totalQuantity, 3);
    assert.equal(showBSummary.uniqueDesignCount, 1);
    assert.equal(showBSummary.totalQuantity, 2);
  });

  it("does not collide equal raw IDs across source namespaces", () => {
    const base = {
      allocationId: "a",
      printRequestItemId: "item-a",
      status: "queued",
      allocatedQuantity: 1,
    } as const;
    assert.notEqual(
      resolveShowAllocationDesignIdentity({ ...base, sourceType: "catalog_design", designId: "same" }),
      resolveShowAllocationDesignIdentity({
        ...base,
        allocationId: "b",
        sourceType: "customer_upload",
        customerUploadId: "same",
      }),
    );
    assert.notEqual(
      resolveShowAllocationDesignIdentity({ ...base, sourceType: "staff_artwork", staffArtworkId: "same" }),
      resolveShowAllocationDesignIdentity({
        ...base,
        allocationId: "c",
        sourceType: "customer_upload",
        customerUploadId: "same",
      }),
    );
  });

  it("keeps malformed active rows deterministic and non-colliding", () => {
    const summary = buildShowAllocationOperationalSummary([
      { status: "queued", allocatedQuantity: 1 },
      { status: "queued", allocatedQuantity: 1 },
    ]);

    assert.equal(summary.uniqueDesignCount, 2);
    assert.equal(summary.totalQuantity, 2);
  });
});
