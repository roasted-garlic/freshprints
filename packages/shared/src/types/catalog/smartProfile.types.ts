/**
 * Smart Profile / Search Intelligence — versioned structured discovery metadata.
 * Replaces manual approved-tag taxonomy over time; coexists with legacy tags during migration.
 */

export const SMART_PROFILE_VERSION = "smart-profile-v1";

export const SMART_PROFILE_AUTOMATION_DECISIONS = [
  "shadow",
  "auto_approved",
  "needs_review",
  "failed",
] as const;

export type SmartProfileAutomationDecision = (typeof SMART_PROFILE_AUTOMATION_DECISIONS)[number];

export const SMART_PROFILE_TITLE_OUTCOMES = ["first_pass", "repaired", "manual"] as const;

export type SmartProfileTitleOutcome = (typeof SMART_PROFILE_TITLE_OUTCOMES)[number];

/** Shared list fields — empty arrays are omitted on persist. */
export interface SmartProfileDimensionLists {
  subjects?: string[];
  objects?: string[];
  styles?: string[];
  themes?: string[];
  interests?: string[];
  professionsGroups?: string[];
  occasions?: string[];
  places?: string[];
  colors?: string[];
  visibleText?: string[];
  searchConcepts?: string[];
}

export interface SmartProfileCategoryAlternative {
  categoryId?: string;
  categoryName: string;
  reason?: string;
}

export interface SmartProfileProvenance {
  version: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  generatedAt?: string;
  normalizerVersion?: string;
  verifierInvoked?: boolean;
  titleOutcome?: SmartProfileTitleOutcome;
  automationDecision?: SmartProfileAutomationDecision;
  automationDecisionAt?: string;
  automationReasonCodes?: string[];
  /** Present only when warnings exist; omit (never undefined or []) on Firestore persist. */
  validationWarnings?: string[];
  /** Dimension keys staff explicitly edited; preserved during Ready backfill merge. */
  staffEditedDimensionKeys?: string[];
  staffEditedAt?: string;
  staffEditedBy?: string;
  /** Import preset dimension keys that were applied during design creation from Studio session state. */
  importPresetDimensionKeys?: string[];
}

/** Transient pipeline payload — not persisted on designs. */
export interface SmartProfileEnrichmentParse {
  subjects?: string[];
  objects?: string[];
  styles?: string[];
  themes?: string[];
  interests?: string[];
  professionsGroups?: string[];
  occasions?: string[];
  places?: string[];
  colors?: string[];
  visibleText?: string[];
  searchConcepts?: string[];
  readableTextLines?: string[];
  categoryAlternatives?: Array<{ name: string; reason?: string }>;
  categoryGapNote?: string;
  halftoneShadowLikelihood?: string;
  halftoneShadowEvidence?: string;
}

/** Persisted on designs/{id}.smartProfile — Functions-owned writes in Slice 2+. */
export interface DesignSmartProfile extends SmartProfileDimensionLists {
  categoryId?: string;
  categoryName?: string;
  categoryAlternatives?: SmartProfileCategoryAlternative[];
  categoryGapSuggested?: boolean;
  categoryGapEvidence?: string;
  provenance: SmartProfileProvenance;
}

/** Shadow-only halftone assessment — not staff halftone decision (ADR-FP-080). */
export interface HalftoneShadowAssessment {
  likelihood?: "none" | "possible" | "likely" | "unknown";
  evidence?: string;
}
