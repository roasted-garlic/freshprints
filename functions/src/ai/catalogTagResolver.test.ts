import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../../../shared/types/catalogTag.types";
import { resolveAiCatalogTags } from "./catalogTagResolver";

function createCatalogTag(input: Partial<CatalogTag> & Pick<CatalogTag, "name">): CatalogTag {
  return {
    aliases: input.aliases ?? [],
    createdAt: null,
    createdBy: "owner-1",
    id: input.id ?? input.name,
    name: input.name,
    preferredWhen: input.preferredWhen ?? "Use when relevant.",
    status: input.status ?? "approved",
    updatedAt: null,
    updatedBy: "owner-1",
  };
}

describe("catalogTagResolver", () => {
  it("maps AI tag candidates to approved names by name or alias", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [
        createCatalogTag({ name: "summer", aliases: ["beach", "vacation"] }),
        createCatalogTag({ name: "school", aliases: ["teacher"] }),
      ],
      candidates: ["Beach", "teacher", "summer"],
    });

    assert.deepEqual(result.tags, ["summer", "school"]);
    assert.deepEqual(result.suggestedNewTags, []);
  });

  it("matches multi-word candidates against multi-word approved names and aliases", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [
        createCatalogTag({ name: "music", aliases: ["rock and roll", "rock n roll"] }),
        createCatalogTag({ name: "western", aliases: ["cowboy boots"] }),
      ],
      candidates: ["rock and roll", "cowboy boots"],
    });

    assert.deepEqual(result.tags, ["music", "western"]);
    assert.deepEqual(result.suggestedNewTags, []);
  });

  it("reuses an approved tag via alias and does not suggest a new tag it already covers", () => {
    // Motherhood-skeleton regression: a "rock" concept must reuse the approved "rock-n-roll"
    // tag (matched here via its "rock" alias) instead of being emitted as suggestedNewTags: rock.
    const result = resolveAiCatalogTags({
      approvedTags: [
        createCatalogTag({ name: "rock-n-roll", aliases: ["rock", "rock and roll"] }),
        createCatalogTag({ name: "motherhood" }),
      ],
      candidates: ["rock", "motherhood"],
      suggestedNewTags: [
        {
          aliases: [],
          name: "rock",
          preferredWhen: "Use when rock is the theme.",
          reason: "model guessed",
          source: "ai",
        },
      ],
    });

    assert.ok(result.tags.includes("rock-n-roll"));
    assert.ok(result.tags.includes("motherhood"));
    assert.ok(
      !result.suggestedNewTags.some((tag) => tag.name === "rock"),
      "must not suggest a new 'rock' tag when an approved alias covers it",
    );
  });

  it("falls back to single-word token matching for unmatched multi-word candidates", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "music" })],
      candidates: ["rock music vibes"],
    });

    assert.deepEqual(result.tags, ["music"]);
    assert.deepEqual(result.suggestedNewTags, []);
  });

  it("returns unmatched candidates as suggested new tags without approving them", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "sports" })],
      candidates: ["baseball", "Sports", "baseball"],
    });

    assert.deepEqual(result.tags, ["sports"]);
    assert.deepEqual(
      result.suggestedNewTags.map((tag) => tag.name),
      ["baseball"],
    );
    assert.equal(result.suggestedNewTags[0]?.source, "ai");
  });

  it("ignores archived tags and invalid candidates", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [
        createCatalogTag({ name: "retired", status: "archived" }),
        createCatalogTag({ name: "holiday" }),
      ],
      candidates: ["retired", "holiday", "", "bad/tag", "x".repeat(41)],
    });

    assert.deepEqual(result.tags, ["holiday"]);
    assert.deepEqual(
      result.suggestedNewTags.map((tag) => tag.name),
      ["retired"],
    );
  });

  it("caps approved tag output while still collecting suggestions", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [
        createCatalogTag({ name: "one" }),
        createCatalogTag({ name: "two" }),
        createCatalogTag({ name: "three" }),
      ],
      candidates: ["one", "two", "three", "new"],
      maxApprovedTags: 2,
    });

    assert.deepEqual(result.tags, ["one", "two"]);
    assert.deepEqual(
      result.suggestedNewTags.map((tag) => tag.name),
      ["new"],
    );
  });

  it("drops suggested-new-tags that match an approved name or alias", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [
        createCatalogTag({ name: "wednesday", aliases: ["wednesday addams"] }),
        createCatalogTag({ name: "spooky", aliases: ["goth"] }),
      ],
      candidates: [],
      suggestedNewTags: [
        {
          aliases: ["addams"],
          name: "Wednesday",
          preferredWhen: "Use when Wednesday Addams is the main character.",
          reason: "AI suggested an already approved tag.",
          source: "ai",
        },
        {
          aliases: ["goth"],
          name: "gothic",
          preferredWhen: "Use when gothic styling is the main searchable idea.",
          reason: "AI suggested an alias that already maps to spooky.",
          source: "ai",
        },
      ],
    });

    assert.deepEqual(result.tags, []);
    assert.deepEqual(result.suggestedNewTags, []);
  });

  it("preserves complete nonmatching suggested-new-tags for staff review", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "characters" })],
      candidates: ["Characters"],
      suggestedNewTags: [
        {
          aliases: ["wednesday addams", "addams"],
          name: "wednesday",
          preferredWhen: "Use when Wednesday Addams is the main character.",
          reason: "No approved character tag matched the subject.",
          source: "ai",
        },
      ],
    });

    assert.deepEqual(result.tags, ["characters"]);
    assert.deepEqual(result.suggestedNewTags, [
      {
        aliases: ["wednesday addams", "addams"],
        name: "wednesday",
        preferredWhen: "Use when Wednesday Addams is the main character.",
        reason: "No approved character tag matched the subject.",
        source: "ai",
      },
    ]);
  });

  it("uses complete suggested-new-tag details instead of generic unmatched tag fallbacks", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [],
      candidates: ["Wednesday"],
      suggestedNewTags: [
        {
          aliases: ["wednesday addams"],
          name: "wednesday",
          preferredWhen: "Use when Wednesday Addams is the main character.",
          reason: "No approved character tag matched.",
          source: "ai",
        },
      ],
    });

    assert.deepEqual(result.tags, []);
    assert.deepEqual(result.suggestedNewTags, [
      {
        aliases: ["wednesday addams"],
        name: "wednesday",
        preferredWhen: "Use when Wednesday Addams is the main character.",
        reason: "No approved character tag matched.",
        source: "ai",
      },
    ]);
  });

  it("drops incomplete or invalid suggested-new-tags", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [],
      candidates: [],
      suggestedNewTags: [
        {
          aliases: [],
          name: "two words",
          preferredWhen: "Use when relevant.",
          source: "ai",
        },
        {
          aliases: [],
          name: "valid",
          preferredWhen: "",
          source: "ai",
        },
        {
          aliases: ["bad/alias", "clean alias"],
          name: "usable",
          preferredWhen: "Use when the subject is a primary searchable idea.",
          source: "ai",
        },
      ],
    });

    assert.deepEqual(
      result.suggestedNewTags.map((tag) => ({ aliases: tag.aliases, name: tag.name })),
      [{ aliases: ["clean alias"], name: "usable" }],
    );
  });
});

