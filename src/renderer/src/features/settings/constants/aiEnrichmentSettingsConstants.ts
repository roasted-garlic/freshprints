import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  hasRequiredAiEnrichmentPromptPlaceholders,
  DEFAULT_OPENAI_REASONING_EFFORT as SHARED_DEFAULT_OPENAI_REASONING_EFFORT,
  DEFAULT_VISION_MODEL_ID as SHARED_DEFAULT_VISION_MODEL_ID,
  type AllowedVisionModelId,
  type OpenAiReasoningEffort,
} from "../../../../../../shared/constants/aiEnrichment.constants";

export {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
} from "../../../../../../shared/constants/aiTagExclusions.constants";

export const AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment";

export const DEFAULT_VISION_MODEL_ID: AllowedVisionModelId = SHARED_DEFAULT_VISION_MODEL_ID;
/** @deprecated Use DEFAULT_VISION_MODEL_ID. */
export const DEFAULT_OPENAI_VISION_MODEL_ID = DEFAULT_VISION_MODEL_ID;
export const DEFAULT_OPENAI_REASONING_EFFORT = SHARED_DEFAULT_OPENAI_REASONING_EFFORT;
export {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
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
  provider: "openai" | "google";
}

/** @deprecated Use VisionModelOption */
export type OpenAiVisionModelOption = VisionModelOption;

export interface OpenAiReasoningEffortOption {
  hint: string;
  label: string;
  value: OpenAiReasoningEffort;
}

export const OPENAI_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  {
    value: "gpt-5.4-nano-2026-03-17",
    label: "GPT-5.4 Nano (OpenAI)",
    shortLabel: "GPT-5.4 Nano",
    badgeLabel: "OpenAI",
    hint: "gpt-5.4-nano-2026-03-17 — OpenAI vision option for comparison or fallback.",
    provider: "openai",
  },
  {
    value: "gpt-5.4-mini-2026-03-17",
    label: "GPT-5.4 Mini (OpenAI)",
    shortLabel: "GPT-5.4 Mini",
    badgeLabel: "OpenAI",
    hint: "gpt-5.4-mini-2026-03-17 — stronger OpenAI option for selective manual re-runs.",
    provider: "openai",
  },
];

export const GEMINI_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  {
    value: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite (Google) — Default",
    shortLabel: "Gemini 2.5 Flash-Lite",
    badgeLabel: "Default",
    hint: "gemini-2.5-flash-lite — fastest and most cost-effective ($0.10/$0.40 per 1M). No reasoning. Default.",
    provider: "google",
  },
  {
    value: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite (Google)",
    shortLabel: "Gemini 3.1 Flash-Lite",
    badgeLabel: "Google",
    hint: "gemini-3.1-flash-lite — newer Google model ($0.25/$1.50 per 1M). No reasoning controls.",
    provider: "google",
  },
];

export const ALL_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  ...GEMINI_VISION_MODEL_OPTIONS,
  ...OPENAI_VISION_MODEL_OPTIONS,
];

export const OPENAI_REASONING_EFFORT_OPTIONS: readonly OpenAiReasoningEffortOption[] = [
  {
    value: "none",
    label: "None",
    hint: "No additional reasoning. Lowest latency and cost, lowest support for difficult judgments.",
  },
  {
    value: "minimal",
    label: "Minimal",
    hint: "Very low reasoning. Fast and cheap, with limited extra thinking.",
  },
  {
    value: "low",
    label: "Low",
    hint: "Light reasoning. Balanced toward speed and cost.",
  },
  {
    value: "medium",
    label: "Medium, recommended default",
    hint: "Recommended default. Better judgment than low with moderate latency and cost.",
  },
  {
    value: "high",
    label: "High",
    hint: "More reasoning. Highest cost and latency in this slice, but can improve difficult outputs.",
  },
];

const ALLOWED_VISION_MODEL_ID_SET = new Set<string>(
  ALL_VISION_MODEL_OPTIONS.map((option) => option.value),
);
const ALLOWED_REASONING_EFFORT_VALUES = new Set<string>(
  OPENAI_REASONING_EFFORT_OPTIONS.map((option) => option.value),
);

export function resolveClientVisionModelId(configured?: string): AllowedVisionModelId {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_VISION_MODEL_ID_SET.has(trimmed)) {
    return trimmed as AllowedVisionModelId;
  }

  return DEFAULT_VISION_MODEL_ID;
}

export function isGeminiModelId(modelId: string): boolean {
  return modelId.startsWith("gemini-");
}

export function resolveClientReasoningEffort(configured?: string): OpenAiReasoningEffort {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_REASONING_EFFORT_VALUES.has(trimmed)) {
    return trimmed as OpenAiReasoningEffort;
  }

  return DEFAULT_OPENAI_REASONING_EFFORT;
}

export function getVisionModelOption(modelId: string): VisionModelOption | undefined {
  return ALL_VISION_MODEL_OPTIONS.find((option) => option.value === modelId);
}

export function getReasoningEffortOption(
  reasoningEffort: string,
): OpenAiReasoningEffortOption | undefined {
  return OPENAI_REASONING_EFFORT_OPTIONS.find((option) => option.value === reasoningEffort);
}

export function formatVisionModelLabel(modelId: string): string {
  const option = getVisionModelOption(modelId);
  return option ? `${option.label} (${option.value})` : modelId;
}

export function formatReasoningEffortLabel(reasoningEffort: string): string {
  const option = getReasoningEffortOption(reasoningEffort);
  return option ? `${option.label} (${option.value})` : reasoningEffort;
}
