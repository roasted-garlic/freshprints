/** Normalizer semver — bump when normalization rules change materially. */
export const SMART_PROFILE_NORMALIZER_VERSION = "smart-profile-normalizer-v6";

/**
 * Caps are ceilings, not targets. Do not auto-raise without DEV calibration evidence
 * that truncation blocks materially useful profiling (owner lock 2026-08-25).
 */
export const SMART_PROFILE_MAX_ITEMS_PER_DIMENSION = 12;
export const SMART_PROFILE_MAX_SEARCH_CONCEPTS = 24;
export const SMART_PROFILE_MAX_CATEGORY_ALTERNATIVES = 3;
export const SMART_PROFILE_MAX_STRING_LENGTH = 64;
export const SMART_PROFILE_MAX_SEARCH_CONCEPT_LENGTH = 80;
export const SMART_PROFILE_MAX_GAP_EVIDENCE_LENGTH = 240;

/** Studio / catalog title hard cap — matches designService and Firestore rules. */
export const CATALOG_TITLE_MAX_CHARACTERS = 200;

/** Live catalog enrichment prompt version (DEV/prod pipeline). */
export const CURRENT_CATALOG_ENRICH_PROMPT_VERSION = "catalog-enrich-v34" as const;

/** Editable Smart Profile dimension list keys (excludes category — root Edit Design owns category). */
export const SMART_PROFILE_EDITABLE_DIMENSION_KEYS = [
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

export type SmartProfileEditableDimensionKey = (typeof SMART_PROFILE_EDITABLE_DIMENSION_KEYS)[number];
