import {
  DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
  SUGGESTED_NEW_TAGS_POLICIES,
  SUGGESTED_NEW_TAGS_POLICY_MAX_SUGGESTIONS,
  type SuggestedNewTagsPolicy,
} from "../constants/aiEnrichment.constants";

const POLICY_SET = new Set<string>(SUGGESTED_NEW_TAGS_POLICIES);

export function resolveSuggestedNewTagsPolicy(raw: unknown): SuggestedNewTagsPolicy {
  return typeof raw === "string" && POLICY_SET.has(raw)
    ? (raw as SuggestedNewTagsPolicy)
    : DEFAULT_SUGGESTED_NEW_TAGS_POLICY;
}

/**
 * Original last-resort gate (2026-07-02): only when approved-tag coverage is genuinely thin.
 * Used by policy value "strict".
 */
export function isStrictSuggestedTagsLastResort(input: {
  approvedCount: number;
  allMatchesAreWeak: boolean;
  unmatchedCandidateCount: number;
}): boolean {
  if (input.approvedCount <= 2) {
    return true;
  }

  if (input.approvedCount === 3) {
    return input.allMatchesAreWeak && input.unmatchedCandidateCount >= 2;
  }

  return false;
}

export interface SuggestedNewTagsPolicyEvaluation {
  allow: boolean;
  maxSuggestions: number;
}

/**
 * Decide whether Suggested New Tags may be recorded for the current match state,
 * and the hard cap for how many may be added under the selected policy.
 */
export function evaluateSuggestedNewTagsPolicy(
  policy: SuggestedNewTagsPolicy,
  input: {
    approvedCount: number;
    allMatchesAreWeak: boolean;
    unmatchedCandidateCount: number;
  },
): SuggestedNewTagsPolicyEvaluation {
  const maxSuggestions = SUGGESTED_NEW_TAGS_POLICY_MAX_SUGGESTIONS[policy];

  switch (policy) {
    case "off":
      return { allow: false, maxSuggestions: 0 };
    case "strict":
      return {
        allow: isStrictSuggestedTagsLastResort(input),
        maxSuggestions,
      };
    case "balanced":
      return {
        allow: input.approvedCount <= 4 && input.unmatchedCandidateCount >= 1,
        maxSuggestions,
      };
    case "generous":
      return {
        allow: input.approvedCount <= 6 && input.unmatchedCandidateCount >= 1,
        maxSuggestions,
      };
    case "always":
      return {
        allow: input.unmatchedCandidateCount >= 1,
        maxSuggestions,
      };
    default:
      return { allow: false, maxSuggestions: 0 };
  }
}
