import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("Assisted Creation Phase 1A ready-design completeness", () => {
  it("paginates Firestore ready designs to exhaustion without generated ready-index", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts",
    );

    assert.match(source, /loadAllReadyDesignsFromFirestore|listDesignsPage/);
    assert.match(source, /page\.hasMore/);
    assert.match(source, /page\.nextCursor/);
    assert.doesNotMatch(source, /studioCatalogAssetService/);
    assert.doesNotMatch(source, /listReadyIndex/);
    assert.doesNotMatch(source, /loadGeneratedReadyDesignsWithVerifiedFallback/);
  });

  it("Assisted picker still consumes useGeneratedReadyDesigns", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/customer-requests/hooks/useReadyDesignsForAssistedCatalogPicker.ts",
    );
    assert.match(source, /useGeneratedReadyDesigns/);
  });
});
