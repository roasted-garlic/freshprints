import assert from "node:assert/strict";
import test from "node:test";

import { getDesignLibraryFirestoreLoadPolicy } from "./designLibraryFirestoreLoadPolicy";

test("normal browse loads the bounded Firestore ready-design page; display taxonomy is separate", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      includeArchived: false,
    }),
    { loadCategories: false, loadReadyDesignPage: true, loadTags: false },
  );
});

test("opening category management loads full Firestore taxonomy; design page still bounded", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      includeArchived: false,
      requiresFullCategoryManagementData: true,
    }),
    { loadCategories: true, loadReadyDesignPage: true, loadTags: true },
  );
});

test("archived mode loads approved+archived Firestore taxonomy paths", () => {
  assert.deepEqual(
    getDesignLibraryFirestoreLoadPolicy({
      includeArchived: true,
    }),
    { loadCategories: true, loadReadyDesignPage: true, loadTags: true },
  );
});

test("never disables the ready-design page load for normal or archived browse", () => {
  for (const includeArchived of [false, true]) {
    const policy = getDesignLibraryFirestoreLoadPolicy({ includeArchived });
    assert.equal(
      policy.loadReadyDesignPage,
      true,
      `loadReadyDesignPage must be true for includeArchived=${includeArchived}`,
    );
  }
});
