import {
  ALLOWED_VISION_MODEL_IDS,
  DEFAULT_VISION_MODEL_ID as SHARED_DEFAULT_VISION_MODEL_ID,
  type AllowedVisionModelId,
} from "../../../packages/shared/src/constants/aiEnrichment.constants";

/** Max concurrent Cloud Function instances processing AI enrichment. */
export const AI_ENRICHMENT_MAX_INSTANCES = 1;

/** Default vision model (currently Gemini 2.5 Flash-Lite). */
export const DEFAULT_VISION_MODEL_ID: AllowedVisionModelId = SHARED_DEFAULT_VISION_MODEL_ID;

/** Allowed Gemini vision model IDs. */
export const ALLOWED_VISION_MODEL_ID_LIST = ALLOWED_VISION_MODEL_IDS;

export type { AllowedVisionModelId };

const ALLOWED_VISION_MODEL_ID_SET = new Set<string>(ALLOWED_VISION_MODEL_ID_LIST);

export function isAllowedVisionModelId(value: string): value is AllowedVisionModelId {
  return ALLOWED_VISION_MODEL_ID_SET.has(value);
}

/** Resolve a vision model ID from the allowlist. */
export function resolveVisionModelId(configured?: string): AllowedVisionModelId {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_VISION_MODEL_ID_SET.has(trimmed)) {
    return trimmed as AllowedVisionModelId;
  }

  return DEFAULT_VISION_MODEL_ID;
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

/** Max completion tokens for vision requests. */
export const VISION_MAX_COMPLETION_TOKENS = 2500;

/** One-shot retry cap when the model exhausts the primary token budget (finish_reason: length). */
export const VISION_MAX_COMPLETION_TOKENS_RETRY = 4000;

/**
 * Retry budget for transient vision request failures (429/5xx, incl. Gemini 503 overload).
 * 3 retries with exponential backoff (2s/4s/8s = 14s of sleep, plus 4 total fetch attempts) stays
 * well within the 180s enqueueAiEnrichment function timeout while giving genuine upstream overload
 * more room to clear before surfacing a failure to staff — observed 503s recovered on the very next
 * manual retry, just slowly, suggesting 2 retries was cutting it close.
 */
export const VISION_REQUEST_MAX_RETRIES = 3;
export const VISION_REQUEST_BASE_DELAY_MS = 2000;

/** Max single-word tags retained from the simplified playground-style enrichment response. */
export const SIMPLE_ENRICHMENT_MAX_TAGS = 8;

/** Max suggested-new-tag objects retained from AI output for owner/admin review. */
export const SIMPLE_ENRICHMENT_MAX_SUGGESTED_TAGS = 5;

/** Default confidence stored when the simplified model response omits a usable confidence value. */
export const SIMPLE_ENRICHMENT_DEFAULT_CONFIDENCE = 0.7;

/** Re-queue when an active AI stage has not updated within this window. */
export const AI_ENRICHMENT_STALE_STAGE_MS = 10 * 60 * 1000;

export const AI_ENRICHMENT_ACTIVE_STAGES = [
  "queued",
  "preparing_image",
  "sending_to_ai",
  "receiving_response",
  "validating_response",
] as const;
