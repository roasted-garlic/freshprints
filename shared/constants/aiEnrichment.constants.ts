export const OPENAI_VISION_MODEL_IDS = [
  "gpt-5.4-nano-2026-03-17",
  "gpt-5.4-mini-2026-03-17",
] as const;

export type OpenAiVisionModelId = (typeof OPENAI_VISION_MODEL_IDS)[number];

export const DEFAULT_OPENAI_VISION_MODEL_ID: OpenAiVisionModelId =
  "gpt-5.4-nano-2026-03-17";

export const GEMINI_VISION_MODEL_IDS = [
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
] as const;

export type GeminiVisionModelId = (typeof GEMINI_VISION_MODEL_IDS)[number];

export const ALLOWED_VISION_MODEL_IDS = [
  ...OPENAI_VISION_MODEL_IDS,
  ...GEMINI_VISION_MODEL_IDS,
] as const;

export type AllowedVisionModelId = (typeof ALLOWED_VISION_MODEL_IDS)[number];

export const DEFAULT_VISION_MODEL_ID: AllowedVisionModelId = "gemini-2.5-flash-lite";

export const OPENAI_REASONING_EFFORT_VALUES = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
] as const;

export type OpenAiReasoningEffort = (typeof OPENAI_REASONING_EFFORT_VALUES)[number];

export const DEFAULT_OPENAI_REASONING_EFFORT: OpenAiReasoningEffort = "medium";

export const OPENAI_REASONING_EFFORT_FALLBACK: OpenAiReasoningEffort = "low";

export const AI_ENRICHMENT_PLAYGROUND_VERSION = "ai-playground-v1";

export const AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AiEnrichmentPlaygroundImageContentType =
  (typeof AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES)[number];

export const AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH = 8000;

export const AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER = "{{approved_categories}}";
export const AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER = "{{approved_tags}}";
export const AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER = "{{excluded_tags}}";
export const AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH = 8000;
/**
 * Only {{excluded_tags}} is required in the shipped v18 lean prompt. {{approved_categories}} and
 * {{approved_tags}} are no longer injected by the default template (approved taxonomy resolution
 * moved server-side), but the substitution helpers still support them so an owner-edited legacy
 * template that still contains those placeholders keeps working instead of breaking.
 */
export const AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS = [
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
] as const;

export function hasRequiredAiEnrichmentPromptPlaceholders(value: string): boolean {
  return AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS.every((placeholder) =>
    value.includes(placeholder),
  );
}

/**
 * Per-model pricing in USD per 1M tokens.
 * Used client-side only for cost estimates — not authoritative billing.
 */
export const VISION_MODEL_PRICING_USD_PER_1M: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash-lite": { input: 0.10, output: 0.40 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.50 },
  "gpt-5.4-nano-2026-03-17": { input: 1.10, output: 4.40 },
  "gpt-5.4-mini-2026-03-17": { input: 1.10, output: 4.40 },
};

export function estimateVisionCostUsd(
  modelId: string,
  promptTokens: number | null,
  completionTokens: number | null,
): number | null {
  const pricing = VISION_MODEL_PRICING_USD_PER_1M[modelId];
  if (!pricing || promptTokens === null || completionTokens === null) {
    return null;
  }
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}

export const DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE = `Analyze the provided image and return only valid JSON.

Return:
title: short natural searchable design title.
description: clear 1 to 2 sentence description of the design, including all readable text exactly as it appears, plus style, colors, and main visual elements.
category: one broad reusable category or theme for the design.
tags: up to 12 searchable tag candidates.

Rules:
Tags may be single words or short phrases because they will be matched against an internal tag database later.
Use accurate searchable words for visible subjects, themes, audience, style, occasion, text, recognizable characters, brands, franchises, or properties.
Do not use filler tags like image, design, artwork, graphic, shirt, print, png, or dtf.
If readable text appears, include all of it in the description.
If a recognizable character, brand, franchise, logo, team, show, movie, game, celebrity, or known property is clearly visible, name it directly. Only avoid naming it when genuinely uncertain.
Do not use these tag words: {{excluded_tags}}

Return exactly this JSON shape and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}`;
