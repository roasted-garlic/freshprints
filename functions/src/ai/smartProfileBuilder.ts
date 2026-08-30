import type { DesignAiSuggestions } from "../../../packages/shared/src/types/ai/aiProcessing.types";
import type {
  DesignSmartProfile,
  HalftoneShadowAssessment,
  SmartProfileCategoryAlternative,
  SmartProfileDimensionLists,
  SmartProfileProvenance,
} from "../../../packages/shared/src/types/catalog/smartProfile.types";
import { SMART_PROFILE_VERSION } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import {
  mergeVisibleTextFromReadableLines,
  normalizeDesignSmartProfile,
} from "../../../packages/shared/src/utils/smartProfileNormalization";
import { buildSmartProfileDimensionVocab } from "../../../packages/shared/src/utils/smartProfileVocab";
import type { SmartProfileVocabLists } from "../../../packages/shared/src/utils/smartProfileVocab";
import {
  validateCatalogTitleLength,
  validateDesignSmartProfile,
} from "../../../packages/shared/src/utils/smartProfileValidation";

import { withoutUndefinedDeep } from "../lib/firestoreDocument";

import type { SimpleCatalogEnrichmentParsed } from "./simpleCatalogEnrichmentResponse";

export interface BuildDesignSmartProfileInput {
  parsed: SimpleCatalogEnrichmentParsed;
  suggestions: DesignAiSuggestions;
  categoryId?: string;
  categoryName?: string;
  categoryIdsByName: Readonly<Record<string, string>>;
  smartProfileVocab?: SmartProfileVocabLists;
}

function coerceStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string");
}

function parseCategoryAlternatives(
  value: unknown,
  categoryIdsByName: Readonly<Record<string, string>>,
): SmartProfileCategoryAlternative[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const result: SmartProfileCategoryAlternative[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const name =
      typeof record.name === "string"
        ? record.name.trim()
        : typeof record.categoryName === "string"
          ? record.categoryName.trim()
          : "";

    if (!name) {
      continue;
    }

    const categoryId = categoryIdsByName[name.toLowerCase()];
    const reason =
      typeof record.reason === "string" ? record.reason.trim() || undefined : undefined;
    const alternative: SmartProfileCategoryAlternative = {
      categoryName: name,
      ...(categoryId ? { categoryId } : {}),
      ...(reason ? { reason } : {}),
    };
    result.push(alternative);
  }

  return result.length > 0 ? result : undefined;
}

export function parseHalftoneShadowAssessment(parsed: SimpleCatalogEnrichmentParsed): HalftoneShadowAssessment | undefined {
  const likelihood = parsed.halftoneShadowLikelihood?.trim().toLowerCase();
  const evidence = parsed.halftoneShadowEvidence?.trim();

  if (!likelihood && !evidence) {
    return undefined;
  }

  const normalizedLikelihood =
    likelihood === "none" ||
    likelihood === "possible" ||
    likelihood === "likely" ||
    likelihood === "unknown"
      ? likelihood
      : "unknown";

  return {
    likelihood: normalizedLikelihood,
    ...(evidence ? { evidence } : {}),
  };
}

export function buildDesignSmartProfile(input: BuildDesignSmartProfileInput): DesignSmartProfile {
  const dimensions: SmartProfileDimensionLists = {
    subjects: coerceStringList(input.parsed.subjects),
    objects: coerceStringList(input.parsed.objects),
    styles: coerceStringList(input.parsed.styles),
    themes: coerceStringList(input.parsed.themes),
    interests: coerceStringList(input.parsed.interests),
    professionsGroups: coerceStringList(input.parsed.professionsGroups),
    occasions: coerceStringList(input.parsed.occasions),
    places: coerceStringList(input.parsed.places),
    colors: coerceStringList(input.parsed.colors),
    visibleText: mergeVisibleTextFromReadableLines(
      coerceStringList(input.parsed.visibleText),
      input.parsed.readableTextLines,
    ),
    searchConcepts: coerceStringList(input.parsed.searchConcepts),
  };

  const categoryGapEvidence = input.parsed.categoryGapNote?.trim();
  const categoryGapSuggested = Boolean(categoryGapEvidence);

  const profile: DesignSmartProfile = {
    ...dimensions,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    categoryAlternatives: parseCategoryAlternatives(
      input.parsed.categoryAlternatives,
      input.categoryIdsByName,
    ),
    categoryGapSuggested: categoryGapSuggested || undefined,
    categoryGapEvidence: categoryGapEvidence || undefined,
    provenance: {
      version: SMART_PROFILE_VERSION,
      provider: input.suggestions.provider,
      model: input.suggestions.model,
      promptVersion: input.suggestions.promptVersion,
      generatedAt: input.suggestions.generatedAt ?? new Date().toISOString(),
      titleOutcome: "first_pass",
      automationDecision: "shadow",
      automationDecisionAt: new Date().toISOString(),
    },
  };

  const validation = validateDesignSmartProfile(profile);
  const titleValidation = validateCatalogTitleLength(input.suggestions.title);

  const validationWarnings = [...validation.warnings, ...titleValidation.warnings];

  // Persist semantics: omit when empty (never write undefined or []).
  if (validationWarnings.length > 0) {
    profile.provenance.validationWarnings = validationWarnings;
  }

  return normalizeDesignSmartProfile(
    profile,
    buildSmartProfileDimensionVocab(input.smartProfileVocab),
    {
      title: input.suggestions.title,
      centralSubject: input.parsed.centralSubject,
      description: input.suggestions.description ?? input.parsed.description,
      visibleText: profile.visibleText ?? input.parsed.readableTextLines,
    },
  );
}

function sanitizeCategoryAlternativesForPersist(
  alternatives: SmartProfileCategoryAlternative[],
): SmartProfileCategoryAlternative[] {
  return alternatives.map((entry) => {
    const sanitized: SmartProfileCategoryAlternative = {
      categoryName: entry.categoryName,
    };
    if (entry.categoryId) sanitized.categoryId = entry.categoryId;
    if (entry.reason) sanitized.reason = entry.reason;
    return sanitized;
  });
}

function sanitizeProvenanceForPersist(provenance: SmartProfileProvenance): SmartProfileProvenance {
  return withoutUndefinedDeep(provenance);
}

/**
 * Build the Firestore-safe Smart Profile payload.
 * Omits empty dimension lists and strips nested undefined (provenance, alternatives).
 */
export function stripEmptySmartProfileDimensions(
  profile: DesignSmartProfile,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    provenance: sanitizeProvenanceForPersist(profile.provenance),
  };

  if (profile.categoryId) output.categoryId = profile.categoryId;
  if (profile.categoryName) output.categoryName = profile.categoryName;
  if (profile.categoryAlternatives?.length) {
    output.categoryAlternatives = sanitizeCategoryAlternativesForPersist(profile.categoryAlternatives);
  }
  if (profile.categoryGapSuggested) output.categoryGapSuggested = true;
  if (profile.categoryGapEvidence) output.categoryGapEvidence = profile.categoryGapEvidence;

  const listFields = [
    "subjects",
    "objects",
    "styles",
    "themes",
    "interests",
    "professionsGroups",
    "occasions",
    "places",
    "colors",
    "visibleText",
    "searchConcepts",
  ] as const;

  for (const field of listFields) {
    const value = profile[field];
    if (value && value.length > 0) {
      output[field] = value;
    }
  }

  return withoutUndefinedDeep(output);
}
