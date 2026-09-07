import {
  SEMANTIC_REVIEW_PATCHABLE_FIELDS,
  type SemanticReviewPatch,
  type SemanticReviewResult,
  type SemanticReviewBlockerDetail,
} from "../types/catalog/semanticReview.types";
import { normalizeSmartProfileStringList } from "./smartProfileNormalization";
import { smartCanonicalKey } from "./smartCanonicalKey";
import type { VisualContextProfile } from "../types/catalog/visualContext.types";

export const SEMANTIC_REVIEW_ELIGIBLE_PREFIXES = [
  "structured_evidence_gap:",
  "subject_specificity_risk:",
] as const;

export const SEMANTIC_REVIEW_CANONICAL_NO_OP_REASON =
  "Semantic review patch is a no-op after canonical normalization." as const;

export function getSemanticReviewEligibleBlockers(
  blockers: readonly string[],
): string[] {
  return blockers.filter((code) =>
    SEMANTIC_REVIEW_ELIGIBLE_PREFIXES.some((prefix) => code.startsWith(prefix)),
  );
}

function profileValuesForField(
  profile: Record<string, string[]>,
  field: "subjects" | "objects",
): string[] {
  const values = profile[field];
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string")
    : [];
}

function hasCanonicalValue(values: readonly string[], value: string): boolean {
  const target = smartCanonicalKey(value);
  return Boolean(target) && values.some((current) => smartCanonicalKey(current) === target);
}

/**
 * Explains the existing deterministic blocker contracts to the model without
 * changing blocker generation or final decision authority.
 */
export function describeSemanticReviewBlockers(input: {
  blockers: readonly string[];
  currentSmartProfile: Record<string, string[]>;
}): SemanticReviewBlockerDetail[] {
  return getSemanticReviewEligibleBlockers(input.blockers).flatMap(
    (code): SemanticReviewBlockerDetail[] => {
      const evidenceMatch = code.match(
        /^structured_evidence_gap:(subjects|objects):(.+)$/,
      );
      if (evidenceMatch) {
        const field = evidenceMatch[1] as "subjects" | "objects";
        const value = evidenceMatch[2];
        const currentFieldValues = profileValuesForField(
          input.currentSmartProfile,
          field,
        );
        return [
          {
            code,
            kind: "structured_evidence_gap",
            field,
            value,
            currentFieldValues: [...currentFieldValues],
            valueAlreadyPresent: hasCanonicalValue(currentFieldValues, value),
            meaning:
              "The named value is already present in this Smart Profile field, but deterministic contextual evidence does not sufficiently support retaining it.",
            resolutionGuidance:
              "Remove or replace the value only when the supplied evidence supports that mutation; otherwise return NEEDS_REVIEW with no patches.",
          },
        ];
      }

      const specificityMatch = code.match(/^subject_specificity_risk:(.+)$/);
      if (specificityMatch) {
        const value = specificityMatch[1];
        const currentFieldValues = profileValuesForField(
          input.currentSmartProfile,
          "subjects",
        );
        return [
          {
            code,
            kind: "subject_specificity_risk",
            field: "subjects",
            value,
            currentFieldValues: [...currentFieldValues],
            valueAlreadyPresent: hasCanonicalValue(currentFieldValues, value),
            meaning:
              "A generic subject is already represented while deterministic evidence supports a more specific grounded subject phrase that is not sufficiently represented.",
            resolutionGuidance:
              "Add the grounded specific phrase when supported, or replace/remove the generic subject only when evidence supports it; never duplicate the generic value. Otherwise return NEEDS_REVIEW with no patches.",
          },
        ];
      }

      return [];
    },
  );
}

/**
 * Deterministic Pass 2 blocker authority: resolution is derived from eligible
 * blocker sets before vs after patch application, never from reviewer self-report.
 */
export function deriveSemanticReviewBlockerResolution(input: {
  initialEligibleBlockers: readonly string[];
  finalEligibleBlockers: readonly string[];
}): {
  resolvedBlockers: string[];
  unresolvedBlockers: string[];
} {
  const initial = [
    ...new Set(getSemanticReviewEligibleBlockers(input.initialEligibleBlockers)),
  ];
  const final = [
    ...new Set(getSemanticReviewEligibleBlockers(input.finalEligibleBlockers)),
  ];
  const finalSet = new Set(final);
  return {
    resolvedBlockers: initial.filter((code) => !finalSet.has(code)),
    unresolvedBlockers: final,
  };
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
  currentSmartProfile: Record<string, string[]> = {},
): { valid: boolean; patches: SemanticReviewPatch[]; reason?: string } {
  if (!patches) return { valid: true, patches: [] };
  const allowed = new Set<string>(SEMANTIC_REVIEW_PATCHABLE_FIELDS);
  const forbidden = new Set(forbiddenFields);
  for (const patch of patches) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return {
        valid: false,
        patches: [],
        reason: "Semantic review patch must be an object.",
      };
    }
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

    if (!Object.prototype.hasOwnProperty.call(currentSmartProfile, patch.field)) {
      return {
        valid: false,
        patches: [],
        reason: "Semantic review patch current value is unavailable.",
      };
    }
    const current = normalizePatchList(currentSmartProfile[patch.field]);
    const from = normalizePatchList(patch.from);
    const to = normalizePatchList(patch.to);
    if (!sameCanonicalList(current, from)) {
      return {
        valid: false,
        patches: [],
        reason: "Semantic review patch source does not match the current effective profile.",
      };
    }
    if (sameCanonicalList(from, to)) {
      return {
        valid: false,
        patches: [],
        reason: SEMANTIC_REVIEW_CANONICAL_NO_OP_REASON,
      };
    }
  }
  return {
    valid: true,
    patches: patches.map((patch) => ({
      ...patch,
      from: normalizeSmartProfileStringList(patch.from) ?? [],
      to: normalizeSmartProfileStringList(patch.to) ?? [],
    })),
  };
}

function normalizePatchList(values: readonly string[]): string[] {
  return (normalizeSmartProfileStringList(values) ?? [])
    .map((value) => smartCanonicalKey(value))
    .filter(Boolean)
    .sort();
}

function sameCanonicalList(left: readonly string[], right: readonly string[]): boolean {
  return normalizePatchList(left).join("\u0000") === normalizePatchList(right).join("\u0000");
}

/**
 * @deprecated Reviewer self-report is audit-only. Prefer
 * `deriveSemanticReviewBlockerResolution` + deterministic WAA.
 * Retained for transitional call sites that still inspect the model payload.
 */
export function semanticReviewNeedsReview(
  result: SemanticReviewResult,
): boolean {
  return result.decision === "NEEDS_REVIEW";
}
