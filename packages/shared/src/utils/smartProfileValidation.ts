import { CATALOG_TITLE_MAX_CHARACTERS } from "../constants/smartProfile.constants";
import type { DesignSmartProfile } from "../types/catalog/smartProfile.types";

export interface SmartProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDesignSmartProfile(profile: DesignSmartProfile): SmartProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!profile.provenance?.version?.trim()) {
    errors.push("smart_profile_missing_version");
  }

  if (!profile.provenance?.generatedAt?.trim()) {
    warnings.push("smart_profile_missing_generated_at");
  }

  if (profile.categoryGapSuggested && !profile.categoryGapEvidence?.trim()) {
    warnings.push("category_gap_without_evidence");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateCatalogTitleLength(title: string | undefined): SmartProfileValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!title?.trim()) {
    errors.push("title_missing");
    return { valid: false, errors, warnings };
  }

  if (title.length > CATALOG_TITLE_MAX_CHARACTERS) {
    warnings.push("title_exceeds_max_characters");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
