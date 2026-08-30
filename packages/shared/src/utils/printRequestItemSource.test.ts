import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isCatalogDesignPrintRequestItem,
  isCustomerUploadPrintRequestItem,
  resolvePrintRequestItemSourcePill,
  resolvePrintRequestItemSourceType,
  shouldIncrementDesignRequestCount,
} from "./printRequestItemSource";

describe("printRequestItemSource", () => {
  it("defaults missing sourceType to catalog_design", () => {
    assert.equal(
      resolvePrintRequestItemSourceType({ designId: "d1" }),
      "catalog_design",
    );
    assert.equal(isCatalogDesignPrintRequestItem({ designId: "d1" }), true);
  });

  it("recognizes customer_upload sourceType", () => {
    const item = {
      designId: "",
      sourceType: "customer_upload" as const,
      customerUploadId: "u1",
    };
    assert.equal(resolvePrintRequestItemSourceType(item), "customer_upload");
    assert.equal(isCustomerUploadPrintRequestItem(item), true);
    assert.equal(shouldIncrementDesignRequestCount(item), false);
  });

  it("keeps customer_upload identity for duplicate-style copies", () => {
    const source = {
      sourceType: "customer_upload" as const,
      customerUploadId: "upload-1",
    };
    assert.equal(resolvePrintRequestItemSourceType(source), "customer_upload");
    assert.equal(isCustomerUploadPrintRequestItem(source), true);
    assert.equal(shouldIncrementDesignRequestCount(source), false);
  });

  it("keeps catalog identity when designId is present", () => {
    const source = {
      designId: "design-1",
      sourceType: "catalog_design" as const,
    };
    assert.equal(resolvePrintRequestItemSourceType(source), "catalog_design");
    assert.equal(isCatalogDesignPrintRequestItem(source), true);
    assert.equal(shouldIncrementDesignRequestCount(source), true);
  });

  it("resolves source pills for library, upload, and custom assisted flows", () => {
    assert.deepEqual(
      resolvePrintRequestItemSourcePill({
        item: { designId: "d1", sourceType: "catalog_design" },
      }),
      { label: "Library", variant: "library" },
    );
    assert.deepEqual(
      resolvePrintRequestItemSourcePill({
        item: { sourceType: "customer_upload", customerUploadId: "u1" },
      }),
      { label: "Uploaded", variant: "uploaded" },
    );
    assert.deepEqual(
      resolvePrintRequestItemSourcePill({
        item: { sourceType: "customer_upload", customerUploadId: "u1" },
        fromAssistedCreation: true,
      }),
      { label: "Custom", variant: "custom" },
    );
  });
});
