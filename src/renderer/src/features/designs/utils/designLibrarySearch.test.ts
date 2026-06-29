import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../types/design.types";
import {
  collectUniqueDesignTags,
  computeFacetedTagsForDraftSelection,
  filterDesignsByAiReviewStatus,
  filterDesignsBySearch,
  filterDesignsByTags,
  filterTagsBySearch,
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

describe("computeFacetedTagsForDraftSelection", () => {
  // Spec example designs.
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
    // Unrelated tags are hidden.
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
    assert.ok(tags.includes("dog")); // selected, survives search
    assert.ok(!tags.includes("coffee"));
  });
});
