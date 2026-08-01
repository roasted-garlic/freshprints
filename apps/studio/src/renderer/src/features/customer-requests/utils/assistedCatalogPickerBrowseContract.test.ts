import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("Assisted catalog picker browse contract (Wave C regression)", () => {
  it("failing-before documented: ID-less useReadyDesignsForSelection returns empty without loading", () => {
    const hook = read(
      "apps/studio/src/renderer/src/features/print-requests/hooks/useReadyDesignsForSelection.ts",
    );
    assert.match(hook, /requestedDesignIds\.length === 0/);
    assert.match(hook, /designs:\s*\[\],\s*error:\s*null,\s*isLoading:\s*false/);
    assert.doesNotMatch(hook, /listReadyDesigns/);
  });

  it("passing-after: picker uses assisted browse hook, not ID-less selection hook", () => {
    const modal = read(
      "apps/studio/src/renderer/src/features/customer-requests/components/AssistedCatalogDesignPickerModal.tsx",
    );
    assert.match(modal, /useReadyDesignsForAssistedCatalogPicker/);
    assert.doesNotMatch(modal, /useReadyDesignsForSelection/);
  });

  it("assisted browse hook uses generated ready-index, not Print Request ID-only hook", () => {
    const hook = read(
      "apps/studio/src/renderer/src/features/customer-requests/hooks/useReadyDesignsForAssistedCatalogPicker.ts",
    );
    assert.match(hook, /useGeneratedReadyDesigns/);
    assert.match(hook, /entryToFilterableDesign|fallbackDesigns/);
    assert.doesNotMatch(hook, /import\s+\{[^}]*useReadyDesignsForSelection/);
    assert.doesNotMatch(hook, /useReadyDesignsForSelection\s*\(/);
    assert.doesNotMatch(hook, /listReadyDesigns/);
  });

  it("keeps Print Request selected-ID containment unchanged", () => {
    const page = read(
      "apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx",
    );
    const hook = read(
      "apps/studio/src/renderer/src/features/print-requests/hooks/useReadyDesignsForSelection.ts",
    );
    assert.match(page, /useReadyDesignsForSelection\(selectedDesignIds\)/);
    assert.match(hook, /designService\.getDesignById/);
    assert.doesNotMatch(hook, /listReadyDesigns/);
  });
});
