import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAG_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  hasRequiredAiEnrichmentPromptPlaceholders,
  DEFAULT_VISION_MODEL_ID as SHARED_DEFAULT_VISION_MODEL_ID,
  type AllowedVisionModelId,
} from "../../../../../../shared/constants/aiEnrichment.constants";

export {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
} from "../../../../../../shared/constants/aiTagExclusions.constants";

export const AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment";

export const DEFAULT_VISION_MODEL_ID: AllowedVisionModelId = SHARED_DEFAULT_VISION_MODEL_ID;
export {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAG_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  hasRequiredAiEnrichmentPromptPlaceholders,
};

export interface VisionModelOption {
  badgeLabel: string;
  hint: string;
  label: string;
  shortLabel: string;
  value: AllowedVisionModelId;
  provider: "google";
}

export const GEMINI_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  {
    value: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite (Google) — Default",
    shortLabel: "Gemini 2.5 Flash-Lite",
    badgeLabel: "Default",
    hint: "gemini-2.5-flash-lite — fastest and most cost-effective ($0.10/$0.40 per 1M). Default.",
    provider: "google",
  },
  {
    value: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite (Google)",
    shortLabel: "Gemini 3.1 Flash-Lite",
    badgeLabel: "Google",
    hint: "gemini-3.1-flash-lite — newer Google model ($0.25/$1.50 per 1M).",
    provider: "google",
  },
];

export const ALL_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  ...GEMINI_VISION_MODEL_OPTIONS,
];

const ALLOWED_VISION_MODEL_ID_SET = new Set<string>(
  ALL_VISION_MODEL_OPTIONS.map((option) => option.value),
);

export function resolveClientVisionModelId(configured?: string): AllowedVisionModelId {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_VISION_MODEL_ID_SET.has(trimmed)) {
    return trimmed as AllowedVisionModelId;
  }

  return DEFAULT_VISION_MODEL_ID;
}

export function getVisionModelOption(modelId: string): VisionModelOption | undefined {
  return ALL_VISION_MODEL_OPTIONS.find((option) => option.value === modelId);
}

export function formatVisionModelLabel(modelId: string): string {
  const option = getVisionModelOption(modelId);
  return option ? `${option.label} (${option.value})` : modelId;
}
