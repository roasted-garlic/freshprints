import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Wave C read containment wiring", () => {
  it("removes Portal full-catalog hydration and bounds generated result pages", () => {
    const hook = read("apps/portal/features/catalog/hooks/useCatalogDesigns.ts");
    const service = read("apps/portal/features/catalog/services/catalogService.ts");
    const assets = read(
      "apps/portal/features/catalog/services/portalCatalogAssetService.ts",
    );
    assert.match(hook, /portalCatalogAssetService\.listMatchingDesigns/);
    assert.doesNotMatch(hook, /listAllMatchingReadyDesigns/);
    assert.doesNotMatch(service, /listAllMatchingReadyDesigns/);
    assert.match(assets, /Math\.min\(40,/);
    assert.match(assets, /MAX_CACHE_BYTES = 16 \* 1024 \* 1024/);
  });

  it("routes AI taxonomy through one snapshot loader instead of direct per-resource queries", () => {
    const runtime = read("functions/src/ai/aiEnrichmentRuntimeCache.ts");
    const loader = read("functions/src/ai/loadAiCatalogReferenceSnapshot.ts");
    assert.doesNotMatch(runtime, /adminDb\.collection\("categories"\)/);
    assert.doesNotMatch(runtime, /adminDb\.collection\("tags"\)/);
    assert.match(runtime, /loadAiCatalogReferenceSnapshot/);
    assert.match(loader, /taxonomyInFlight/);
    assert.match(loader, /AI_TAXONOMY_CACHE_TTL_MS/);
    assert.match(loader, /Promise\.all/);
    assert.doesNotMatch(runtime, /categoriesCache/);
    assert.doesNotMatch(runtime, /tagsCache/);
  });

  it("writes immutable assets before generation-matched manifests and retains rollback versions", () => {
    const publisher = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    assert.match(publisher, /previousContentVersion/);
    assert.match(publisher, /preconditionOpts: \{ ifGenerationMatch \}/);
    assert.match(publisher, /snapshot-asset-metadata-verification-failed/);
    assert.match(publisher, /for \(let pass = 0; pass < passLimit; pass \+= 1\)/);
  });

  it("keeps private/public snapshot paths separated by Storage rules", () => {
    const rules = read("storage.rules");
    assert.match(
      rules,
      /match \/generated\/catalog-reference\/ai\/\{fileName\} \{\s*allow read, write: if false;/,
    );
    assert.match(
      rules,
      /match \/generated\/catalog-reference\/client\/\{fileName\} \{\s*allow read: if true;\s*allow write: if false;/,
    );
    assert.match(
      rules,
      /match \/generated\/portal-catalog\/\{allPaths=\*\*\} \{\s*allow read: if true;\s*allow write: if false;/,
    );
  });
});
