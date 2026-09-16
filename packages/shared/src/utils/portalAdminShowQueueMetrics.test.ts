import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countPortalAdminDesignQty,
  countPortalAdminPrQty,
  resolvePortalAdminDesignIdentity,
  sumPortalAdminPrintQty,
} from "./portalAdminShowQueueMetrics";

describe("portalAdminShowQueueMetrics", () => {
  it("counts distinct designs and ignores canceled / split duplicates", () => {
    const allocations = [
      {
        allocationId: "a1",
        status: "queued",
        allocatedQuantity: 2,
        printRequestId: "pr1",
        designId: "d1",
        sourceType: "catalog_design",
      },
      {
        allocationId: "a2",
        status: "pending",
        allocatedQuantity: 3,
        printRequestId: "pr1",
        designId: "d1",
        sourceType: "catalog_design",
      },
      {
        allocationId: "a3",
        status: "canceled",
        allocatedQuantity: 9,
        printRequestId: "pr1",
        designId: "d2",
        sourceType: "catalog_design",
      },
      {
        allocationId: "a4",
        status: "queued",
        allocatedQuantity: 1,
        printRequestId: "pr2",
        customerUploadId: "u1",
        sourceType: "customer_upload",
      },
    ];
    assert.equal(countPortalAdminDesignQty(allocations), 2);
    assert.equal(sumPortalAdminPrintQty(allocations), 6);
    assert.equal(countPortalAdminPrQty(allocations), 2);
    assert.equal(resolvePortalAdminDesignIdentity(allocations[0]!), "design:d1");
    assert.equal(resolvePortalAdminDesignIdentity(allocations[3]!), "upload:u1");
  });

  it("excludes canceled-only print requests from PR qty", () => {
    const allocations = [
      {
        allocationId: "a1",
        status: "canceled",
        allocatedQuantity: 4,
        printRequestId: "pr-hist",
        designId: "d1",
      },
      {
        allocationId: "a2",
        status: "printed",
        allocatedQuantity: 2,
        printRequestId: "pr-live",
        designId: "d2",
      },
    ];
    assert.equal(countPortalAdminPrQty(allocations), 1);
    assert.equal(sumPortalAdminPrintQty(allocations), 2);
    assert.equal(countPortalAdminDesignQty(allocations), 1);
  });

  it("counts Staff Artwork and keeps source namespaces distinct", () => {
    const allocations = [
      {
        allocationId: "a1",
        printRequestItemId: "item-1",
        status: "queued",
        allocatedQuantity: 1,
        printRequestId: "pr1",
        sourceType: "staff_artwork",
        staffArtworkId: "same",
      },
      {
        allocationId: "a2",
        printRequestItemId: "item-2",
        status: "queued",
        allocatedQuantity: 1,
        printRequestId: "pr1",
        sourceType: "catalog_design",
        designId: "same",
      },
    ];

    assert.equal(countPortalAdminDesignQty(allocations), 2);
    assert.equal(resolvePortalAdminDesignIdentity(allocations[0]!), "staff-artwork:same");
    assert.equal(resolvePortalAdminDesignIdentity(allocations[1]!), "design:same");
  });
});
