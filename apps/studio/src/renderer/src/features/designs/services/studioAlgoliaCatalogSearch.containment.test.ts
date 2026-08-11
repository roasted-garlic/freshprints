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
    assert.doesNotMatch(flags, /ALGOLIA_ADMIN|adminApiKey|ADMIN_API_KEY/);
    assert.doesNotMatch(service, /ALGOLIA_ADMIN|adminApiKey|ADMIN_API_KEY|setSettings/);
    assert.match(service, /withPortalCatalogAlgoliaExactTokenSearchParams/);
    assert.match(service, /getDesignsByIds/);
  });

  it("Design Library managed search fails closed without loadAll or snapshots", () => {
    const page = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );
    const hook = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useDesignLibraryManagedSearch.ts",
    );
    assert.match(page, /useDesignLibraryManagedSearch/);
    assert.match(page, /countDesigns/);
    assert.doesNotMatch(page, /loadAll:\s*true/);
    assert.doesNotMatch(page, /useGeneratedReadyDesigns/);
    assert.doesNotMatch(hook, /loadAll:\s*true/);
    assert.doesNotMatch(hook, /onSnapshot/);
    assert.match(hook, /isStudioAlgoliaCatalogConfigured/);
    assert.match(hook, /Catalog search is not configured/);
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
