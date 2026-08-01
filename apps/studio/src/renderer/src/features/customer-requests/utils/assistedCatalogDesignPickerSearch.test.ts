import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  ASSISTED_CATALOG_PICKER_VISIBLE_LIMIT,
  assistedCatalogPickerEmptyMessage,
  filterAssistedCatalogDesignsBySearch,
  limitAssistedCatalogPickerDesigns,
} from "./assistedCatalogDesignPickerSearch";

function design(partial: Partial<Design> & Pick<Design, "id" | "title" | "status">): Design {
  return {
    description: "",
    tags: [],
    originalPath: "",
    thumbnailPath: "",
    uploadedBy: "",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    createdBy: "",
    updatedBy: "",
    createdAt: undefined as unknown as Design["createdAt"],
    updatedAt: undefined as unknown as Design["updatedAt"],
    ...partial,
  };
}

describe("assistedCatalogDesignPickerSearch — failing-before / passing-after", () => {
  it("failing-before: empty catalog + empty search yields no rows (production symptom)", () => {
    const filtered = filterAssistedCatalogDesignsBySearch([], "");
    assert.equal(filtered.length, 0);
    assert.equal(
      assistedCatalogPickerEmptyMessage({
        isLoading: false,
        isUnavailable: false,
        catalogCount: 0,
        filteredCount: 0,
        searchQuery: "",
      }),
      "No ready Design Library designs are available yet.",
    );
  });

  it("passing-after: empty search returns seeded ready design", () => {
    const ready = design({
      id: "s9Yi7i8uq2ZddERyDuNT",
      title: "Fresh Prints QA Fixture",
      status: "ready",
    });
    const filtered = filterAssistedCatalogDesignsBySearch([ready], "");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, ready.id);
    assert.equal(
      assistedCatalogPickerEmptyMessage({
        isLoading: false,
        isUnavailable: false,
        catalogCount: 1,
        filteredCount: 1,
        searchQuery: "",
      }),
      null,
    );
  });

  it("matches exact title and design id substrings", () => {
    const ready = design({
      id: "abc123design",
      title: "Funny Frog Tee",
      status: "ready",
    });
    assert.equal(filterAssistedCatalogDesignsBySearch([ready], "Funny Frog").length, 1);
    assert.equal(filterAssistedCatalogDesignsBySearch([ready], "abc123").length, 1);
    assert.equal(filterAssistedCatalogDesignsBySearch([ready], "nope").length, 0);
  });

  it("search miss uses match copy; empty catalog does not", () => {
    const ready = design({ id: "d1", title: "Alpha", status: "ready" });
    assert.equal(
      assistedCatalogPickerEmptyMessage({
        isLoading: false,
        isUnavailable: false,
        catalogCount: 1,
        filteredCount: 0,
        searchQuery: "zzz",
      }),
      "No ready designs match that search.",
    );
    assert.equal(filterAssistedCatalogDesignsBySearch([ready], "zzz").length, 0);
  });

  it("excludes non-ready when caller filters status before search", () => {
    const ready = design({ id: "r1", title: "Ready One", status: "ready" });
    const archived = design({ id: "a1", title: "Archived One", status: "archived" });
    const source = [ready, archived].filter((item) => item.status === "ready");
    const filtered = filterAssistedCatalogDesignsBySearch(source, "");
    assert.deepEqual(
      filtered.map((item) => item.id),
      ["r1"],
    );
  });

  it("caps visible rows at the picker limit", () => {
    const many = Array.from({ length: ASSISTED_CATALOG_PICKER_VISIBLE_LIMIT + 5 }, (_, index) =>
      design({ id: `d${index}`, title: `Design ${index}`, status: "ready" }),
    );
    assert.equal(limitAssistedCatalogPickerDesigns(many).length, ASSISTED_CATALOG_PICKER_VISIBLE_LIMIT);
  });
});
