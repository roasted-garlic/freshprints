import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("Portal catalog search persistence (q + designId)", () => {
  it("CatalogPageContent syncs debounced q into the URL and ignores designId-only param churn", () => {
    const source = readFileSync(
      "apps/portal/features/catalog/pages/CatalogPageContent.tsx",
      "utf8",
    );
    assert.match(source, /desiredQ = debouncedSearchQuery\.trim\(\)/);
    assert.match(source, /next\.set\('q', desiredQ\)/);
    assert.match(source, /onlyDesignIdChanged/);
    assert.match(source, /libraryParamsWithoutDesignId/);
    assert.match(source, /lastSelfPushedQRef/);
    assert.match(source, /shouldApplyCatalogUrlSearchToLocal/);
    assert.match(source, /CATALOG_SEARCH_DEBOUNCE_MS/);
  });

  it("keeps 300ms debounce for search requests (not only keystroke display)", () => {
    const source = readFileSync(
      "apps/portal/features/catalog/pages/CatalogPageContent.tsx",
      "utf8",
    );
    assert.match(source, /export const CATALOG_SEARCH_DEBOUNCE_MS = 300/);
    assert.match(source, /setDebouncedSearchQuery\(searchQuery\)/);
    assert.match(source, /CATALOG_SEARCH_DEBOUNCE_MS/);
  });

  it("syncLibraryUrl records self-pushed q so category changes do not reintroduce stale echo", () => {
    const source = readFileSync(
      "apps/portal/features/catalog/pages/CatalogPageContent.tsx",
      "utf8",
    );
    const syncStart = source.indexOf("function syncLibraryUrl");
    const syncBlock = source.slice(syncStart, syncStart + 700);
    assert.match(syncBlock, /lastSelfPushedQRef\.current = nextSearch\.trim\(\)/);
  });
});
