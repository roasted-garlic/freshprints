import assert from "node:assert/strict";
import test from "node:test";

import { getDesignLibraryFirestoreLoadPolicy } from "./designLibraryFirestoreLoadPolicy";

test("successful generated ready browse starts no parallel Firestore queries", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      generatedTaxonomyStatus: "ready",
      usingGeneratedCatalog: true,
    }),
    { loadCategories: false, loadReadyDesignPage: false, loadTags: false },
  );
});

test("generated taxonomy failure remains unavailable without broad Firestore fallback", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      generatedTaxonomyStatus: "failed",
      usingGeneratedCatalog: true,
    }),
    { loadCategories: false, loadReadyDesignPage: false, loadTags: false },
  );
});

test("opening category management explicitly loads its full Firestore taxonomy", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      generatedTaxonomyStatus: "ready",
      requiresFullCategoryManagementData: true,
      usingGeneratedCatalog: true,
    }),
    { loadCategories: true, loadReadyDesignPage: false, loadTags: false },
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

test("loading, Strict Mode remount, and route remount remain generated-only", () => {
  const loadingInput = {
    generatedTaxonomyStatus: "loading" as const,
    usingGeneratedCatalog: true,
  };
  const expected = { loadCategories: false, loadReadyDesignPage: false, loadTags: false };

  assert.deepEqual(getDesignLibraryFirestoreLoadPolicy(loadingInput), expected);
  assert.deepEqual(getDesignLibraryFirestoreLoadPolicy(loadingInput), expected);
  assert.deepEqual(getDesignLibraryFirestoreLoadPolicy({ ...loadingInput }), expected);
});
