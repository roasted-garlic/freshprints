export {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
} from "../../../../../../shared/constants/aiTagExclusions.constants";

export const AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment";

export const DEFAULT_OPENAI_VISION_MODEL_ID = "gpt-5-nano-2025-08-07";

export const OPENAI_VISION_MODEL_OPTIONS = [
  {
    value: "gpt-5-nano-2025-08-07",
    label: "GPT-5 Nano (default)",
    hint: "gpt-5-nano-2025-08-07 — faster, lower cost",
  },
  {
    value: "gpt-5.4-nano-2026-03-17",
    label: "GPT-5.4 Nano (alternate)",
    hint: "gpt-5.4-nano-2026-03-17 — newer snapshot for accuracy testing",
  },
] as const;

export type OpenAiVisionModelOption = (typeof OPENAI_VISION_MODEL_OPTIONS)[number];

const ALLOWED_VISION_MODEL_IDS = new Set<string>(
  OPENAI_VISION_MODEL_OPTIONS.map((option) => option.value),
);

export function resolveClientVisionModelId(configured?: string): string {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_VISION_MODEL_IDS.has(trimmed)) {
    return trimmed;
  }

  return DEFAULT_OPENAI_VISION_MODEL_ID;
}

export function getVisionModelOption(modelId: string): OpenAiVisionModelOption | undefined {
  return OPENAI_VISION_MODEL_OPTIONS.find((option) => option.value === modelId);
}

export function formatVisionModelLabel(modelId: string): string {
  const option = getVisionModelOption(modelId);
  return option ? `${option.label} (${option.value})` : modelId;
}
