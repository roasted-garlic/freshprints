import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ResolveAiCatalogTagsResult } from "./catalogTagResolver";
import { shouldRunSuggestionAuthor, shouldRunTagRerank } from "./aiEnrichmentPipeline";

function resolvedTags(overrides: Partial<ResolveAiCatalogTagsResult> = {}): ResolveAiCatalogTagsResult {
  return {
    allMatchesAreWeak: false,
    approvedTagCandidates: [],
    suggestedNewTags: [],
    tags: ["one", "two", "three", "four", "five", "six", "seven", "eight"],
    unmatchedCandidateCount: 0,
    ...overrides,
  };
}

describe("shouldRunTagRerank", () => {
  it("review note 6: off mode never triggers the reranker, regardless of matcher output", () => {
    assert.equal(
      shouldRunTagRerank("off", resolvedTags({ unmatchedCandidateCount: 10, tags: [], suggestedNewTags: [{
        aliases: [],
        name: "a",
        preferredWhen: "x",
        reason: "x",
        source: "ai",
      }] })),
      false,
    );
  });

  it("always mode triggers the reranker even on a clean, fully-resolved result", () => {
    assert.equal(shouldRunTagRerank("always", resolvedTags()), true);
  });

  it("auto mode triggers when 3 or more raw candidates went unmatched", () => {
    assert.equal(shouldRunTagRerank("auto", resolvedTags({ unmatchedCandidateCount: 3 })), true);
    assert.equal(shouldRunTagRerank("auto", resolvedTags({ unmatchedCandidateCount: 2 })), false);
  });

  it("auto mode triggers when fewer than 5 of the 8 tag slots are filled", () => {
    assert.equal(shouldRunTagRerank("auto", resolvedTags({ tags: ["one", "two", "three", "four"] })), true);
    assert.equal(
      shouldRunTagRerank("auto", resolvedTags({ tags: ["one", "two", "three", "four", "five"] })),
      false,
    );
  });

  it("auto mode triggers when 2 or more suggestedNewTags are generated", () => {
    const twoSuggestions = [
      { aliases: [], name: "a", preferredWhen: "x", reason: "x", source: "ai" as const },
      { aliases: [], name: "b", preferredWhen: "x", reason: "x", source: "ai" as const },
    ];
    assert.equal(shouldRunTagRerank("auto", resolvedTags({ suggestedNewTags: twoSuggestions })), true);
    assert.equal(
      shouldRunTagRerank("auto", resolvedTags({ suggestedNewTags: twoSuggestions.slice(0, 1) })),
      false,
    );
  });

  it("auto mode does not trigger on a clean, fully-resolved result", () => {
    assert.equal(shouldRunTagRerank("auto", resolvedTags()), false);
  });
});

describe("shouldRunSuggestionAuthor", () => {
  it("off mode never triggers, regardless of coverage", () => {
    assert.equal(
      shouldRunSuggestionAuthor("off", resolvedTags({ tags: [], unmatchedCandidateCount: 5 })),
      false,
    );
  });

  it("auto mode triggers when approved coverage is thin (0-2 matches)", () => {
    assert.equal(shouldRunSuggestionAuthor("auto", resolvedTags({ tags: [] })), true);
    assert.equal(shouldRunSuggestionAuthor("auto", resolvedTags({ tags: ["one"] })), true);
    assert.equal(shouldRunSuggestionAuthor("auto", resolvedTags({ tags: ["one", "two"] })), true);
  });

  it("auto mode does not trigger with 3 approved matches unless all are weak and 2+ candidates remain unmatched", () => {
    assert.equal(
      shouldRunSuggestionAuthor(
        "auto",
        resolvedTags({ allMatchesAreWeak: false, tags: ["one", "two", "three"], unmatchedCandidateCount: 5 }),
      ),
      false,
      "3 matches with at least one strong match must never trigger",
    );
    assert.equal(
      shouldRunSuggestionAuthor(
        "auto",
        resolvedTags({ allMatchesAreWeak: true, tags: ["one", "two", "three"], unmatchedCandidateCount: 1 }),
      ),
      false,
      "3 weak matches with fewer than 2 unmatched candidates must not trigger",
    );
    assert.equal(
      shouldRunSuggestionAuthor(
        "auto",
        resolvedTags({ allMatchesAreWeak: true, tags: ["one", "two", "three"], unmatchedCandidateCount: 2 }),
      ),
      true,
      "3 weak matches with 2+ unmatched candidates must trigger",
    );
  });

  it("never triggers with 4 or more approved matches, regardless of match quality", () => {
    assert.equal(
      shouldRunSuggestionAuthor(
        "auto",
        resolvedTags({
          allMatchesAreWeak: true,
          tags: ["one", "two", "three", "four"],
          unmatchedCandidateCount: 10,
        }),
      ),
      false,
    );
  });

  it("always mode behaves identically to auto mode — no separate trigger beyond the last-resort gate", () => {
    const thinCoverage = resolvedTags({ tags: ["one"] });
    const thickCoverage = resolvedTags({ tags: ["one", "two", "three", "four"] });

    assert.equal(shouldRunSuggestionAuthor("always", thinCoverage), shouldRunSuggestionAuthor("auto", thinCoverage));
    assert.equal(
      shouldRunSuggestionAuthor("always", thickCoverage),
      shouldRunSuggestionAuthor("auto", thickCoverage),
    );
  });
});
