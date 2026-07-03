export const GEMINI_VISION_MODEL_IDS = [
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
] as const;

export type GeminiVisionModelId = (typeof GEMINI_VISION_MODEL_IDS)[number];

export const ALLOWED_VISION_MODEL_IDS = [...GEMINI_VISION_MODEL_IDS] as const;

export type AllowedVisionModelId = (typeof ALLOWED_VISION_MODEL_IDS)[number];

export const DEFAULT_VISION_MODEL_ID: AllowedVisionModelId = "gemini-2.5-flash-lite";

/**
 * Controls the optional text-only Gemini tag reranker second call. "off" (shipped default) never
 * runs the second call. "auto" runs it only when the server-side tag matcher shows signs of
 * ambiguity (see shouldRunTagRerank in aiEnrichmentPipeline.ts) — the recommended mode once
 * Playground-based comparisons validate quality/cost. "always" runs it on every design and is
 * intended as a temporary comparison/testing mode, not a standing production setting.
 */
export const TAG_RERANK_MODES = ["off", "auto", "always"] as const;

export type TagRerankMode = (typeof TAG_RERANK_MODES)[number];

export const DEFAULT_TAG_RERANK_MODE: TagRerankMode = "off";

/**
 * Controls the optional AI-authored suggested-tag quality call, independent of tagRerankMode
 * (see docs/workflow/plans/2026-07-02-suggested-tags-last-resort-plan.md §4.5). Suggestions only
 * ever fire when the server-side last-resort gate decides coverage is thin (see
 * isSuggestedTagsLastResort in catalogTagResolver.ts) — this setting only controls whether an AI
 * call authors their preferredWhen/aliases when that happens, or the server template is used
 * instead. "auto" and "always" behave identically here since there is no separate trigger beyond
 * the last-resort gate itself (unlike tagRerankMode's "auto", which has its own trigger heuristic).
 */
export const SUGGESTION_AUTHOR_MODES = ["off", "auto", "always"] as const;

export type SuggestionAuthorMode = (typeof SUGGESTION_AUTHOR_MODES)[number];

export const DEFAULT_SUGGESTION_AUTHOR_MODE: SuggestionAuthorMode = "off";

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
export const AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER = "{{approved_category_names}}";
export const AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER = "{{approved_tags}}";
export const AI_ENRICHMENT_APPROVED_TAG_NAMES_PLACEHOLDER = "{{approved_tag_names}}";
export const AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER = "{{excluded_tags}}";
export const AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH = 8000;
/**
 * {{excluded_tags}} and {{approved_category_names}} are required in the shipped v20 prompt.
 * {{approved_categories}} (with descriptions) and {{approved_tags}}/{{approved_tag_names}} are not
 * injected by the default template — full tag-name injection measured ~4.4x the per-image cost of
 * category names alone (see ADR-FP-041) and stays gated behind an accuracy test. The substitution
 * helpers still support all placeholders so an owner-edited legacy template keeps working.
 */
export const AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS = [
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
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
category: the single best-fitting category name from this approved list, copied exactly as written. Only return a name that is not on the list if none of them genuinely fit.
tags: up to 12 searchable tag candidates.

Approved categories:
{{approved_category_names}}

Rules:
Tags may be single words or short phrases because they will be matched against an internal tag database later.
Use accurate searchable words for visible subjects, themes, audience, style, occasion, text, recognizable characters, brands, franchises, or properties.
Do not use filler tags like image, design, artwork, graphic, shirt, print, png, or dtf.
If readable text appears, include all of it in the description.
If a recognizable character, brand, franchise, logo, team, show, movie, game, celebrity, or known property is clearly visible, name it directly. Only avoid naming it when genuinely uncertain.
Do not use these tag words: {{excluded_tags}}

Return exactly this JSON shape and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}`;
