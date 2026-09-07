import {
  SEMANTIC_REVIEW_PATCHABLE_FIELDS,
  type SemanticReviewPatch,
  type SemanticReviewResult,
} from "../types/catalog/semanticReview.types";
import type { VisualContextProfile } from "../types/catalog/visualContext.types";

export const SEMANTIC_REVIEW_ELIGIBLE_PREFIXES = [
  "structured_evidence_gap:",
  "subject_specificity_risk:",
] as const;

export function getSemanticReviewEligibleBlockers(
  blockers: readonly string[],
): string[] {
  return blockers.filter((code) =>
    SEMANTIC_REVIEW_ELIGIBLE_PREFIXES.some((prefix) => code.startsWith(prefix)),
  );
}

/**
 * Remove semantic-review-eligible evidence blockers from a deterministic hard-blocker list.
 * They are reviewable semantic blockers, not objective authority blockers for the explicit
 * Playground review gate.
 */
export function getSemanticReviewObjectiveBlockers(
  blockers: readonly string[],
): string[] {
  const semanticBlockers = new Set(getSemanticReviewEligibleBlockers(blockers));
  return blockers.filter((code) => !semanticBlockers.has(code));
}

export function canRunSemanticReview(input: {
  enabled: boolean;
  objectiveBlockers: readonly string[];
  semanticBlockers: readonly string[];
  visualContextProfile?: VisualContextProfile;
}): boolean {
  return (
    input.enabled &&
    input.objectiveBlockers.length === 0 &&
    input.semanticBlockers.length > 0 &&
    Boolean(
      input.visualContextProfile?.summary &&
      input.visualContextProfile.detailedDescription,
    )
  );
}

export function validateSemanticReviewPatches(
  patches: readonly SemanticReviewPatch[] | undefined,
  forbiddenFields: readonly string[] = [],
): { valid: boolean; patches: SemanticReviewPatch[]; reason?: string } {
  if (!patches) return { valid: true, patches: [] };
  const allowed = new Set<string>(SEMANTIC_REVIEW_PATCHABLE_FIELDS);
  const forbidden = new Set(forbiddenFields);
  for (const patch of patches) {
    if (
      !allowed.has(patch.field) ||
      forbidden.has(patch.field) ||
      !Array.isArray(patch.from) ||
      !Array.isArray(patch.to)
    ) {
      return {
        valid: false,
        patches: [],
        reason: `Unsupported semantic review patch field: ${String(patch.field)}`,
      };
    }
    if (
      patch.from.some((v) => typeof v !== "string") ||
      patch.to.some((v) => typeof v !== "string")
    ) {
      return {
        valid: false,
        patches: [],
        reason: "Semantic review patch values must be strings.",
      };
    }
  }
  return { valid: true, patches: [...patches] };
}

export function semanticReviewNeedsReview(
  result: SemanticReviewResult,
): boolean {
  return (
    result.decision === "NEEDS_REVIEW" || result.blockersUnresolved.length > 0
  );
}
