import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../types/design.types";
import {
  fetchVisibleExactIdDesign,
  designVisibleForExactIdLibrary,
  exactIdDesignMatchesLibraryFilters,
  looksLikeDesignDocumentId,
  mergeExactIdDesign,
} from "./designLibraryExactIdSearch";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "AbCdEfGhIjKlMnOpQrSt",
    title: "Summer Logo",
    tags: ["summer"],
    status: "ready",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => 1 } as Design["createdAt"],
    updatedAt: { toMillis: () => 2 } as Design["updatedAt"],
    ...overrides,
  };
}

describe("looksLikeDesignDocumentId", () => {
  it("accepts a 20-character Firestore-style id", () => {
    assert.equal(looksLikeDesignDocumentId("AbCdEfGhIjKlMnOpQrSt"), true);
  });

  it("rejects titles, short tokens, and whitespace", () => {
    assert.equal(looksLikeDesignDocumentId("summer"), false);
    assert.equal(looksLikeDesignDocumentId("design-1"), false);
    assert.equal(looksLikeDesignDocumentId("AbCd EfGhIjKlMnOpQrSt"), false);
    assert.equal(looksLikeDesignDocumentId(""), false);
  });
});

describe("exact-id library visibility", () => {
  it("keeps ready designs in the ready library and archived designs only when archived", () => {
    const ready = createDesign({ status: "ready" });
    const archived = createDesign({ id: "archivedDesignId00001", status: "archived" });
    const processing = createDesign({ id: "processingDesignId001", status: "processing" });

    assert.equal(designVisibleForExactIdLibrary(ready, false), true);
    assert.equal(designVisibleForExactIdLibrary(archived, false), false);
    assert.equal(designVisibleForExactIdLibrary(processing, false), false);
    assert.equal(designVisibleForExactIdLibrary(archived, true), true);
    assert.equal(designVisibleForExactIdLibrary(ready, true), false);
  });

  it("omits image-purged archived designs", () => {
    const purged = createDesign({
      assetsPurgedAt: { toMillis: () => 3 } as Design["assetsPurgedAt"],
      status: "archived",
    });
    assert.equal(designVisibleForExactIdLibrary(purged, true), false);
  });

  it("applies category and tag filters", () => {
    const design = createDesign({ categoryId: "cats", tags: ["summer", "logo"] });
    assert.equal(
      exactIdDesignMatchesLibraryFilters(design, {
        browsingArchived: false,
        categoryId: "cats",
        selectedTags: ["summer"],
      }),
      true,
    );
    assert.equal(
      exactIdDesignMatchesLibraryFilters(design, {
        browsingArchived: false,
        categoryId: "dogs",
      }),
      false,
    );
    assert.equal(
      exactIdDesignMatchesLibraryFilters(design, {
        browsingArchived: false,
        selectedTags: ["winter"],
      }),
      false,
    );
  });
});

describe("fetchVisibleExactIdDesign", () => {
  const caller = { id: "staff-1" } as import("../../users/types/user.types").User;

  it("returns a matching ready design from the injected loader", async () => {
    const extra = createDesign();
    const result = await fetchVisibleExactIdDesign(
      caller,
      extra.id,
      { browsingArchived: false },
      async () => [extra],
    );
    assert.equal(result?.id, extra.id);
  });

  it("returns null for a missing id and for a title query", async () => {
    const missing = await fetchVisibleExactIdDesign(
      caller,
      "AbCdEfGhIjKlMnOpQrSt",
      { browsingArchived: false },
      async () => [],
    );
    const titleQuery = await fetchVisibleExactIdDesign(
      caller,
      "summer",
      { browsingArchived: false },
      async () => {
        throw new Error("should not load for a title query");
      },
    );
    assert.equal(missing, null);
    assert.equal(titleQuery, null);
  });
});

describe("mergeExactIdDesign", () => {
  it("prepends a new id hit and does not duplicate", () => {
    const existing = [createDesign({ id: "alreadyLoadedDesign0001" })];
    const extra = createDesign();
    const merged = mergeExactIdDesign(existing, extra);
    assert.equal(merged[0]?.id, extra.id);
    assert.equal(merged.length, 2);
    assert.equal(mergeExactIdDesign(merged, extra).length, 2);
    assert.deepEqual(mergeExactIdDesign(existing, null), existing);
  });
});
