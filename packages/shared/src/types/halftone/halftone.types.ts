/**
 * Shared types for customer/staff human halftone confirmation.
 * Automatic pixel detection was removed by owner decision (ADR-FP-080 amendment).
 */

/**
 * @deprecated Automatic detection removed. Historical Firestore fields may still exist;
 * do not write new detector metadata.
 */
export type HalftoneDetectionClassification =
  | "not_detected"
  | "possible"
  | "likely"
  | "analysis_failed";

/**
 * @deprecated Automatic detection removed.
 */
export type HalftoneDetectionReasonCode =
  | "interior_transparent_holes"
  | "interior_opaque_dots"
  | "repeated_component_spacing"
  | "high_local_alternation"
  | "multi_region_pattern"
  | "pattern_density"
  | "empty_or_degenerate"
  | "analysis_error";

/**
 * @deprecated Automatic detection removed. Optional for backward-compatible reads only.
 */
export interface HalftoneDetectionPersisted {
  classification: HalftoneDetectionClassification;
  confidence: number;
  analysisVersion: string;
  reasonCodes: HalftoneDetectionReasonCode[];
  analyzedAt?: unknown;
}

export type HalftoneSubmitterResponseValue = "yes" | "no" | "unsure" | "unanswered";

export interface HalftoneSubmitterResponsePersisted {
  value: HalftoneSubmitterResponseValue;
  respondedAt?: unknown;
  respondedBy?: string | null;
}

export interface HalftoneStaffDecisionPersisted {
  /** null = no explicit staff decision yet */
  value: boolean | null;
  decidedAt?: unknown;
  decidedBy?: string | null;
  isExplicitOverride?: boolean;
}
