import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../types/catalogTag.types";
import type { Category } from "../types/category.types";
import type { Design } from "../types/design.types";
import {
  buildCategoryFilterOptions,
  buildFacetedTagsFromAlgoliaOptions,
  collectUniqueDesignTags,
  collectUsedCategoryIds,
  computeFacetedTagsForDraftSelection,
  designMatchesSearchQuery,
  filterDesignsByAiReviewStatus,
  filterDesignsByCategory,
  filterDesignsByNeedsCompanion,
  filterDesignsBySearch,
  filterDesignsByTags,
  filterTagsBySearch,
  selectedTagsIncludeHalftone,
  setHalftoneInSelectedTags,
  visibleSelectedTags,
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

function createCatalogTag(overrides: Partial<CatalogTag> & Pick<CatalogTag, "name">): CatalogTag {
  return {
    aliases: overrides.aliases ?? [],
    createdAt: null,
    createdBy: "owner-1",
    id: overrides.id ?? overrides.name,
    name: overrides.name,
    preferredWhen: overrides.preferredWhen ?? "Use when relevant.",
    status: overrides.status ?? "approved",
    updatedAt: null,
    updatedBy: "owner-1",
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
  const designs = [createDesign()];

  it("matches titles", () => {
    const result = filterDesignsBySearch(designs, "summer");
    assert.equal(result.length, 1);
  });

  it("matches descriptions", () => {
    const result = filterDesignsBySearch(designs, "seasonal");
    assert.equal(result.length, 1);
  });

  it("matches tags", () => {
    const result = filterDesignsBySearch(designs, "logo");
    assert.equal(result.length, 1);
  });

  it("matches design ids", () => {
    const result = filterDesignsBySearch(designs, "design-1");
    assert.equal(result.length, 1);
  });

  it("matches tag aliases when catalog tags are provided", () => {
    const designsWithTmnt = [createDesign({ id: "mona", title: "Tattooed Mona Lisa", tags: ["tmnt"] })];
    const catalogTags = [
      createCatalogTag({ name: "tmnt", aliases: ["teenage mutant ninja turtles", "turtles", "turtle"] }),
    ];
    assert.equal(designMatchesSearchQuery(designsWithTmnt[0]!, "turtle", catalogTags), true);
    assert.equal(
      designMatchesSearchQuery(
        createDesign({ id: "mona", title: "Tattooed Mona Lisa", tags: [] }),
        "turtle",
        catalogTags,
      ),
      false,
    );
  });
});

describe("filterDesignsByAiReviewStatus", () => {
  it("includes legacy imported designs when filtering pending", () => {
    const designs = [
      createDesign({ status: "imported", aiReviewed: false, aiProcessed: false }),
    ];

    const result = filterDesignsByAiReviewStatus(designs, "pending");
    assert.equal(result.length, 1);
  });

  it("filters stored aiReviewStatus values", () => {
    const designs = [
      createDesign({ aiReviewStatus: "approved", aiReviewed: true }),
      createDesign({ id: "design-2", aiReviewStatus: "rejected", aiReviewed: false }),
    ];

    const result = filterDesignsByAiReviewStatus(designs, "approved");
    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "design-1");
  });
});

describe("filterDesignsByTags", () => {
  it("requires every selected tag to be present", () => {
    const designs = [
      createDesign({ tags: ["summer", "logo"] }),
      createDesign({ id: "design-2", tags: ["summer"] }),
    ];

    const result = filterDesignsByTags(designs, ["summer", "logo"]);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "design-1");
  });
});

describe("filterDesignsByCategory", () => {
  it("returns all designs when no category is selected", () => {
    const designs = [
      createDesign({ id: "design-1", categoryId: "camp" }),
      createDesign({ id: "design-2", categoryId: "greek" }),
    ];

    const result = filterDesignsByCategory(designs);
    assert.deepEqual(
      result.map((design) => design.id),
      ["design-1", "design-2"],
    );
  });

  it("filters designs by category id", () => {
    const designs = [
      createDesign({ id: "design-1", categoryId: "camp" }),
      createDesign({ id: "design-2", categoryId: "greek" }),
      createDesign({ id: "design-3" }),
    ];

    const result = filterDesignsByCategory(designs, "camp");
    assert.deepEqual(result.map((design) => design.id), ["design-1"]);
  });
});

