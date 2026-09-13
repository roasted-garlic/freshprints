import type { CatalogWorkflowMode } from "../constants/catalogWorkflowMode.constants";
import { canPublishAutonomously } from "../constants/catalogWorkflowMode.constants";
import type {
  DesignSmartProfile,
  SmartProfileAutomationDecision,
} from "../types/catalog/smartProfile.types";
import {
  detectSubjectSpecificityRisk,
  findStructuredEvidenceGaps,
  type StructuredVisualEvidence,
} from "./catalogAutomationEvidence";
import { detectCategoryDominantIntentConflict } from "./catalogCategoryDominantIntent";
import {
  validateCatalogTitleLength,
  validateDesignSmartProfile,
} from "./smartProfileValidation";

export interface CatalogAutomationDecisionInput {
  smartProfile: DesignSmartProfile;
  title?: string;
  categoryId?: string;
  /** Optional resolved category name; falls back to smartProfile.categoryName. */
  categoryName?: string;
  description?: string;
  visibleText?: string[];
  /** Optional bounded structured VCP evidence. Omitted callers retain legacy behavior. */
  visualContextProfile?: StructuredVisualEvidence;
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
  /** Historical compatibility input. Ignored by active Pass 1 authority. */
  verifierResult?: CatalogVerifierResult;
}

export type CatalogVerifierOutcome = "confirmed" | "unresolved" | "skipped";

export interface CatalogVerifierResult {
  invoked: boolean;
  outcome: CatalogVerifierOutcome;
  reasonCodes: string[];
}

export interface CatalogAutomationDecisionResult {
  decision: SmartProfileAutomationDecision;
  reasonCodes: string[];
  wouldAutoApprove: boolean;
  shouldPublishReady: boolean;
  verifier: CatalogVerifierResult;
  hardBlockers: string[];
  softConcerns: string[];
  verifierWorthy: string[];
}

const HARD_BLOCKER_CODES = new Set([
  "category_unresolved",
  "description_missing",
  "title:title_missing",
  "title:title_exceeds_max_characters",
  "category_gap_suggested",
]);

function isHardValidationCode(code: string): boolean {
  return (
    code.startsWith("validation:") && !code.includes("missing_generated_at")
  );
}

function isHardBlockerCode(code: string): boolean {
  return (
    isHardValidationCode(code) ||
    HARD_BLOCKER_CODES.has(code) ||
    code === "category_dominant_intent_conflict"
  );
}

function isConfirmableVerifierTrigger(code: string): boolean {
  return code === "automation_policy_uncertainty";
}

/**
 * Legacy diagnostic helper for explicitly requested verifier experiments.
 *
 * The active Pass 1 decision path does not call this helper. Its result may be
 * retained in historical diagnostics, but it is never authority for Ready or
 * Needs Review in the current release.
 */
export function runTargetedCatalogVerifier(input: {
  smartProfile: DesignSmartProfile;
  title?: string;
  description?: string;
  visibleText?: string[];
  visualContextProfile?: StructuredVisualEvidence;
  triggers: string[];
}): CatalogVerifierResult {
  const confirmableTriggers = [...new Set(input.triggers)].filter(
    isConfirmableVerifierTrigger,
  );
  if (confirmableTriggers.length === 0) {
    return { invoked: false, outcome: "skipped", reasonCodes: [] };
  }

  const gaps = findStructuredEvidenceGaps({
    subjects: input.smartProfile.subjects,
    objects: input.smartProfile.objects,
    title: input.title,
    description: input.description,
    visibleText: input.visibleText,
    visualContextProfile: input.visualContextProfile,
  });
  const specificity = detectSubjectSpecificityRisk({
    title: input.title,
    description: input.description,
    subjects: input.smartProfile.subjects,
  });

  const unresolvedCodes: string[] = [];
  if (gaps.length > 0) {
    unresolvedCodes.push(...gaps.map((gap) => gap.reasonCode));
  }
  if (specificity) {
    unresolvedCodes.push(specificity);
  }

  if (unresolvedCodes.length > 0) {
    return {
      invoked: true,
      outcome: "unresolved",
      reasonCodes: ["verifier_unresolved", ...unresolvedCodes],
    };
  }

  return {
    invoked: true,
    outcome: "confirmed",
    reasonCodes: ["verifier_confirmed", ...confirmableTriggers],
  };
}

/**
 * Evidence-based catalog automation decision.
 * Pass 1-only authority: deterministic objective validation is authoritative;
 * semantic diagnostics and historical verifier/reviewer output are observable
 * but cannot independently change the active decision.
 */
