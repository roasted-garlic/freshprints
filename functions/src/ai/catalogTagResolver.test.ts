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

  it("caps approved tag output and stops suggesting once the cap is reached", () => {
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
    // Once the approved-tag cap is already satisfied, do not surface additional suggested-new-tags
    // for the remaining unmatched candidates — there is no room left for them anyway.
    assert.deepEqual(result.suggestedNewTags, []);
  });

  it("still collects a suggestion when the approved cap has not been reached", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "one" })],
      candidates: ["one", "new"],
      maxApprovedTags: 2,
    });

    assert.deepEqual(result.tags, ["one"]);
    assert.deepEqual(
      result.suggestedNewTags.map((tag) => tag.name),
      ["new"],
    );
  });

  it("never suggests new tags once 4+ approved tags matched, even with unmatched candidates and room left (last-resort gate)", () => {
    // Real-world case that motivated the last-resort gate: 7 of 8 approved slots matched via
    // strong exact-name matches, with 3 unmatched candidates and 1 slot of room technically left.
    // Prior behavior filled that 1 slot with a suggestion; the last-resort gate now blocks all
    // suggestions once 4+ approved tags matched, regardless of remaining room.
    const result = resolveAiCatalogTags({
      approvedTags: [
        createCatalogTag({ name: "one" }),
        createCatalogTag({ name: "two" }),
        createCatalogTag({ name: "three" }),
        createCatalogTag({ name: "four" }),
        createCatalogTag({ name: "five" }),
        createCatalogTag({ name: "six" }),
        createCatalogTag({ name: "seven" }),
      ],
      candidates: [
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "unmatched-a",
        "unmatched-b",
        "unmatched-c",
      ],
      maxApprovedTags: 8,
    });

    assert.equal(result.tags.length, 7);
    assert.equal(result.suggestedNewTags.length, 0);
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

  it("review note 4: reduces an unmatched multi-word candidate to a safe single-word suggested tag with the phrase as an alias", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "hair" })],
      candidates: ["messy bun"],
    });

    assert.deepEqual(result.tags, []);
    assert.equal(result.suggestedNewTags.length, 1);
    const suggestion = result.suggestedNewTags[0];
    assert.ok(suggestion);
    assert.ok(!suggestion.name.includes(" "), "suggested tag name must never contain a space");
    assert.ok(suggestion.aliases.includes("messy bun"), "original phrase should be retained as an alias");
  });

  it("review note 4: matches a phrase candidate to an approved alias instead of suggesting a new tag", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "hair", aliases: ["messy bun"] })],
      candidates: ["messy bun"],
    });

    assert.deepEqual(result.tags, ["hair"]);
    assert.deepEqual(result.suggestedNewTags, []);
  });

  it("review note 4: drops an unmatched candidate that has no safe single-word reduction", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [],
      candidates: ["a an the"],
    });

    assert.deepEqual(
      result.suggestedNewTags.every((tag) => !tag.name.includes(" ")),
      true,
    );
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

describe("catalogTagResolver — approvedTagCandidates shortlist for the tag reranker", () => {
  it("includes matched approved tags with a reason and matchedBy candidate", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "motherhood" }), createCatalogTag({ name: "hair", aliases: ["messy bun"] })],
      candidates: ["motherhood", "messy bun", "rock on"],
    });

    const motherhoodCandidate = result.approvedTagCandidates.find((candidate) => candidate.name === "motherhood");
    assert.ok(motherhoodCandidate);
    assert.ok(motherhoodCandidate.matchedBy.includes("motherhood"));
    assert.match(motherhoodCandidate.reason, /matched/i);

    const hairCandidate = result.approvedTagCandidates.find((candidate) => candidate.name === "hair");
    assert.ok(hairCandidate);
    assert.ok(hairCandidate.matchedBy.includes("messy bun"));
  });

  it("surfaces nearby approved tags for unmatched candidates sharing a token", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "rock climbing" }), createCatalogTag({ name: "unrelated" })],
      candidates: ["rock on"],
    });

    // "rock on" is unmatched (no exact/alias/token match), but shares the "rock" token with the
    // approved "rock climbing" tag, so it should be surfaced as a nearby candidate.
    const nearby = result.approvedTagCandidates.find((candidate) => candidate.name === "rock climbing");
    assert.ok(nearby, "expected 'rock climbing' to be surfaced as a nearby match for 'rock on'");
    assert.ok(nearby.matchedBy.includes("rock on"));
    assert.match(nearby.reason, /unmatched candidate/i);
  });

  it("reports unmatchedCandidateCount matching the number of genuinely unmatched raw candidates", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "summer" })],
      candidates: ["summer", "totally-unrelated-one", "totally-unrelated-two"],
    });

    assert.equal(result.unmatchedCandidateCount, 2);
  });

  it("caps the approvedTagCandidates shortlist even when the approved tag library is large", () => {
    const manyTags = Array.from({ length: 100 }, (_unused, index) => createCatalogTag({ name: `tag${index}` }));
    const result = resolveAiCatalogTags({
      approvedTags: manyTags,
      candidates: manyTags.map((tag) => tag.name),
    });

    assert.ok(result.approvedTagCandidates.length <= 30, "shortlist must stay capped, never the full library");
  });

  it("always returns approvedTagCandidates and unmatchedCandidateCount even with no candidates", () => {
    const result = resolveAiCatalogTags({
      approvedTags: [createCatalogTag({ name: "summer" })],
      candidates: [],
    });

    assert.deepEqual(result.approvedTagCandidates, []);
    assert.equal(result.unmatchedCandidateCount, 0);
  });
});

