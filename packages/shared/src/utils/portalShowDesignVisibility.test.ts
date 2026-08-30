import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isCatalogDesignShowAllocation,
  isCustomerUploadShowAllocation,
} from "./portalShowDesignVisibility";

describe("portalShowDesignVisibility", () => {
  it("classifies catalog vs customer-upload allocations", () => {
    assert.equal(
      isCatalogDesignShowAllocation({ sourceType: "catalog_design", designId: "design-1" }),
      true,
    );
    assert.equal(
      isCustomerUploadShowAllocation({
        sourceType: "customer_upload",
        customerUploadId: "upload-1",
      }),
      true,
    );
    assert.equal(
      isCatalogDesignShowAllocation({
        sourceType: "customer_upload",
        customerUploadId: "upload-1",
        designId: "design-1",
      }),
      false,
    );
  });
});
