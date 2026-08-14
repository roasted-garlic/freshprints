import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Design Library archive purge / restore local reconciliation", () => {
  it("purge success uses removeDesignFromList and does not refreshCatalog on happy path", () => {
    const library = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.match(library, /const handlePurgeConfirm = useCallback\([\s\S]*?removeDesignFromList\(entry\.designId\)/);
    assert.match(
      library,
      /entry\.status === "purged" \|\| entry\.status === "skipped_already_purged"/,
    );
    // Happy-path purge must not re-fetch into the 15s page cache.
    assert.doesNotMatch(
      library,
      /const handlePurgeConfirm = useCallback\([\s\S]*?await refreshCatalog\(\);[\s\S]*?showSuccessMessage\(parts\.join/,
    );
  });

  it("restore success removes from local list and surfaces errors", () => {
    const library = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.match(library, /const handleRestoreDesign = useCallback\([\s\S]*?removeDesignFromList\(design\.id\)/);
    assert.match(library, /setActionError\(message\)/);
    assert.match(library, /error: restoreError/);
    assert.doesNotMatch(
      library,
      /const handleRestoreDesign = useCallback\([\s\S]*?await refreshCatalog\(\);[\s\S]*?showSuccessMessage\(`\$\{design\.title\} restored/,
    );
  });
});

describe("Design Library Needs Companion Load More (Firestore path)", () => {
  it("wires companionSetIncomplete into the Firestore list query", () => {
    const library = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );
    assert.match(library, /companionSetIncomplete:/);
    assert.match(library, /needsCompanionFilter \? true/);
  });

  it("applies companionSetIncomplete equality in designService filter constraints", () => {
    const service = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    assert.match(
      service,
      /listQuery\.companionSetIncomplete === true[\s\S]*where\("companionSetIncomplete", "==", true\)/,
    );
  });

  it("declares companionSetIncomplete composites for readyAt (primary) and createdAt (fallback)", () => {
    const indexes = read("firestore.indexes.json");
    assert.match(
      indexes,
      /"fieldPath": "status"[\s\S]*"fieldPath": "companionSetIncomplete"[\s\S]*"fieldPath": "readyAt"/,
    );
    assert.match(
      indexes,
      /"fieldPath": "status"[\s\S]*"fieldPath": "companionSetIncomplete"[\s\S]*"fieldPath": "createdAt"/,
    );
  });

  it("Needs Companion list query keeps Design Library readyAt ordering (not a createdAt redesign)", () => {
    const filters = read(
      "apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts",
    );
    assert.match(filters, /DESIGN_LIBRARY_DEFAULT_SORT_FIELD: DesignListSortField = "readyAt"/);
    // companionSetIncomplete does not override sortField away from readyAt for non-archived.
    assert.match(
      filters,
      /sortField: options\.archived\s*\n?\s*\? DESIGN_LIBRARY_ARCHIVED_SORT_FIELD\s*\n?\s*: DESIGN_LIBRARY_DEFAULT_SORT_FIELD/,
    );
  });

  it("designService falls back to createdAt when readyAt index is missing (explains runtime createdAt index request)", () => {
    const service = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    assert.match(
      service,
      /listQuery\.sortField === "readyAt" && isFirestoreIndexError\(error\)[\s\S]*sortField: "createdAt"/,
    );
  });

  it("Load More visibility follows catalogHasMore (authoritative pagination), not filtered length", () => {
    const library = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );
    assert.match(library, /const catalogHasMore = managedSearchActive \? managedSearchHasMore : hasMore/);
    assert.match(library, /\{catalogHasMore \? \(/);
    assert.doesNotMatch(library, /filteredDesigns\.length\s*[<>=].*Load more/i);
  });

  it("includes companionSetIncomplete in useDesigns query identity and designService cache key", () => {
    const identity = read(
      "apps/studio/src/renderer/src/features/designs/utils/designListQueryIdentity.ts",
    );
    const hook = read("apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts");
    const service = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    assert.match(identity, /companionSetIncomplete: listQuery\.companionSetIncomplete === true/);
    assert.match(hook, /serializeDesignListQueryKey/);
    assert.match(service, /getDesignListQueryCacheKey/);
  });
});
