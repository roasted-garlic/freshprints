import {
  ALLOWED_VISION_MODEL_IDS,
  DEFAULT_OPENAI_REASONING_EFFORT as SHARED_DEFAULT_OPENAI_REASONING_EFFORT,
  DEFAULT_OPENAI_VISION_MODEL_ID as SHARED_DEFAULT_OPENAI_VISION_MODEL_ID,
  DEFAULT_VISION_MODEL_ID as SHARED_DEFAULT_VISION_MODEL_ID,
  OPENAI_REASONING_EFFORT_FALLBACK as SHARED_OPENAI_REASONING_EFFORT_FALLBACK,
  OPENAI_REASONING_EFFORT_VALUES,
  OPENAI_VISION_MODEL_IDS,
  type AllowedVisionModelId,
  type OpenAiReasoningEffort,
  type OpenAiVisionModelId,
} from "../../../shared/constants/aiEnrichment.constants";

/** Max concurrent Cloud Function instances processing AI enrichment. */
export const AI_ENRICHMENT_MAX_INSTANCES = 1;

/** Default vision model across all providers (currently Gemini 2.5 Flash-Lite). */
export const DEFAULT_VISION_MODEL_ID: AllowedVisionModelId = SHARED_DEFAULT_VISION_MODEL_ID;

/** @deprecated Use DEFAULT_VISION_MODEL_ID. Left for fallback references to the old OpenAI default. */
export const DEFAULT_OPENAI_VISION_MODEL_ID = SHARED_DEFAULT_OPENAI_VISION_MODEL_ID;

/** Allowed OpenAI-only vision model IDs (for OpenAI-specific validation). */
export const ALLOWED_OPENAI_VISION_MODEL_IDS = OPENAI_VISION_MODEL_IDS;

export type AllowedOpenAiVisionModelId = OpenAiVisionModelId;

/** Combined allowlist: OpenAI + Gemini vision model IDs. */
export const ALLOWED_VISION_MODEL_ID_LIST = ALLOWED_VISION_MODEL_IDS;

export type { AllowedVisionModelId };

/** Allowed reasoning effort values for the current Chat Completions path. */
export const ALLOWED_OPENAI_REASONING_EFFORTS = OPENAI_REASONING_EFFORT_VALUES;

export type AllowedOpenAiReasoningEffort = OpenAiReasoningEffort;

const ALLOWED_VISION_MODEL_ID_SET = new Set<string>(ALLOWED_VISION_MODEL_ID_LIST);
const ALLOWED_OPENAI_VISION_MODEL_ID_SET = new Set<string>(ALLOWED_OPENAI_VISION_MODEL_IDS);
const ALLOWED_OPENAI_REASONING_EFFORT_SET = new Set<string>(ALLOWED_OPENAI_REASONING_EFFORTS);

/** @deprecated Use DEFAULT_OPENAI_VISION_MODEL_ID or resolved per-run model from settings. */
export const OPENAI_VISION_MODEL_ID = DEFAULT_OPENAI_VISION_MODEL_ID;

export function isAllowedVisionModelId(value: string): value is AllowedVisionModelId {
  return ALLOWED_VISION_MODEL_ID_SET.has(value);
}

export function isAllowedOpenAiVisionModelId(value: string): value is AllowedOpenAiVisionModelId {
  return ALLOWED_OPENAI_VISION_MODEL_ID_SET.has(value);
}

export function isAllowedOpenAiReasoningEffort(
  value: string,
): value is AllowedOpenAiReasoningEffort {
  return ALLOWED_OPENAI_REASONING_EFFORT_SET.has(value);
}

/** Resolve a vision model ID from the combined OpenAI + Gemini allowlist. */
export function resolveVisionModelId(configured?: string): AllowedVisionModelId {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_VISION_MODEL_ID_SET.has(trimmed)) {
    return trimmed as AllowedVisionModelId;
  }

  return DEFAULT_VISION_MODEL_ID;
}

/** @deprecated Use resolveVisionModelId for combined allowlist. */
export function resolveOpenAiVisionModelId(configured?: string): AllowedOpenAiVisionModelId {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_OPENAI_VISION_MODEL_ID_SET.has(trimmed)) {
    return trimmed as AllowedOpenAiVisionModelId;
  }

  return DEFAULT_OPENAI_VISION_MODEL_ID;
}

export function resolveEffectiveVisionModelId(input: {
  configured?: string;
  override?: string;
}): AllowedVisionModelId {
  const override = input.override?.trim();

  if (override && ALLOWED_VISION_MODEL_ID_SET.has(override)) {
    return override as AllowedVisionModelId;
  }

  return resolveVisionModelId(input.configured);
}

/** @deprecated Use resolveEffectiveVisionModelId. */
export function resolveEffectiveOpenAiVisionModelId(input: {
  configured?: string;
  override?: string;
}): AllowedOpenAiVisionModelId {
  return resolveEffectiveVisionModelId(input) as AllowedOpenAiVisionModelId;
}

export function resolveOpenAiReasoningEffort(
  configured?: string,
): AllowedOpenAiReasoningEffort {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_OPENAI_REASONING_EFFORT_SET.has(trimmed)) {
    return trimmed as AllowedOpenAiReasoningEffort;
  }

  return DEFAULT_OPENAI_REASONING_EFFORT;
}

/** Max completion tokens for GPT-5 vision requests (reasoning + visible JSON output). */
export const OPENAI_VISION_MAX_COMPLETION_TOKENS = 2500;

/** One-shot retry cap when reasoning exhausts the primary budget (finish_reason: length). */
export const OPENAI_VISION_MAX_COMPLETION_TOKENS_RETRY = 4000;

/** Max single-word tags retained from the simplified playground-style enrichment response. */
export const OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS = 8;

/** Max suggested-new-tag objects retained from AI output for owner/admin review. */
export const OPENAI_SIMPLE_ENRICHMENT_MAX_SUGGESTED_TAGS = 5;

/** Default confidence stored when the simplified model response omits a usable confidence value. */
export const OPENAI_SIMPLE_ENRICHMENT_DEFAULT_CONFIDENCE = 0.7;

/** Default reasoning effort for catalog vision. */
export const DEFAULT_OPENAI_REASONING_EFFORT = SHARED_DEFAULT_OPENAI_REASONING_EFFORT;

/** Fallback effort when the selected reasoning effort is unsupported on the current path. */
export const OPENAI_VISION_REASONING_EFFORT_FALLBACK = SHARED_OPENAI_REASONING_EFFORT_FALLBACK;

/** Re-queue when an active AI stage has not updated within this window. */
export const AI_ENRICHMENT_STALE_STAGE_MS = 10 * 60 * 1000;

export const AI_ENRICHMENT_ACTIVE_STAGES = [
  "queued",
  "preparing_image",
  "sending_to_ai",
  "receiving_response",
  "validating_response",
] as const;
