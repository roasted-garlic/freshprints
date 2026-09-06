export const CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION = "catalog-semantic-review-v2" as const;
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

export interface SemanticReviewResult {
  decision: SemanticReviewDecision;
  reason: string;
  blockersResolved: string[];
  blockersUnresolved: string[];
  patches?: SemanticReviewPatch[];
}

export type SemanticReviewStatus = "skipped" | "succeeded" | "failed" | "ineligible";
