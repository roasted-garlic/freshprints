import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import { createAiReviewDraftFromDesign } from "./aiReviewFormState";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "upload-filename-v2",
    description: "Imported description",
    categoryId: "category-imported",
    tags: ["imported-tag"],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: false,
    aiReviewStatus: "needs_review",
    aiSuggestions: {
      title: "Hot Mess Highland Cow",
      description: 'Highland cow wearing a "Hot Mess" cap',
      categoryId: "category-ai",
      tags: ["cow", "hot mess"],
    },
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("createAiReviewDraftFromDesign", () => {
  it("seeds Final Catalog fields from persisted aiSuggestions", () => {
    const draft = createAiReviewDraftFromDesign(createDesign());

    assert.equal(draft.title, "Hot Mess Highland Cow");
    assert.equal(draft.description, 'Highland cow wearing a "Hot Mess" cap');
    assert.equal(draft.categoryId, "category-ai");
    assert.equal(draft.tagsInput, "cow, hot mess");
  });

  it("falls back to catalog fields when suggestion fields are empty", () => {
    const draft = createAiReviewDraftFromDesign(
      createDesign({
        aiSuggestions: {
          title: "",
          description: "",
          tags: [],
        },
      }),
    );

    assert.equal(draft.title, "upload-filename-v2");
    assert.equal(draft.description, "Imported description");
    assert.equal(draft.categoryId, "category-imported");
    assert.equal(draft.tagsInput, "imported-tag");
    assert.equal(draft.tagsAdjustmentNote, undefined);
  });

  it("sanitizes long AI tag phrases without throwing", () => {
    const longPhrase =
      "you haven't lived until you had dee's nuts in your mouth";

    const draft = createAiReviewDraftFromDesign(
      createDesign({
        aiSuggestions: {
          title: "Dee's Nuts",
          description: "Farmer logo",
          categoryId: "category-ai",
          tags: [longPhrase, "peanut"],
        },
      }),
    );

    assert.equal(draft.title, "Dee's Nuts");
    assert.equal(draft.tagsInput.includes("peanut"), true);
    assert.equal(draft.tagsInput.split(", ").every((tag) => tag.length <= 40), true);
    assert.match(draft.tagsAdjustmentNote ?? "", /shortened to 40 characters/);
  });
});
