import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
  SUGGESTED_NEW_TAGS_POLICY_MAX_SUGGESTIONS,
} from "../constants/aiEnrichment.constants";
import {
  evaluateSuggestedNewTagsPolicy,
  isStrictSuggestedTagsLastResort,
  resolveSuggestedNewTagsPolicy,
} from "./suggestedNewTagsPolicy";

describe("suggestedNewTagsPolicy", () => {
  it("defaults unknown values to balanced", () => {
    assert.equal(resolveSuggestedNewTagsPolicy(undefined), DEFAULT_SUGGESTED_NEW_TAGS_POLICY);
    assert.equal(resolveSuggestedNewTagsPolicy("nope"), "balanced");
    assert.equal(resolveSuggestedNewTagsPolicy("strict"), "strict");
  });

  it("strict gate matches the original last-resort rules", () => {
    assert.equal(
      isStrictSuggestedTagsLastResort({
        approvedCount: 2,
        allMatchesAreWeak: false,
        unmatchedCandidateCount: 1,
      }),
      true,
    );
    assert.equal(
      isStrictSuggestedTagsLastResort({
        approvedCount: 3,
        allMatchesAreWeak: false,
        unmatchedCandidateCount: 5,
      }),
      false,
    );
    assert.equal(
      isStrictSuggestedTagsLastResort({
        approvedCount: 3,
        allMatchesAreWeak: true,
        unmatchedCandidateCount: 2,
      }),
      true,
    );
    assert.equal(
      isStrictSuggestedTagsLastResort({
        approvedCount: 4,
        allMatchesAreWeak: true,
        unmatchedCandidateCount: 3,
      }),
      false,
    );
  });

  it("balanced allows up to 4 approved matches with leftovers; caps at 3", () => {
    const allowed = evaluateSuggestedNewTagsPolicy("balanced", {
      approvedCount: 4,
      allMatchesAreWeak: false,
      unmatchedCandidateCount: 2,
    });
    assert.equal(allowed.allow, true);
    assert.equal(allowed.maxSuggestions, 3);

    const blocked = evaluateSuggestedNewTagsPolicy("balanced", {
      approvedCount: 5,
      allMatchesAreWeak: true,
      unmatchedCandidateCount: 2,
    });
    assert.equal(blocked.allow, false);
  });

  it("generous allows up to 6; always requires unmatched; off never allows", () => {
    assert.equal(
      evaluateSuggestedNewTagsPolicy("generous", {
        approvedCount: 6,
        allMatchesAreWeak: false,
        unmatchedCandidateCount: 1,
      }).allow,
      true,
    );
    assert.equal(
      evaluateSuggestedNewTagsPolicy("generous", {
        approvedCount: 7,
        allMatchesAreWeak: false,
        unmatchedCandidateCount: 1,
      }).allow,
      false,
    );
    assert.equal(
      evaluateSuggestedNewTagsPolicy("always", {
        approvedCount: 8,
        allMatchesAreWeak: false,
        unmatchedCandidateCount: 1,
      }).allow,
      true,
    );
    assert.equal(
      evaluateSuggestedNewTagsPolicy("always", {
        approvedCount: 0,
        allMatchesAreWeak: false,
        unmatchedCandidateCount: 0,
      }).allow,
      false,
    );
    assert.equal(
      evaluateSuggestedNewTagsPolicy("off", {
        approvedCount: 0,
        allMatchesAreWeak: false,
        unmatchedCandidateCount: 5,
      }).allow,
      false,
    );
    assert.equal(SUGGESTED_NEW_TAGS_POLICY_MAX_SUGGESTIONS.off, 0);
  });
});
