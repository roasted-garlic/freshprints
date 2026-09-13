import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("Studio Algolia catalog search containment", () => {
  it("uses search-only env vars and never admin keys", () => {
    const flags = read(
      "apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogFlags.ts",
    );
    const service = read(
      "apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearchService.ts",
    );
    assert.match(flags, /VITE_ALGOLIA_SEARCH_API_KEY/);
    assert.match(flags, /VITE_ALGOLIA_APP_ID/);
    assert.match(flags, /VITE_ALGOLIA_INDEX_NAME/);
    assert.match(flags, /VITE_USE_SMART_FILTERS/);
    assert.match(flags, /studioSmartFiltersEnabled/);
    assert.doesNotMatch(flags, /ALGOLIA_ADMIN|adminApiKey|ADMIN_API_KEY/);
    assert.doesNotMatch(service, /ALGOLIA_ADMIN|adminApiKey|ADMIN_API_KEY|setSettings/);
    assert.match(service, /withPortalCatalogAlgoliaExactTokenSearchParams/);
    assert.match(service, /getDesignsByIds/);
    assert.match(service, /filterDesignsForLibraryScope/);
    assert.match(service, /smartFilters/);
    assert.match(service, /listNarrowedSmartFacets/);
    assert.match(service, /listNarrowedCategoryFacets/);
    assert.match(service, /buildStudioAlgoliaCategoryFacetSearchParams/);
  });

  it("Design Library managed search fails closed without loadAll or snapshots", () => {
    const page = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );
    const hook = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useDesignLibraryManagedSearch.ts",
    );
    const exactId = read(
      "apps/studio/src/renderer/src/features/designs/utils/designLibraryExactIdSearch.ts",
    );
    assert.match(page, /useDesignLibraryManagedSearch/);
    assert.match(page, /countDesigns/);
    assert.match(page, /fetchVisibleExactIdDesign/);
    assert.doesNotMatch(page, /loadAll:\s*true/);
    assert.doesNotMatch(page, /useGeneratedReadyDesigns/);
    assert.doesNotMatch(hook, /loadAll:\s*true/);
    assert.doesNotMatch(hook, /onSnapshot/);
    assert.match(hook, /isStudioAlgoliaCatalogConfigured/);
    assert.match(hook, /deriveManagedCatalogHasMore/);
    assert.match(hook, /Catalog search is not configured/);
    assert.match(hook, /Do \*\*not\*\* re-apply title\/tag text search on Algolia hits/);
    assert.match(hook, /designMatchesSmartFilters\(design, smartFilters\)/);
    assert.match(hook, /isDesignVisibleInLibraryScope\(design, "ready"\)/);
    assert.match(hook, /countManagedSearchDroppedHits/);
    assert.match(
      read("apps/studio/src/renderer/src/features/designs/utils/countManagedSearchDroppedHits.ts"),
      /export function countManagedSearchDroppedHits/,
    );
    // Algolia hit lists must not be re-filtered by title/tag text search (Smart Profile recall).
    assert.doesNotMatch(
      hook,
      /const algoliaKept = page\.designs\.filter\(\s*\(design\) =>\s*designMatchesSearchQuery/,
    );
    assert.doesNotMatch(
      hook,
      /const filtered = page\.designs\.filter\(\s*\(design\) =>\s*designMatchesSearchQuery/,
    );
    assert.match(exactId, /loadByIds/);
    assert.match(exactId, /isDesignVisibleInLibraryScope/);
    assert.doesNotMatch(exactId, /getDocs\(/);
    assert.doesNotMatch(exactId, /loadAll/);
    assert.doesNotMatch(exactId, /designService/);
  });

  it("managed search drops archived status on patch and adjusts totals via drop helper", () => {
    const hook = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useDesignLibraryManagedSearch.ts",
    );
    assert.match(hook, /stillInReadyScope/);
    assert.match(hook, /isDesignVisibleInLibraryScope\(updated, "ready"\)/);
    assert.match(hook, /countManagedSearchDroppedHits\(page\.hitCount/);
  });

  it("designService exposes ordered getDesignsByIds without collection scan", () => {
    const service = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    assert.match(service, /async getDesignsByIds/);
    const start = service.indexOf("async getDesignsByIds");
    const block = service.slice(start, start + 900);
    assert.match(block, /getDesignById/);
    assert.doesNotMatch(block, /getDocs\(/);
    assert.doesNotMatch(block, /loadAll/);
  });
});
