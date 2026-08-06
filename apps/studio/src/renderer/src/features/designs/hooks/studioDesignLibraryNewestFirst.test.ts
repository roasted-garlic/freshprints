import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression: Studio Design Library / Assisted ready lists must never order by updatedAt.
 * Phase 1A: useGeneratedReadyDesigns is Firestore pagination (createdAt), not generated index.
 */
describe("Studio Design Library never orders by updatedAt on any path", () => {
  it("designLibraryFilters.ts's default sort constant is readyAt, and never updatedAt", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts",
    );

    assert.match(
      source,
      /export const DESIGN_LIBRARY_DEFAULT_SORT_FIELD: DesignListSortField = "readyAt";/,
    );
    assert.doesNotMatch(
      source,
      /export const DESIGN_LIBRARY_DEFAULT_SORT_FIELD: DesignListSortField = "updatedAt";/,
    );
  });

  it("useGeneratedReadyDesigns.ts Firestore pagination sorts by createdAt, not updatedAt", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts",
    );

    assert.match(source, /sortField:\s*"createdAt"/);
    assert.match(source, /sortDesignsForListQuery\(designs, "createdAt", "desc"\)/);
    assert.doesNotMatch(source, /sortField:\s*"updatedAt"/);
    assert.doesNotMatch(source, /studioCatalogAssetService/);
  });

  it("does not touch metric-collection ordering constants or utilities", () => {
    const filtersSource = read(
      "apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts",
    );
    const hookSource = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts",
    );

    for (const source of [filtersSource, hookSource]) {
      assert.doesNotMatch(source, /requestCount|favoriteCount|lastAddedToShowAt|lastRequestedAt/);
    }
  });
});