describe("filterDesignsByNeedsCompanion", () => {
  it("returns all designs unchanged when the filter is off", () => {
    const designs = [
      createDesign({ id: "design-1", companionSetIncomplete: true }),
      createDesign({ id: "design-2" }),
    ];

    const result = filterDesignsByNeedsCompanion(designs, false);
    assert.deepEqual(result.map((design) => design.id), ["design-1", "design-2"]);
  });

  it("keeps only designs with companionSetIncomplete === true when the filter is on", () => {
    const designs = [
      createDesign({ id: "design-1", companionSetIncomplete: true }),
      createDesign({ id: "design-2", companionSetId: "set-1", companionSetIncomplete: false }),
      createDesign({ id: "design-3" }),
    ];

    const result = filterDesignsByNeedsCompanion(designs, true);
    assert.deepEqual(result.map((design) => design.id), ["design-1"]);
  });
});

describe("filterTagsBySearch", () => {
  it("filters available tags by substring", () => {
    const result = filterTagsBySearch(["alpha", "beta", "summer"], "mm");
    assert.deepEqual(result, ["summer"]);
  });

  it("returns filtered tags in alphabetical order", () => {
    const result = filterTagsBySearch(["zebra", "alpha", "beta"], "a");
    assert.deepEqual(result, ["alpha", "beta", "zebra"]);
  });
});

describe("collectUniqueDesignTags", () => {
  it("returns sorted unique tags", () => {
    const tags = collectUniqueDesignTags([
      createDesign({ tags: ["zebra", "alpha"] }),
      createDesign({ id: "design-2", tags: ["alpha", "beta"] }),
    ]);

    assert.deepEqual(tags, ["alpha", "beta", "zebra"]);
  });
});

describe("collectUsedCategoryIds", () => {
  it("returns sorted unique category ids that are assigned to designs", () => {
    const categoryIds = collectUsedCategoryIds([
      createDesign({ id: "design-1", categoryId: "greek" }),
      createDesign({ id: "design-2", categoryId: "camp" }),
      createDesign({ id: "design-3", categoryId: "camp" }),
      createDesign({ id: "design-4" }),
    ]);

    assert.deepEqual(categoryIds, ["camp", "greek"]);
  });
});

describe("buildCategoryFilterOptions", () => {
  it("shows only active categories assigned to the current matching designs", () => {
    const options = buildCategoryFilterOptions({
      allOptionValue: "__all__",
      categories: [
        createCategory({ id: "camp", name: "Camp" }),
        createCategory({ id: "greek", name: "Greek" }),
        createCategory({ id: "unused", name: "Unused" }),
        createCategory({ id: "inactive", name: "Inactive", isActive: false }),
      ],
      designs: [
        createDesign({ id: "design-1", categoryId: "camp" }),
        createDesign({ id: "design-2", categoryId: "greek" }),
      ],
    });

    assert.deepEqual(options, [
      { label: "All categories", value: "__all__" },
      { label: "Camp", value: "camp" },
      { label: "Greek", value: "greek" },
    ]);
  });

  it("keeps the selected active category visible when current filters leave it empty", () => {
    const options = buildCategoryFilterOptions({
      allOptionValue: "__all__",
      categories: [
        createCategory({ id: "camp", name: "Camp" }),
        createCategory({ id: "greek", name: "Greek" }),
      ],
      designs: [createDesign({ id: "design-1", categoryId: "camp" })],
      selectedCategoryId: "greek",
    });

    assert.deepEqual(options, [
      { label: "All categories", value: "__all__" },
      { label: "Camp", value: "camp" },
      { label: "Greek", value: "greek" },
    ]);
  });
});

