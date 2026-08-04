import assert from "node:assert/strict";
import test from "node:test";

import { getDesignLibraryFirestoreLoadPolicy } from "./designLibraryFirestoreLoadPolicy";

// post-launch-catalog-and-processing-stability, Owner QA Amendment 1: the design LIST is now
// always bounded-Firestore-authoritative for normal browse — a generated snapshot that fetches
// successfully but is merely stale must never be the sole authority on whether a newly-approved
// ready design is visible. Categories/tags remain generated-taxonomy-first, unchanged.

test("normal browse loads the bounded Firestore ready-design page even while using generated taxonomy", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      generatedTaxonomyStatus: "ready",
      usingGeneratedCatalog: true,
    }),
    { loadCategories: false, loadReadyDesignPage: true, loadTags: false },
  );
});

test("generated taxonomy failure still loads the bounded Firestore ready-design page (taxonomy and design list are independent)", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      generatedTaxonomyStatus: "failed",
      usingGeneratedCatalog: true,
    }),
    { loadCategories: false, loadReadyDesignPage: true, loadTags: false },
  );
});

test("opening category management explicitly loads its full Firestore taxonomy, design page still bounded-loaded", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      generatedTaxonomyStatus: "ready",
      requiresFullCategoryManagementData: true,
      usingGeneratedCatalog: true,
    }),
    { loadCategories: true, loadReadyDesignPage: true, loadTags: false },
  );
});

test("archived mode keeps its approved Firestore paths", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      generatedTaxonomyStatus: "ready",
      usingGeneratedCatalog: false,
    }),
    { loadCategories: true, loadReadyDesignPage: true, loadTags: true },
  );
});

test("loading, Strict Mode remount, and route remount all still load the bounded Firestore ready-design page", () => {
  const loadingInput = {
    generatedTaxonomyStatus: "loading" as const,
    usingGeneratedCatalog: true,
  };
  const expected = { loadCategories: false, loadReadyDesignPage: true, loadTags: false };

  assert.deepEqual(getDesignLibraryFirestoreLoadPolicy(loadingInput), expected);
  assert.deepEqual(getDesignLibraryFirestoreLoadPolicy(loadingInput), expected);
  assert.deepEqual(getDesignLibraryFirestoreLoadPolicy({ ...loadingInput }), expected);
});

test("never disables the ready-design page load for any taxonomy status while using generated taxonomy", () => {
  // Regression guard: this is the exact defect class the amendment fixes — no taxonomy status
  // (loading/ready/failed/inactive) may ever cause loadReadyDesignPage to be false while browsing
  // normal (non-archived) scope.
  for (const generatedTaxonomyStatus of ["loading", "ready", "failed", "inactive"] as const) {
    const policy = getDesignLibraryFirestoreLoadPolicy({
      generatedTaxonomyStatus,
      usingGeneratedCatalog: true,
    });
    assert.equal(
      policy.loadReadyDesignPage,
      true,
      `loadReadyDesignPage must be true for generatedTaxonomyStatus=${generatedTaxonomyStatus}`,
    );
  }
});
