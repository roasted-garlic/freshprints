import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression coverage for the Studio Design Library newest-first ordering
 * defect (post-launch-catalog-and-processing-stability, Workstream B).
 *
 * The primary generated-index path (studioCatalogReadyOrder in
 * functions/src/catalogSnapshots/snapshotBuilders.ts) already sorted
 * createdAt desc correctly and is covered by snapshotBuilders.test.ts.
 * The defect was in two Firestore-fallback paths that hardcoded
 * "updatedAt" instead: designLibraryFilters.ts's default-sort constant
 * (used whenever DesignLibraryPage falls back to a direct Firestore query)
 * and useGeneratedReadyDesigns.ts's Firestore-fallback query (used when the
 * generated ready-index asset itself is unavailable).
 */
describe("Studio Design Library never orders by updatedAt on any path", () => {
  // Original defect (Amendment 1): the default sort was `updatedAt`, so unrelated metadata edits
  // reshuffled the library. Amendment 3 then moved normal browse from `createdAt` to `readyAt`
  // (most recent ready transition). The invariant this test protects is unchanged: never
  // `updatedAt`.
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

  it("useGeneratedReadyDesigns.ts's Firestore fallback query sorts by createdAt, not updatedAt", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts",
    );

    const fallbackBlock = source.slice(
      source.indexOf("loadFirestoreFallback: user"),
      source.indexOf("shouldActivateFallback:"),
    );

    assert.match(fallbackBlock, /sortField:\s*"createdAt"/);
    assert.match(fallbackBlock, /sortDesignsForListQuery\(page\.designs, "createdAt", "desc"\)/);
    assert.doesNotMatch(fallbackBlock, /"updatedAt"/);
  });

  it("does not touch metric-collection ordering constants or utilities", () => {
    // Popular / Most Liked / Recently Requested live entirely outside
    // designLibraryFilters.ts / useGeneratedReadyDesigns.ts (Portal
    // discover ranking + Studio AI Review inbox are separate modules) — a
    // narrow grep across the two changed files must not mention any metric
    // field this fix must not touch.
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