describe("computeFacetedTagsForDraftSelection", () => {
  const designs = [
    createDesign({ id: "A", tags: ["dog", "funny", "cartoon"] }),
    createDesign({ id: "B", tags: ["dog", "coffee"] }),
    createDesign({ id: "C", tags: ["cat", "funny"] }),
    createDesign({ id: "D", tags: ["skeleton", "motherhood"] }),
  ];

  function toMap(faceted: ReturnType<typeof computeFacetedTagsForDraftSelection>) {
    return Object.fromEntries(faceted.map((ft) => [ft.tag, ft.count]));
  }

  it("shows every tag with counts when nothing is selected", () => {
    const result = computeFacetedTagsForDraftSelection({ baseDesigns: designs, draftSelectedTags: [] });

    assert.deepEqual(toMap(result), {
      cartoon: 1,
      cat: 1,
      coffee: 1,
      dog: 2,
      funny: 2,
      motherhood: 1,
      skeleton: 1,
    });
  });

  it("narrows to compatible tags after selecting one tag", () => {
    const result = computeFacetedTagsForDraftSelection({
      baseDesigns: designs,
      draftSelectedTags: ["dog"],
    });

    assert.deepEqual(toMap(result), { cartoon: 1, coffee: 1, dog: 2, funny: 1 });
    assert.equal(result.find((ft) => ft.tag === "dog")?.isSelected, true);
    assert.equal(result.find((ft) => ft.tag === "cat"), undefined);
    assert.equal(result.find((ft) => ft.tag === "skeleton"), undefined);
  });

  it("narrows further after selecting a second compatible tag", () => {
    const result = computeFacetedTagsForDraftSelection({
      baseDesigns: designs,
      draftSelectedTags: ["dog", "funny"],
    });

    assert.deepEqual(toMap(result), { cartoon: 1, dog: 1, funny: 1 });
    assert.equal(result.find((ft) => ft.tag === "coffee"), undefined);
  });

  it("keeps selected tags visible even with zero remaining matches", () => {
    const result = computeFacetedTagsForDraftSelection({
      baseDesigns: designs,
      draftSelectedTags: ["dog", "skeleton"],
    });

    const dog = result.find((ft) => ft.tag === "dog");
    const skeleton = result.find((ft) => ft.tag === "skeleton");
    assert.ok(dog && dog.isSelected);
    assert.ok(skeleton && skeleton.isSelected);
    assert.equal(dog.count, 0);
  });

  it("applies the tag search query but never hides selected tags", () => {
    const result = computeFacetedTagsForDraftSelection({
      baseDesigns: designs,
      draftSelectedTags: ["dog"],
      tagSearchQuery: "car",
    });

    const tags = result.map((ft) => ft.tag);
    assert.ok(tags.includes("cartoon"));
    assert.ok(tags.includes("dog"));
    assert.ok(!tags.includes("coffee"));
  });

  it("searches approved tag aliases and sorts approved tags before legacy tags", () => {
    const result = computeFacetedTagsForDraftSelection({
      baseDesigns: [
        createDesign({ id: "A", tags: ["legacy", "summer"] }),
        createDesign({ id: "B", tags: ["vacation"] }),
      ],
      catalogTags: [
        createCatalogTag({
          name: "summer",
          aliases: ["beach"],
          preferredWhen: "Use for warm weather and beach designs.",
        }),
      ],
      draftSelectedTags: [],
      tagSearchQuery: "beach",
    });

    assert.deepEqual(result.map((tag) => tag.tag), ["summer"]);
  });

  it("hides approved tags that have no matching designs in the current facet set", () => {
    const result = computeFacetedTagsForDraftSelection({
      baseDesigns: [createDesign({ id: "A", tags: ["summer"] })],
      catalogTags: [
        createCatalogTag({ name: "summer" }),
        createCatalogTag({ name: "unused" }),
      ],
      draftSelectedTags: [],
    });

    assert.deepEqual(result.map((tag) => tag.tag), ["summer"]);
  });

  it("excludes the canonical halftone tag from the modal facet list", () => {
    const result = computeFacetedTagsForDraftSelection({
      baseDesigns: [
        createDesign({ id: "A", tags: ["summer", "halftone"] }),
        createDesign({ id: "B", tags: ["halftone"] }),
      ],
      draftSelectedTags: ["halftone"],
    });

    assert.deepEqual(result.map((tag) => tag.tag), ["summer"]);
  });
});

describe("buildFacetedTagsFromAlgoliaOptions", () => {
  it("maps Algolia facet counts and excludes halftone", () => {
    const result = buildFacetedTagsFromAlgoliaOptions({
      draftSelectedTags: ["cow"],
      facetOptions: [
        { name: "cow", count: 12 },
        { name: "summer", count: 40 },
        { name: "halftone", count: 9 },
        { name: "page-two-only", count: 3 },
      ],
    });

    assert.deepEqual(
      result.map((row) => ({ tag: row.tag, count: row.count, isSelected: row.isSelected })),
      [
        { tag: "cow", count: 12, isSelected: true },
        { tag: "page-two-only", count: 3, isSelected: false },
        { tag: "summer", count: 40, isSelected: false },
      ],
    );
  });

  it("keeps draft-selected tags even when missing from facet distribution", () => {
    const result = buildFacetedTagsFromAlgoliaOptions({
      draftSelectedTags: ["orphan"],
      facetOptions: [{ name: "summer", count: 2 }],
    });

    assert.equal(result.find((row) => row.tag === "orphan")?.isSelected, true);
    assert.equal(result.find((row) => row.tag === "orphan")?.count, 0);
  });
});

describe("halftone selected-tag helpers", () => {
  it("toggles the canonical halftone tag in selected tags", () => {
    assert.deepEqual(setHalftoneInSelectedTags(["ocean"], true), ["halftone", "ocean"]);
    assert.deepEqual(setHalftoneInSelectedTags(["ocean", "halftone"], false), ["ocean"]);
    assert.equal(selectedTagsIncludeHalftone(["Halftone"]), true);
    assert.deepEqual(visibleSelectedTags(["ocean", "halftone"]), ["ocean"]);
  });
});
