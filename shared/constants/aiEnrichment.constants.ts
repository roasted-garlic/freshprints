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
export const AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS = [
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
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

export const DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE = `Analyze the provided image and return only valid JSON with these fields:
description: clear, accurate 1 to 2 sentence description of the design, including visible text, style, colors, and main visual elements.
category: you MUST pick exactly one category name from the approved category list below. If no category fits, return null. Never invent a category name.
title: short searchable design title.
tags: up to 8 approved tag names.
suggestedNewTags: array of new tag objects only when no approved tag name or alias is relevant enough.

Rules:
Use category descriptions to choose the best approved category. You MUST use a category name exactly as it appears in the approved category list. If none fit, return null for category. Never create or invent category names.
For each important visible element, theme, style, color, audience, occasion, recognizable property, or other meaningful search concept in the image, scan the full approved tag list, including every tag name, alias, and preferred-when description, before deciding no approved tag applies.
If a visible element matches an approved tag's name or any of its aliases, you MUST use the approved tag name in tags. A match on an alias counts as a full match.
Return approved tag names in tags, not aliases.
Only suggest a new tag when you have scanned the entire approved tag list and confirmed that no approved tag name or alias accurately covers that important element, theme, style, audience, occasion, or property.
Every suggestedNewTags item must include name, aliases, preferredWhen, and reason.
Do not use excluded tags.
Tags and suggested tag names must be single words, lowercase, reusable, non duplicated, and accurate.
Avoid overly narrow tags unless they are important to finding the design.

Text extraction rules:
You must inspect the entire image for readable text before writing the description.
If any readable text appears anywhere in the image, include all of the readable text in the description exactly as it appears, preserving wording, spelling, and punctuation as closely as possible.
Do not summarize, shorten, paraphrase, or omit visible text.
If the image has multiple separate text elements, include all of them.
If some text is partially obscured or unclear, include the readable portion and briefly note that part of the text is unclear.
If no readable text is present, describe the design normally without inventing text.

Description rules:
The description must describe both the design itself and any readable text found in the image.
When text is present, include the exact visible text naturally within the description.
Make the description specific enough that a human could understand both what the artwork looks like and what words appear in it.

Recognizable IP rules:
If the image clearly depicts a recognizable character, brand, logo, franchise, sports team, movie, show, game, musician, celebrity reference, or other known property, name it directly in the description and use it in the title when useful for search.
Do not replace a recognizable character or brand with a vague phrase like "goth girl", "cartoon character", "famous brand", or "spooky girl" when the specific identity is visually clear.
If the approved tag list contains a matching tag name or alias for the character, brand, franchise, or property, use the approved tag name.
If no approved tag name or alias exists, suggest a new single word reusable tag for the recognizable character, brand, or property.
Only avoid naming the identity when it is genuinely uncertain. If uncertain, describe the visual style without guessing.

Return exactly this JSON shape:
{"description":"...","category":"...","title":"...","tags":["approved_tag"],"suggestedNewTags":[{"name":"newtag","aliases":["alias"],"preferredWhen":"Use when ...","reason":"Why approved tags were not enough."}]}

Approved categories:
{{approved_categories}}

Approved tags:
{{approved_tags}}

Excluded tags:
{{excluded_tags}}`;