describe("catalogTagResolver — suggested-tags last-resort gate", () => {
  // Approved tags named "one".."nine" so exact-name matches are trivially "strong".
  const namedApprovedTags = (count: number) =>
    Array.from({ length: count }, (_unused, index) => createCatalogTag({ name: `named${index}` }));

  it("0-2 approved matches: suggestions are eligible to fire", () => {
    const zeroApproved = resolveAiCatalogTags({
      approvedTags: [],
      candidates: ["unmatched-only"],
    });
    assert.equal(zeroApproved.tags.length, 0);
    assert.equal(zeroApproved.suggestedNewTags.length, 1);

    const twoApproved = resolveAiCatalogTags({
      approvedTags: namedApprovedTags(2),
      candidates: ["named0", "named1", "unmatched-only"],
    });
    assert.equal(twoApproved.tags.length, 2);
    assert.equal(twoApproved.suggestedNewTags.length, 1);
  });

  it("3 approved matches with at least one strong (exact) match: suggestions never fire", () => {
    const result = resolveAiCatalogTags({
      approvedTags: namedApprovedTags(3),
      candidates: ["named0", "named1", "named2", "unmatched-a", "unmatched-b"],
    });

    assert.equal(result.tags.length, 3);
    assert.equal(result.allMatchesAreWeak, false);
    assert.equal(result.suggestedNewTags.length, 0);
  });

  it("3 approved matches, all weak (partial-token only), fewer than 2 unmatched candidates: suggestions do not fire", () => {
    // "named0-x" etc. only match via single-token fallback (the approved names are "named0" etc,
    // but candidates are multi-word phrases containing that token), producing weak matches.
    const approvedTags = namedApprovedTags(3);
    const result = resolveAiCatalogTags({
      approvedTags,
      candidates: ["named0 extra", "named1 extra", "named2 extra", "unmatched-a"],
    });

    assert.equal(result.tags.length, 3);
    assert.equal(result.allMatchesAreWeak, true);
    assert.equal(result.unmatchedCandidateCount, 1);
    assert.equal(result.suggestedNewTags.length, 0);
  });

  it("3 approved matches, all weak, 2+ unmatched candidates: suggestions fire (last-resort edge case)", () => {
    const approvedTags = namedApprovedTags(3);
    const result = resolveAiCatalogTags({
      approvedTags,
      candidates: ["named0 extra", "named1 extra", "named2 extra", "unmatched-a", "unmatched-b"],
    });

    assert.equal(result.tags.length, 3);
    assert.equal(result.allMatchesAreWeak, true);
    assert.equal(result.unmatchedCandidateCount, 2);
    assert.equal(result.suggestedNewTags.length, 2);
  });

  it("4+ approved matches: suggestions never fire, regardless of match quality or remaining room", () => {
    const approvedTags = namedApprovedTags(5);
    const result = resolveAiCatalogTags({
      approvedTags,
      // All 5 approved matches are weak (token-fallback via multi-word candidates), which would
      // have qualified at count===3, but 5 > 3 means the gate blocks regardless.
      candidates: [
        "named0 extra",
        "named1 extra",
        "named2 extra",
        "named3 extra",
        "named4 extra",
        "unmatched-a",
        "unmatched-b",
      ],
      maxApprovedTags: 8,
    });

    assert.equal(result.tags.length, 5);
    assert.equal(result.allMatchesAreWeak, true);
    assert.equal(result.suggestedNewTags.length, 0);
  });

  it("a tag reached first via a weak match and later confirmed by a strong match reports the strong reason", () => {
    // "named0" candidate alone would be a strong exact match; ensure a prior weak match on the
    // same approved tag (from an earlier multi-word candidate) does not lock in "weak" incorrectly.
    const approvedTags = namedApprovedTags(3);
    const result = resolveAiCatalogTags({
      approvedTags,
      candidates: ["named0 extra", "named0", "named1 extra", "named2 extra", "unmatched-a", "unmatched-b"],
    });

    assert.equal(result.tags.length, 3);
    assert.equal(result.allMatchesAreWeak, false, "named0 was later confirmed by a strong exact match");
    assert.equal(result.suggestedNewTags.length, 0);
  });
});
