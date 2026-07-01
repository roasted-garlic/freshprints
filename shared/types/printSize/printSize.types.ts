import type { PrintSizeAcceptanceLevel } from "./printSize.enums";

export type { PrintSizeAcceptanceLevel, PrintSizeSource } from "./printSize.enums";

export interface PrintSizeMathErrorResult {
  success: false;
  error: string;
}

export interface EffectiveDpiCalculationSuccess {
  success: true;
  effectiveDpi: number;
  limitingAxis?: "width" | "height";
}

export type EffectiveDpiCalculationResult = EffectiveDpiCalculationSuccess | PrintSizeMathErrorResult;

export interface PrintSizeAtTargetDpiSuccess {
  success: true;
  printWidthInches: number;
  printHeightInches: number;
  targetDpi: number;
}

export type PrintSizeAtTargetDpiResult = PrintSizeAtTargetDpiSuccess | PrintSizeMathErrorResult;

/** Pixel-based print capability assessment at the target production DPI. */
export interface PrintSizeAssessment {
  targetDpi: number;
  maxPrintWidthInchesAtTarget: number;
  maxPrintHeightInchesAtTarget: number;
  acceptanceLevel: PrintSizeAcceptanceLevel;
  /** True when width at target DPI is at least the small-format minimum (3.5″). */
  meetsSmallFormatMinimum: boolean;
  /** True when width at target DPI is at least standard apparel size (8″). */
  meetsStandardApparelWidth: boolean;
  /** True when width at target DPI is at least preferred apparel size (10″). */
  meetsPreferredWidth: boolean;
  suggestedPrintWidthInches: number;
  suggestedPrintHeightInches: number;
  suggestedEffectiveDpi: number;
}

export interface PrintSizeAssessmentSuccess {
  success: true;
  assessment: PrintSizeAssessment;
}

export type PrintSizeAssessmentResult = PrintSizeAssessmentSuccess | PrintSizeMathErrorResult;