describe("catalogTagResolver — alias phrase normalization and context matching", () => {
  const musicTag = createCatalogTag({ name: "music", aliases: ["rock and roll", "heavy metal"] });
  const motherhoodTag = createCatalogTag({ name: "motherhood" });

  // 1. Punctuation alias normalization: hyphen in candidate matches spaced alias.
  it("matches a hyphenated candidate against a spaced approved alias (rock-and-roll → music)", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [musicTag],
      candidates: ["rock-and-roll"],
    });

    assert.ok(result.tags.includes("music"));
    assert.deepEqual(result.suggestedNewTags, []);
  });

  // 2. Ampersand alias normalization.
  it("matches a candidate with ampersand against a spaced approved alias (rock & roll → music)", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [musicTag],
      candidates: ["rock & roll"],
    });

    assert.ok(result.tags.includes("music"));
    assert.deepEqual(result.suggestedNewTags, []);
  });

  // 3. Apostrophe alias normalization.
  it("matches a candidate with apostrophe against a normalized approved alias (rock 'n' roll → music)", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "music", aliases: ["rock n roll"] })],
      candidates: ["rock 'n' roll"],
    });

    assert.ok(result.tags.includes("music"));
    assert.deepEqual(result.suggestedNewTags, []);
  });

  // 4. Suggested-tag context match via preferredWhen.
  it("resolves a suggested new tag to an approved tag when preferredWhen contains a matching alias phrase", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [musicTag, motherhoodTag],
      candidates: ["motherhood"],
      suggestedNewTags: [
        {
          aliases: [],
          name: "rock",
          preferredWhen: "Use when rock-and-roll is a primary theme or style for the design.",
          reason: "No approved tag matched the rock-and-roll pose.",
          source: "ai",
        },
      ],
    });

    assert.ok(result.tags.includes("music"), "should resolve to approved tag music via alias");
    assert.ok(result.tags.includes("motherhood"));
    assert.ok(
      !result.suggestedNewTags.some((tag) => tag.name === "rock"),
      "should not keep 'rock' as a new suggestion when alias covers it",
    );
  });

  // 5. No bad mapping when context describes a stone, not music.
  it("does not map a stone/geology 'rock' suggestion to music even when music has rock-and-roll alias", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [musicTag],
      candidates: [],
      suggestedNewTags: [
        {
          aliases: [],
          name: "rock",
          preferredWhen: "Use when a stone, boulder, or geology concept is shown in the design.",
          reason: "The design shows a large rock formation.",
          source: "ai",
        },
      ],
    });

    assert.ok(!result.tags.includes("music"), "stone context must not map to music");
    assert.ok(
      result.suggestedNewTags.some((tag) => tag.name === "rock"),
      "stone 'rock' should remain as a genuinely new suggestion",
    );
  });

  // 6. Genuinely new tag is preserved when no approved alias covers it.
  it("preserves a genuinely new suggested tag when no approved name or alias covers it", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [musicTag],
      candidates: [],
      suggestedNewTags: [
        {
          aliases: ["wednesday addams"],
          name: "wednesday",
          preferredWhen: "Use when Wednesday Addams is the primary subject of the design.",
          reason: "No approved character tag matched this recognizable IP.",
          source: "ai",
        },
      ],
    });

    assert.ok(
      result.suggestedNewTags.some((tag) => tag.name === "wednesday"),
      "genuinely new tag should be kept",
    );
    assert.ok(!result.tags.includes("music"));
  });

  // 7. Regression: existing exact-name and alias candidate resolution still works.
  it("still resolves exact-name and direct-alias candidates correctly after the alias lookup change", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [
        createCatalogTag({ name: "summer", aliases: ["beach", "vacation"] }),
        musicTag,
      ],
      candidates: ["beach", "rock and roll", "summer"],
    });

    assert.ok(result.tags.includes("summer"));
    assert.ok(result.tags.includes("music"));
    assert.deepEqual(result.suggestedNewTags, []);
  });
});
