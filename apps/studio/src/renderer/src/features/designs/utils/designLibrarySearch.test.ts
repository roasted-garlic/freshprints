import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CATALOG_SUMMER_SEARCH_PARITY_FIXTURES } from "@fresh-prints/shared/utils/catalogDesignTextSearch";

import type { Category } from "../types/category.types";
import type { Design } from "../types/design.types";
import {
  buildCategoryFilterOptions,
  buildCategoryFilterOptionsFromFacetIds,
  collectUsedCategoryIds,
  designMatchesSearchQuery,
  filterDesignsByAiReviewStatus,
  filterDesignsByCategory,
  filterDesignsByHalftone,
  filterDesignsByNeedsCompanion,
  filterDesignsBySearch,
} from "./designLibrarySearch";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Summer Logo",
    description: "Bright seasonal artwork",
    tags: ["summer", "logo"],
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

function createCategory(overrides: Partial<Category> & Pick<Category, "id" | "name">): Category {
  return {
    createdAt: { toMillis: () => 1 } as Category["createdAt"],
    createdBy: "owner-1",
    description: overrides.description,
    id: overrides.id,
    isActive: overrides.isActive ?? true,
    name: overrides.name,
    sortOrder: overrides.sortOrder ?? 0,
    updatedAt: { toMillis: () => 2 } as Category["updatedAt"],
    updatedBy: "owner-1",
  };
}

describe("filterDesignsBySearch", () => {
  it("matches title, description, and ID but never legacy tags", () => {
    const designs = [createDesign()];
    assert.equal(filterDesignsBySearch(designs, "summer").length, 1);
    assert.equal(filterDesignsBySearch(designs, "seasonal").length, 1);
    assert.equal(filterDesignsBySearch(designs, "design-1").length, 1);
    const tagOnly = createDesign({ title: "Artwork", description: "A print", tags: ["legacy-only"] });
    assert.equal(filterDesignsBySearch([tagOnly], "legacy-only").length, 0);
    assert.equal(designMatchesSearchQuery(tagOnly, "legacy-only", [{ name: "legacy-only" }]), false);
  });

  it("matches Smart Profile-visible AI title/description fallback", () => {
    const result = filterDesignsBySearch(
      [createDesign({ title: "", aiSuggestions: { title: "I Freaking Love Summerween Can I..." } })],
      "sum",
    );
    assert.equal(result.length, 1);
  });

  it("keeps Portal progressive substring parity fixtures", () => {
    for (const fixture of CATALOG_SUMMER_SEARCH_PARITY_FIXTURES) {
      const result = filterDesignsBySearch(
        [createDesign({ id: fixture.title, title: fixture.title, tags: [], description: undefined })],
        fixture.query,
      );
      assert.equal(result.length > 0, fixture.expect, `title=${fixture.title} query=${fixture.query}`);
    }
  });
});

describe("active Studio catalog filters", () => {
  it("filters by review status, category, companion state, and staff Halftone", () => {
    const designs = [
      createDesign({ id: "staff", categoryId: "camp", aiReviewStatus: "approved", halftoneStaffDecision: { value: true }, companionSetIncomplete: true }),
      createDesign({ id: "other", categoryId: "greek", aiReviewStatus: "rejected", halftoneStaffDecision: { value: false } }),
    ];
    assert.deepEqual(filterDesignsByAiReviewStatus(designs, "approved").map((item) => item.id), ["staff"]);
    assert.deepEqual(filterDesignsByCategory(designs, "camp").map((item) => item.id), ["staff"]);
    assert.deepEqual(filterDesignsByNeedsCompanion(designs, true).map((item) => item.id), ["staff"]);
    assert.deepEqual(filterDesignsByHalftone(designs, true).map((item) => item.id), ["staff"]);
  });
});

describe("category options", () => {
  it("collects used IDs and preserves selected active categories", () => {
    const designs = [
      createDesign({ id: "a", categoryId: "greek" }),
      createDesign({ id: "b", categoryId: "camp" }),
      createDesign({ id: "c", categoryId: "camp" }),
    ];
    assert.deepEqual(collectUsedCategoryIds(designs), ["camp", "greek"]);
    assert.deepEqual(
      buildCategoryFilterOptions({
        allOptionValue: "__all__",
        categories: [
          createCategory({ id: "camp", name: "Camp" }),
          createCategory({ id: "greek", name: "Greek" }),
          createCategory({ id: "unused", name: "Unused" }),
          createCategory({ id: "inactive", name: "Inactive", isActive: false }),
        ],
        designs,
        selectedCategoryId: "unused",
      }),
      [
        { label: "All categories", value: "__all__" },
        { label: "Camp", value: "camp" },
        { label: "Greek", value: "greek" },
        { label: "Unused", value: "unused" },
      ],
    );
    assert.deepEqual(
      buildCategoryFilterOptionsFromFacetIds({
        allOptionValue: "__all__",
        categories: [
          createCategory({ id: "occupations", name: "Occupations" }),
          createCategory({ id: "funny", name: "Funny & Sarcastic" }),
          createCategory({ id: "animals", name: "Animals" }),
        ],
        facetCategoryIds: ["funny"],
        selectedCategoryId: "occupations",
      }).map((option) => option.value),
      ["__all__", "occupations", "funny"],
    );
  });
});
