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
  const oneSuggestion = [
    { aliases: [], name: "a", preferredWhen: "x", reason: "x", source: "ai" as const },
  ];

  it("off mode never triggers, even when suggestions already exist", () => {
    assert.equal(
      shouldRunSuggestionAuthor("off", resolvedTags({ suggestedNewTags: oneSuggestion })),
      false,
    );
  });

  it("auto/always trigger only when suggestedNewTags already survived the policy gate", () => {
    assert.equal(
      shouldRunSuggestionAuthor("auto", resolvedTags({ suggestedNewTags: oneSuggestion })),
      true,
    );
    assert.equal(shouldRunSuggestionAuthor("auto", resolvedTags({ suggestedNewTags: [] })), false);
    assert.equal(
      shouldRunSuggestionAuthor("always", resolvedTags({ suggestedNewTags: oneSuggestion })),
      true,
    );
    assert.equal(shouldRunSuggestionAuthor("always", resolvedTags({ suggestedNewTags: [] })), false);
  });
});
