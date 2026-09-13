import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V24,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V25,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY,
  hasRequiredAiEnrichmentPromptPlaceholders,
  isDefaultAiEnrichmentPromptTemplate,
  isPreviousDefaultAiEnrichmentPromptTemplate,
  resolveAiEnrichmentPromptTemplate,
  DEFAULT_VISION_MODEL_ID as SHARED_DEFAULT_VISION_MODEL_ID,
  type AllowedVisionModelId,
} from "@fresh-prints/shared/constants/aiEnrichment.constants";

export {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
} from "@fresh-prints/shared/constants/aiTagExclusions.constants";

export const AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment";

export const DEFAULT_VISION_MODEL_ID: AllowedVisionModelId =
  SHARED_DEFAULT_VISION_MODEL_ID;
export {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V24,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V25,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY,
  hasRequiredAiEnrichmentPromptPlaceholders,
  isDefaultAiEnrichmentPromptTemplate,
  isPreviousDefaultAiEnrichmentPromptTemplate,
  resolveAiEnrichmentPromptTemplate,
};

export function resolveClientPromptTemplate(raw: unknown): string {
  return resolveAiEnrichmentPromptTemplate(raw);
}

export interface VisionModelOption {
  badgeLabel: string;
  hint: string;
  label: string;
  shortLabel: string;
  value: AllowedVisionModelId;
  provider: "google" | "openai";
}

export const GEMINI_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  {
    value: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite (Google)",
    shortLabel: "Gemini 2.5 Flash-Lite",
    badgeLabel: "Google",
    hint: "gemini-2.5-flash-lite — fastest and most cost-effective ($0.10/$0.40 per 1M). System fallback when Settings model is missing/invalid.",
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

export const OPENAI_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  {
    value: "gpt-5.6-luna",
    label: "GPT-5.6 Luna (OpenAI)",
    shortLabel: "GPT-5.6 Luna",
    badgeLabel: "OpenAI",
    hint: "gpt-5.6-luna — OpenAI Luna ($0.20/$0.02 cached/$1.20 per 1M). Additive; not auto-selected.",
    provider: "openai",
  },
];

export const ALL_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  ...GEMINI_VISION_MODEL_OPTIONS,
  ...OPENAI_VISION_MODEL_OPTIONS,
];

const ALLOWED_VISION_MODEL_ID_SET = new Set<string>(
  ALL_VISION_MODEL_OPTIONS.map((option) => option.value),
);

export function resolveClientVisionModelId(
  configured?: string,
): AllowedVisionModelId {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_VISION_MODEL_ID_SET.has(trimmed)) {
    return trimmed as AllowedVisionModelId;
  }

  return DEFAULT_VISION_MODEL_ID;
}

export function getVisionModelOption(
  modelId: string,
): VisionModelOption | undefined {
  return ALL_VISION_MODEL_OPTIONS.find((option) => option.value === modelId);
}

export function formatVisionModelLabel(modelId: string): string {
  const option = getVisionModelOption(modelId);
  return option ? `${option.label} (${option.value})` : modelId;
}
