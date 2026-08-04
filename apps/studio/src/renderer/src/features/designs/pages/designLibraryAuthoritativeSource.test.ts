import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression coverage for the confirmed Studio Design Library ready-design invisibility defect
 * (post-launch-catalog-and-processing-stability, Owner QA Amendment 1, Workstream 1).
 *
 * Root cause: normal (non-archived) browse was gated entirely off a successfully-fetched
 * generated Storage snapshot (useGeneratedReadyDesigns), with Firestore fallback only activating
 * on an outright fetch *failure* — a stale-but-successful snapshot fetch left newly-approved
 * ready designs permanently invisible. The fix makes useDesigns (bounded, cursor-paginated
 * Firestore, already createdAt desc, already cache-invalidated on approval) the unconditional
 * primary source for the design LIST. Generated taxonomy (categories/tags) is unaffected and
 * remains the primary source for normal browse.
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

  it("useDesigns (bounded Firestore) is called unconditionally for the design list, not gated by generated-catalog mode", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    const useDesignsCallBlock = source.slice(
      source.indexOf("} = useDesigns(listQuery"),
      source.indexOf("} = useDesigns(listQuery") + 120,
    );
    // The `enabled` gate comes from getDesignLibraryFirestoreLoadPolicy's loadReadyDesignPage,
    // which the amendment made unconditionally true for both archived and normal browse — the
    // useDesigns call itself is no longer wrapped in an `if (usingGeneratedCatalog) { ... } else`
    // branch selecting between two different design sources.
    assert.match(useDesignsCallBlock, /firestoreLoadPolicy\.loadReadyDesignPage/);

    assert.doesNotMatch(
      source,
      /const designs = usingGeneratedCatalog\s*\n?\s*\? /,
      "designs must not branch between a generated source and a Firestore source",
    );
  });

  it("getDesignLibraryFirestoreLoadPolicy always loads the ready-design page regardless of generated-taxonomy status", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/utils/designLibraryFirestoreLoadPolicy.ts",
    );

    // Both branches (archived and normal/generated-taxonomy) must set loadReadyDesignPage: true —
    // this is the exact line the defect lived on before the fix (previously `false` in the
    // generated-taxonomy branch).
    const matches = [...source.matchAll(/loadReadyDesignPage:\s*(true|false)/g)];
    assert.ok(matches.length >= 2, "expected at least two loadReadyDesignPage assignments");
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
      source.indexOf("}, [reloadCategories, reloadDesigns, reloadTags]);") + 60,
    );
    assert.match(refreshCatalogBlock, /await Promise\.all\(\[reloadDesigns\(\), reloadCategories\(\), reloadTags\(\)\]\);/);
    assert.doesNotMatch(
      refreshCatalogBlock,
      /usingGeneratedCatalog\s*\?\s*Promise\.resolve\(\)/,
      "refreshCatalog must not skip reloadDesigns() based on catalog mode",
    );
  });

  it("generated taxonomy (categories/tags) remains the primary source for normal browse, unaffected by this fix", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.match(source, /useGeneratedDesignLibraryTaxonomy/);
    assert.match(
      source,
      /const categories = usingGeneratedCatalog \? generatedTaxonomy\.categories : firestoreCategories;/,
    );
    assert.match(
      source,
      /const catalogTags = usingGeneratedCatalog \? generatedTaxonomy\.tags : firestoreCatalogTags;/,
    );
  });

  it("no loadAll, full collection scan, or new realtime listener is introduced", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.doesNotMatch(source, /loadAll:\s*true/);
    assert.doesNotMatch(source, /onSnapshot/);
  });

  it("useGeneratedReadyDesigns remains defined and used by its other real consumer (Assisted Creation catalog picker), not deleted", () => {
    // The hook must survive this amendment for useReadyDesignsForAssistedCatalogPicker — deleting
    // it would be an unrequested, out-of-scope removal.
    const hookSource = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts",
    );
    assert.match(hookSource, /export function useGeneratedReadyDesigns/);

    const consumerSource = read(
      "apps/studio/src/renderer/src/features/customer-requests/hooks/useReadyDesignsForAssistedCatalogPicker.ts",
    );
    assert.match(consumerSource, /useGeneratedReadyDesigns/);
  });
});
