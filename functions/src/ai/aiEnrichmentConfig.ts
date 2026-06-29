/** Max concurrent Cloud Function instances processing AI enrichment. */

export const AI_ENRICHMENT_MAX_INSTANCES = 1;



/** Default OpenAI vision model when settings doc is missing or invalid. */

export const DEFAULT_OPENAI_VISION_MODEL_ID = "gpt-5-nano-2025-08-07";



/** Allowed dated vision model snapshots (server allowlist). */

export const ALLOWED_OPENAI_VISION_MODEL_IDS = [

  "gpt-5-nano-2025-08-07",

  "gpt-5.4-nano-2026-03-17",

] as const;



export type AllowedOpenAiVisionModelId = (typeof ALLOWED_OPENAI_VISION_MODEL_IDS)[number];



const ALLOWED_OPENAI_VISION_MODEL_ID_SET = new Set<string>(ALLOWED_OPENAI_VISION_MODEL_IDS);



/** @deprecated Use DEFAULT_OPENAI_VISION_MODEL_ID or resolved per-run model from settings. */

export const OPENAI_VISION_MODEL_ID = DEFAULT_OPENAI_VISION_MODEL_ID;



export function resolveOpenAiVisionModelId(configured?: string): AllowedOpenAiVisionModelId {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_OPENAI_VISION_MODEL_ID_SET.has(trimmed)) {
    return trimmed as AllowedOpenAiVisionModelId;
  }

  return DEFAULT_OPENAI_VISION_MODEL_ID;
}

/** Max completion tokens for GPT-5 vision requests (reasoning + visible JSON output). */
export const OPENAI_VISION_MAX_COMPLETION_TOKENS = 2500;

/** One-shot retry cap when reasoning exhausts the primary budget (finish_reason: length). */
export const OPENAI_VISION_MAX_COMPLETION_TOKENS_RETRY = 4000;

/** Primary reasoning effort for catalog vision (speed-first on Processing path). */
export const OPENAI_VISION_REASONING_EFFORT = "minimal" as const;

/** Higher effort on empty-output retry or when primary effort is unsupported. */
export const OPENAI_VISION_REASONING_EFFORT_FALLBACK = "low" as const;

/** Re-queue when an active AI stage has not updated within this window. */

export const AI_ENRICHMENT_STALE_STAGE_MS = 10 * 60 * 1000;



export const AI_ENRICHMENT_ACTIVE_STAGES = [

  "queued",

  "preparing_image",

  "sending_to_ai",

  "receiving_response",

  "validating_response",

] as const;


