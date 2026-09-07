export const CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION = "catalog-semantic-review-v5" as const;
export const SEMANTIC_REVIEW_DECISIONS = ["APPROVE", "APPROVE_WITH_PATCH", "NEEDS_REVIEW"] as const;
export type SemanticReviewDecision = (typeof SEMANTIC_REVIEW_DECISIONS)[number];

export const SEMANTIC_REVIEW_PATCHABLE_FIELDS = [
  "subjects", "objects", "styles", "themes", "interests", "professionsGroups", "occasions", "places", "searchConcepts",
] as const;
export type SemanticReviewPatchableField = (typeof SEMANTIC_REVIEW_PATCHABLE_FIELDS)[number];

export interface SemanticReviewPatch {
  field: SemanticReviewPatchableField;
  from: string[];
  to: string[];
}

export type SemanticReviewBlockerKind =
  | "structured_evidence_gap"
  | "subject_specificity_risk";

export type SemanticReviewBlockerField = "subjects" | "objects";

export interface SemanticReviewBlockerDetail {
  code: string;
  kind: SemanticReviewBlockerKind;
  field: SemanticReviewBlockerField;
  value: string;
  currentFieldValues: string[];
  valueAlreadyPresent: boolean;
  meaning: string;
  resolutionGuidance: string;
}

export interface SemanticReviewResult {
  decision: SemanticReviewDecision;
  reason: string;
  blockersResolved: string[];
  blockersUnresolved: string[];
  patches?: SemanticReviewPatch[];
}

export type SemanticReviewStatus = "skipped" | "succeeded" | "failed" | "ineligible";
