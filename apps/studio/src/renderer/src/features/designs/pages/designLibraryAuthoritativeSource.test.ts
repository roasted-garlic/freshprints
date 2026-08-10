import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Phase 1A / Amendment 1 regression: Design Library design LIST is Firestore-authoritative.
 * Display taxonomy uses Firestore via useGeneratedDesignLibraryTaxonomy (export name preserved).
 */
describe("Design Library design-list source is unconditionally Firestore-authoritative", () => {
  it("DesignLibraryPage no longer imports or renders through useGeneratedReadyDesigns", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.doesNotMatch(source, /useGeneratedReadyDesigns/);
    assert.doesNotMatch(source, /generatedFilterableDesigns/);
    assert.doesNotMatch(source, /usedFirestoreFallback/);
  });

  it("useDesigns (bounded Firestore) is called unconditionally for the design list", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    const useDesignsCallBlock = source.slice(
      source.indexOf("} = useDesigns(listQuery"),
      source.indexOf("} = useDesigns(listQuery") + 120,
    );
    assert.match(useDesignsCallBlock, /firestoreLoadPolicy\.loadReadyDesignPage/);

    assert.doesNotMatch(
      source,
      /const designs = usingGeneratedCatalog\s*\n?\s*\? /,
      "designs must not branch between a generated source and a Firestore source",
    );
  });

  it("getDesignLibraryFirestoreLoadPolicy always loads the ready-design page", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/utils/designLibraryFirestoreLoadPolicy.ts",
    );

    const matches = [...source.matchAll(/loadReadyDesignPage:\s*(true|false)/g)];
    assert.ok(matches.length >= 1, "expected at least one loadReadyDesignPage assignment");
    for (const match of matches) {
      assert.equal(match[1], "true", "every loadReadyDesignPage assignment must be true");
    }
  });

  it("refreshCatalog unconditionally reloads the Firestore design list after any catalog action", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    const refreshCatalogBlock = source.slice(
      source.indexOf("const refreshCatalog = useCallback("),
      source.indexOf("}, [includeArchived, reloadCategories, reloadDesigns, reloadDisplayTaxonomy, reloadTags]);") +
        80,
    );
    assert.match(refreshCatalogBlock, /reloadDesigns\(\)/);
    assert.match(refreshCatalogBlock, /reloadCategories\(\)/);
    assert.match(refreshCatalogBlock, /reloadTags\(\)/);
    assert.match(refreshCatalogBlock, /reloadDisplayTaxonomy\(\)/);
    assert.doesNotMatch(
      refreshCatalogBlock,
      /usingGeneratedCatalog\s*\?\s*Promise\.resolve\(\)/,
      "refreshCatalog must not skip reloadDesigns() based on catalog mode",
    );
  });

  it("display taxonomy uses Firestore-backed useGeneratedDesignLibraryTaxonomy for normal browse", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.match(source, /useGeneratedDesignLibraryTaxonomy/);
    assert.match(
      source,
      /const categories = includeArchived \? firestoreCategories : displayCategories;/,
    );
    assert.match(
      source,
      /const catalogTags = includeArchived \? firestoreCatalogTags : displayTags;/,
    );
    assert.doesNotMatch(source, /usingGeneratedCatalog/);
  });

  it("no loadAll, full collection scan, or new realtime listener is introduced", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.doesNotMatch(source, /loadAll:\s*true/);
    assert.doesNotMatch(source, /onSnapshot/);
  });

  it("useGeneratedReadyDesigns remains for Assisted Creation and uses Firestore pagination", () => {
    const hookSource = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts",
    );
    assert.match(hookSource, /export function useGeneratedReadyDesigns/);
    assert.match(hookSource, /loadAllReadyDesignsFromFirestore|listDesignsPage/);
    assert.doesNotMatch(hookSource, /studioCatalogAssetService/);

    const consumerSource = read(
      "apps/studio/src/renderer/src/features/customer-requests/hooks/useReadyDesignsForAssistedCatalogPicker.ts",
    );
    assert.match(consumerSource, /useGeneratedReadyDesigns/);
  });
});