export function computeCatalogAutomationDecision(
  input: CatalogAutomationDecisionInput,
): CatalogAutomationDecisionResult {
  const reasonCodes: string[] = [];
  const softConcerns: string[] = [];

  const profileValidation = validateDesignSmartProfile(input.smartProfile);
  reasonCodes.push(
    ...profileValidation.errors.map((code) => `validation:${code}`),
  );
  reasonCodes.push(
    ...profileValidation.warnings.map((code) => `validation:${code}`),
  );

  const titleValidation = validateCatalogTitleLength(input.title);
  reasonCodes.push(...titleValidation.errors.map((code) => `title:${code}`));
  reasonCodes.push(...titleValidation.warnings.map((code) => `title:${code}`));

  if (!input.categoryId?.trim()) {
    reasonCodes.push("category_unresolved");
  }

  if (!input.description?.trim()) {
    reasonCodes.push("description_missing");
  }

  if (input.smartProfile.categoryGapSuggested) {
    reasonCodes.push("category_gap_suggested");
  }

  if ((input.smartProfile.categoryAlternatives?.length ?? 0) > 0) {
    reasonCodes.push("category_alternatives_present");
    softConcerns.push("category_alternatives_present");
  }

  const resolvedCategoryName =
    input.categoryName?.trim() ||
    input.smartProfile.categoryName?.trim() ||
    undefined;
  const categoryConflict = detectCategoryDominantIntentConflict({
    categoryName: resolvedCategoryName,
    themes: input.smartProfile.themes,
    interests: input.smartProfile.interests,
    searchConcepts: input.smartProfile.searchConcepts,
    places: input.smartProfile.places,
  });
  if (categoryConflict) {
    reasonCodes.push(categoryConflict);
  }

  const evidenceGaps = findStructuredEvidenceGaps({
    subjects: input.smartProfile.subjects,
    objects: input.smartProfile.objects,
    title: input.title,
    description: input.description,
    visibleText: input.visibleText,
    visualContextProfile: input.visualContextProfile,
  });
  for (const gap of evidenceGaps) {
    reasonCodes.push(gap.reasonCode);
  }

  const specificity = detectSubjectSpecificityRisk({
    title: input.title,
    description: input.description,
    subjects: input.smartProfile.subjects,
    visibleText: input.visibleText,
  });
  if (specificity) {
    reasonCodes.push(specificity);
  }

  const hardBlockers: string[] = [
    ...new Set(reasonCodes.filter(isHardBlockerCode)),
  ];

  // Historical verifierResult input is intentionally ignored by active Pass 1
  // authority. Preserve the result shape for trace/read compatibility while
  // making its non-authoritative status explicit.
  const verifier: CatalogVerifierResult = {
    invoked: false,
    outcome: "skipped",
    reasonCodes: [],
  };
  const verifierWorthy: string[] = [];

  const uniqueReasons = [...new Set(reasonCodes)];
  const uniqueHard = [...new Set(hardBlockers)];

  const policyWouldApprove = uniqueHard.length === 0;
  const livePublish = canPublishAutonomously({
    catalogWorkflowMode: input.catalogWorkflowMode,
    catalogAutonomousLiveEnabled: input.catalogAutonomousLiveEnabled,
  });

  if (!policyWouldApprove) {
    return {
      decision: "needs_review",
      reasonCodes: uniqueReasons,
      wouldAutoApprove: false,
      shouldPublishReady: false,
      verifier,
      hardBlockers: uniqueHard,
      softConcerns: [...new Set(softConcerns)],
      verifierWorthy,
    };
  }

  // Policy clear — publication depends on dual gate
  if (livePublish) {
    return {
      decision: "auto_approved",
      reasonCodes: uniqueReasons.includes("shadow_would_auto_approve")
        ? uniqueReasons
        : [
            ...uniqueReasons.filter((c) => c !== "shadow_would_auto_approve"),
            "auto_approved",
          ],
      wouldAutoApprove: true,
      shouldPublishReady: true,
      verifier,
      hardBlockers: [],
      softConcerns: [...new Set(softConcerns)],
      verifierWorthy,
    };
  }

  // Manual: still record scoring but always needs_review; wouldAutoApprove only for shadow/autonomous
  if (input.catalogWorkflowMode === "manual") {
    return {
      decision: "needs_review",
      reasonCodes:
        uniqueReasons.length > 0 ? uniqueReasons : ["manual_review_required"],
      wouldAutoApprove: false,
      shouldPublishReady: false,
      verifier,
      hardBlockers: [],
      softConcerns: [...new Set(softConcerns)],
      verifierWorthy,
    };
  }

  // Shadow or Autonomous-with-live-off: would approve, still Needs Review
  return {
    decision: "shadow",
    reasonCodes:
      uniqueReasons.length > 0
        ? uniqueReasons.includes("shadow_would_auto_approve")
          ? uniqueReasons
          : [...uniqueReasons, "shadow_would_auto_approve"]
        : ["shadow_would_auto_approve"],
    wouldAutoApprove: true,
    shouldPublishReady: false,
    verifier,
    hardBlockers: [],
    softConcerns: [...new Set(softConcerns)],
    verifierWorthy,
  };
}

/** Back-compat wrapper for Slice 2 call sites / tests. */
export function computeShadowAutomationDecision(input: {
  smartProfile: DesignSmartProfile;
  title?: string;
  categoryId?: string;
  description?: string;
  visibleText?: string[];
}): { decision: SmartProfileAutomationDecision; reasonCodes: string[] } {
  const result = computeCatalogAutomationDecision({
    ...input,
    catalogWorkflowMode: "shadow",
    catalogAutonomousLiveEnabled: false,
  });
  return {
    decision: result.decision,
    reasonCodes: result.reasonCodes,
  };
}
