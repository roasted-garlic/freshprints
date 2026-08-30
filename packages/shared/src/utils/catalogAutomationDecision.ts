import type { CatalogWorkflowMode } from "../constants/catalogWorkflowMode.constants";
import { canPublishAutonomously } from "../constants/catalogWorkflowMode.constants";
import type {
  DesignSmartProfile,
  SmartProfileAutomationDecision,
} from "../types/catalog/smartProfile.types";
import {
  detectSubjectSpecificityRisk,
  findStructuredEvidenceGaps,
} from "./catalogAutomationEvidence";
import {
  detectCategoryDominantIntentConflict,
} from "./catalogCategoryDominantIntent";
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
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
  /** When provided, skips internal verifier trigger evaluation. */
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
  "title:title_exceeds_max_characters",
  "category_gap_suggested",
  "category_dominant_intent_conflict",
]);

function isHardValidationCode(code: string): boolean {
  return code.startsWith("validation:") && !code.includes("missing_generated_at");
}

/**
 * Deterministic targeted verifier — contextual evidence only.
 * No global semantic denylist (people/animal/etc. are not inherently invalid).
 */
export function runTargetedCatalogVerifier(input: {
  smartProfile: DesignSmartProfile;
  title?: string;
  description?: string;
  visibleText?: string[];
  triggers: string[];
}): CatalogVerifierResult {
  if (input.triggers.length === 0) {
    return { invoked: false, outcome: "skipped", reasonCodes: [] };
  }

  const gaps = findStructuredEvidenceGaps({
    subjects: input.smartProfile.subjects,
    objects: input.smartProfile.objects,
    title: input.title,
    description: input.description,
    visibleText: input.visibleText,
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
  if (
    input.triggers.some(
      (code) =>
        code === "category_alternatives_present" ||
        code.startsWith("category_") ||
        code === "automation_policy_uncertainty",
    ) &&
    unresolvedCodes.length === 0 &&
    input.triggers.includes("automation_policy_uncertainty")
  ) {
    // Category alternatives alone are soft; only unresolved if paired with other uncertainty
    // and no confirming evidence path — leave confirmed when only alternatives.
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
    reasonCodes: ["verifier_confirmed", ...input.triggers],
  };
}

function collectVerifierTriggers(reasonCodes: string[]): string[] {
  const triggers: string[] = [];
  for (const code of reasonCodes) {
    if (
      code.startsWith("structured_evidence_gap:") ||
      code.startsWith("subject_specificity_risk:") ||
      code === "category_alternatives_present" ||
      code === "automation_policy_uncertainty"
    ) {
      triggers.push(code);
    }
  }
  // Search concept codes are soft — never auto-trigger verifier
  return [...new Set(triggers)].filter(
    (code) => !code.startsWith("search_concept") && code !== "category_alternatives_present",
  );
}

/**
 * Evidence-based catalog automation decision.
 * Does not use a single model self-score as authority.
 */
export function computeCatalogAutomationDecision(
  input: CatalogAutomationDecisionInput,
): CatalogAutomationDecisionResult {
  const reasonCodes: string[] = [];
  const softConcerns: string[] = [];

  const profileValidation = validateDesignSmartProfile(input.smartProfile);
  reasonCodes.push(...profileValidation.errors.map((code) => `validation:${code}`));
  reasonCodes.push(...profileValidation.warnings.map((code) => `validation:${code}`));

  const titleValidation = validateCatalogTitleLength(input.title);
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
    input.categoryName?.trim() || input.smartProfile.categoryName?.trim() || undefined;
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

  const hardBlockers = [
    ...new Set(
      reasonCodes.filter(
        (code) => isHardValidationCode(code) || HARD_BLOCKER_CODES.has(code),
      ),
    ),
  ];

  const verifier: CatalogVerifierResult =
    input.verifierResult ??
    runTargetedCatalogVerifier({
      smartProfile: input.smartProfile,
      title: input.title,
      description: input.description,
      visibleText: input.visibleText,
      triggers: collectVerifierTriggers(reasonCodes),
    });

  if (verifier.invoked) {
    reasonCodes.push(...verifier.reasonCodes);
  }

  const verifierWorthy = collectVerifierTriggers(reasonCodes);

  if (verifier.outcome === "unresolved") {
    hardBlockers.push("verifier_unresolved");
  }

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
        : [...uniqueReasons.filter((c) => c !== "shadow_would_auto_approve"), "auto_approved"],
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
