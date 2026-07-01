import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveThemeCategory } from "./catalogThemeCategoryResolver";

const APPROVED_CATEGORIES = [
  { id: "cat-family", name: "Family", description: "Motherhood, parenting, fatherhood, and family relationship themes." },
  { id: "cat-pop", name: "Pop Culture & Characters", description: "Recognizable characters, franchises, and pop culture icons." },
  { id: "cat-humor", name: "Humorous Quotes", description: "Funny sayings and comedic quote-driven designs." },
  { id: "cat-faith", name: "Faith", description: "Christian, religious, and faith-based designs." },
  { id: "cat-teacher", name: "Teacher", description: "Teacher, school, and classroom themed designs." },
];

const IDS_BY_NAME: Record<string, string> = Object.fromEntries(
  APPROVED_CATEGORIES.map((category) => [category.name.toLowerCase(), category.id]),
);

describe("resolveThemeCategory", () => {
  it("review note 1 golden case: raw category 'Humorous Quotes' with motherhood/skeleton/quote tags resolves to Family", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Humorous Quotes",
        title: "Motherhood Rocks Skeleton",
        description:
          "A skeleton with its hair in a messy bun and a bandana, giving the rock on hand gesture. The text says 'Some days I rock it - Some days it rocks me - Either way we're rockin' MOTHERHOOD'.",
        matchedTags: ["motherhood", "skeleton", "quote", "funny"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Family");
    assert.equal(result.categoryId, "cat-family");
  });

  it("does not force Pop Culture & Characters just because a skeleton/cartoon style is present", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Motherhood Skeleton Design",
        description: "A cartoon skeleton illustration celebrating motherhood.",
        matchedTags: ["motherhood", "skeleton", "cartoon"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Family");
  });

  it("resolves Faith when faith/religious terms are present", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Inspirational",
        title: "Blessed and Faithful",
        description: "A design with a cross and the word blessed, celebrating Christian faith.",
        matchedTags: ["faith", "blessed", "cross"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Faith");
  });

  it("resolves Teacher when school/teacher terms are present", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "School Life",
        title: "Best Teacher Ever",
        description: "A design celebrating teachers and the classroom.",
        matchedTags: ["teacher", "school"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Teacher");
  });

  it("does not force Humorous Quotes from a bare quote signal without a humor signal", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Quotes",
        title: "Motherhood Quote Design",
        description: "A design with an inspirational quote about motherhood.",
        matchedTags: ["motherhood", "quote"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.notEqual(result.categoryName, "Humorous Quotes");
  });

  it("resolves Humorous Quotes when both quote and humor signals are present with no stronger competing theme", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Humorous Quotes",
        title: "Funny Quote Design",
        description: "A funny quote design with a comedic joke about coffee.",
        matchedTags: ["funny", "quote", "coffee"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Humorous Quotes");
  });

  it("resolves a genuine recognizable character to Pop Culture & Characters", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Wednesday Addams Portrait",
        description: "An illustrated portrait of the recognizable character Wednesday Addams.",
        matchedTags: ["wednesday", "characters"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Pop Culture & Characters");
  });

  it("returns undefined (not the raw candidate) when no approved category clears the minimum score", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Nature Landscapes",
        title: "Abstract Shapes",
        description: "An abstract geometric pattern with no clear theme.",
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, undefined);
    assert.equal(result.categoryId, undefined);
  });

  it("only picks from approved categories, never invents or returns the raw candidate literally", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Completely Made Up Category",
        title: "Random Design",
        description: "Nothing that matches any approved category.",
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    if (result.categoryName) {
      assert.ok(APPROVED_CATEGORIES.some((category) => category.name === result.categoryName));
    } else {
      assert.equal(result.categoryName, undefined);
    }
  });
});
