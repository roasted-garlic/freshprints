import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("deleteEligibleUnapprovedDesign fail-closed contract", () => {
  const source = read("functions/src/deleteEligibleUnapprovedDesign.ts");

  it("is owner-only and exported from functions index", () => {
    assert.match(source, /assertOwnerCaller/);
    assert.match(source, /role !== "owner"/);
    const index = read("functions/src/index.ts");
    assert.match(index, /deleteEligibleUnapprovedDesign/);
  });

  it("deletes original, thumbnail, and preview Storage objects", () => {
    assert.match(source, /getOriginalStoragePath/);
    assert.match(source, /getThumbnailStoragePath/);
    assert.match(source, /getPreviewStoragePath/);
  });

  it("checks print-request, show-allocation, and companion references", () => {
    assert.match(source, /printRequestItems/);
    assert.match(source, /showAllocations/);
    assert.match(source, /companionLinks/);
  });

  it("denies ready and active AI mid-pipeline", () => {
    assert.match(source, /isDeleteEligibleUnapprovedDesignStatus/);
    assert.match(source, /isActiveAiPipelineStage/);
    assert.match(source, /Ready \(catalog-approved\)/);
  });

  it("deletes Firestore design document after Storage cleanup", () => {
    assert.match(source, /await designRef\.delete\(\)/);
  });
});
