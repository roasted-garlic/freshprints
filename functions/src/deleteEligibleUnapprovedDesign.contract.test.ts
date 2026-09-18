import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("deleteEligibleUnapprovedDesign fail-closed contract", () => {
  const source = read("functions/src/deleteEligibleUnapprovedDesign.ts");
  const lifecycle = read("functions/src/lib/designLifecycle.ts");

  it("is owner-only and exported from functions index", () => {
    assert.match(source, /assertOwnerCaller/);
    assert.match(source, /role !== "owner"/);
    const index = read("functions/src/index.ts");
    assert.match(index, /deleteEligibleUnapprovedDesign/);
  });

  it("deletes original, thumbnail, and preview Storage objects", () => {
    assert.match(lifecycle, /getOriginalStoragePath/);
    assert.match(lifecycle, /getThumbnailStoragePath/);
    assert.match(lifecycle, /getPreviewStoragePath/);
  });

  it("checks print-request, show-allocation, and companion references", () => {
    assert.match(lifecycle, /printRequestItems/);
    assert.match(lifecycle, /showAllocations/);
    assert.match(lifecycle, /companionLinks/);
  });

  it("denies ready and active AI mid-pipeline", () => {
    assert.match(source, /isDeleteEligibleUnapprovedDesignStatus/);
    assert.match(source, /isActiveAiPipelineStage/);
    assert.match(source, /Ready \(catalog-approved\)/);
  });

  it("deletes Firestore design document after Storage cleanup", () => {
    assert.match(source, /await designRef\.delete\(\)/);
  });

  it("keeps the Customer Upload provenance guard while sharing only lifecycle helpers", () => {
    assert.match(source, /sourceCustomerUploadId/);
    assert.match(source, /Design was promoted from a customer upload/);
    assert.match(source, /collectDesignReferenceBlockers\(designId\)/);
    assert.match(source, /deleteDesignStorageAssetsShared/);
  });
});
