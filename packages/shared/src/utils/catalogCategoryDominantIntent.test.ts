import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATEGORY_DOMINANT_INTENT_CONFLICT_CODE,
  detectCategoryDominantIntentConflict,
} from "./catalogCategoryDominantIntent";

describe("detectCategoryDominantIntentConflict", () => {
  it("denies Floral & Nature when fantasy/story/reading signals dominate", () => {
    const code = detectCategoryDominantIntentConflict({
      categoryName: "Floral & Nature",
      themes: ["fantasy", "nature", "storytelling", "imagination"],
      interests: ["reading", "nature", "fantasy"],
      places: ["fantasy landscape"],
      searchConcepts: [
        "magical book",
        "story book",
        "fantasy world",
        "mushroom forest",
        "enchanted forest",
        "fairy tale book",
        "adventure book",
      ],
    });
    assert.equal(code, CATEGORY_DOMINANT_INTENT_CONFLICT_CODE);
  });

  it("approves Floral & Nature when floral/nature is the dominant story", () => {
    const code = detectCategoryDominantIntentConflict({
      categoryName: "Floral & Nature",
      themes: ["nature", "floral"],
      interests: ["gardening", "flowers"],
      places: ["garden"],
      searchConcepts: ["wildflower bouquet", "botanical print"],
    });
    assert.equal(code, null);
  });

  it("approves Animals when fantasy signals are absent", () => {
    const code = detectCategoryDominantIntentConflict({
      categoryName: "Animals",
      themes: ["pets"],
      interests: ["dogs"],
      searchConcepts: ["schnauzer dog"],
    });
    assert.equal(code, null);
  });

  it("does not fire without a category name", () => {
    assert.equal(
      detectCategoryDominantIntentConflict({
        themes: ["fantasy", "storytelling"],
        interests: ["reading"],
        searchConcepts: ["magical book"],
      }),
      null,
    );
  });

  it("requires at least two dominant-family tokens", () => {
    const code = detectCategoryDominantIntentConflict({
      categoryName: "Floral & Nature",
      themes: ["fantasy"],
      interests: ["nature"],
      searchConcepts: ["flowers"],
    });
    assert.equal(code, null);
  });
});
