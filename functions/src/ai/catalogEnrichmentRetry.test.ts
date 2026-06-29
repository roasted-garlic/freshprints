import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveCatalogCategory } from "./catalogCategoryResolver";
import { shouldRetryCatalogEnrichment } from "./catalogEnrichmentRetry";

describe("catalogCategoryResolver", () => {
  const idsByName = {
    motherhood: "cat-motherhood",
    toys: "cat-toys",
    animals: "cat-animals",
  };

  it("exact match is case-insensitive", () => {
    const result = resolveCatalogCategory(
      {
        candidate: "motherhood",
        allowedNames: ["Motherhood", "Toys"],
        theme: "humor",
      },
      idsByName,
    );

    assert.equal(result.categoryName, "Motherhood");
    assert.equal(result.categoryId, "cat-motherhood");
    assert.equal(result.remapped, false);
  });

  it("remaps motherhood slogan away from toys", () => {
    const result = resolveCatalogCategory(
      {
        candidate: "Toys",
        allowedNames: ["Motherhood", "Toys", "Animals"],
        theme: "motherhood",
        visibleText: ["MAMA LIFE"],
        primarySubject: "teddy bear",
      },
      idsByName,
    );

    assert.equal(result.categoryName, "Motherhood");
    assert.equal(result.remapped, true);
  });
});

describe("catalogEnrichmentRetry", () => {
  it("triggers retry for generic title and placeholder description", () => {
    const result = shouldRetryCatalogEnrichment({
      description: "-",
      title: "Typography",
      visibleText: ["SLEEP DEPRIVED"],
      artworkContainsText: true,
      categoryName: "Humor",
      allowedCategoryNames: ["Humor", "Motherhood"],
      categoryRemapped: false,
      tags: ["funny", "sleep", "humor", "sarcastic", "mom"],
      isRetryPass: false,
    });

    assert.equal(result.shouldRetry, true);
    assert.ok(result.reasons.includes("placeholder_description"));
    assert.ok(result.reasons.includes("generic_title"));
  });

  it("triggers retry for category mismatch before remap", () => {
    const result = shouldRetryCatalogEnrichment({
      description: "A funny raccoon design.",
      title: "Funny Raccoon",
      artworkContainsText: false,
      categoryName: "Invalid Category",
      allowedCategoryNames: ["Animals", "Humor"],
      categoryRemapped: false,
      tags: ["funny", "raccoon", "cartoon", "animal", "western"],
      isRetryPass: false,
    });

    assert.equal(result.shouldRetry, true);
    assert.ok(result.reasons.includes("category_mismatch"));
  });

  it("does not retry on second pass", () => {
    const result = shouldRetryCatalogEnrichment({
      description: "-",
      title: "Typography",
      artworkContainsText: false,
      allowedCategoryNames: ["Humor"],
      categoryRemapped: true,
      tags: [],
      isRetryPass: true,
    });

    assert.equal(result.shouldRetry, false);
  });

  it("triggers retry for canvas palette terms", () => {
    const result = shouldRetryCatalogEnrichment({
      description: "A purple star design.",
      title: "Purple Stars",
      artworkContainsText: false,
      allowedCategoryNames: ["Humor"],
      categoryRemapped: false,
      tags: ["funny", "stars", "purple", "cartoon", "retro"],
      rawColorPalette: ["purple", "gray background"],
      isRetryPass: false,
    });

    assert.ok(result.reasons.includes("canvas_palette"));
  });
});
