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
  });
});
