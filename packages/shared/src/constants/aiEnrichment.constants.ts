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
 * Controls the optional AI-authored suggested-tag quality call, independent of tagRerankMode.
 * Suggestions only fire when `suggestedNewTagsPolicy` allows them — this setting only controls
 * whether an AI call authors preferredWhen/aliases when that happens, or the server template is
 * used instead. "auto" and "always" behave identically (no separate trigger beyond the policy gate).
 */
export const SUGGESTION_AUTHOR_MODES = ["off", "auto", "always"] as const;

export type SuggestionAuthorMode = (typeof SUGGESTION_AUTHOR_MODES)[number];

export const DEFAULT_SUGGESTION_AUTHOR_MODE: SuggestionAuthorMode = "off";

/**
 * Controls when Suggested New Tags may be emitted after approved-tag matching.
 * Independent of suggestionAuthorMode (which only upgrades preferredWhen/aliases quality)
 * and tagRerankMode. "balanced" is the shipped default — slightly looser than the original
 * hardcoded last-resort gate, with a hard cap of 3 suggestions per design.
 */
export const SUGGESTED_NEW_TAGS_POLICIES = [
  "off",
  "strict",
  "balanced",
  "generous",
  "always",
] as const;

export type SuggestedNewTagsPolicy = (typeof SUGGESTED_NEW_TAGS_POLICIES)[number];

export const DEFAULT_SUGGESTED_NEW_TAGS_POLICY: SuggestedNewTagsPolicy = "balanced";

/** Hard cap on suggested-new-tag count per design for each policy. */
export const SUGGESTED_NEW_TAGS_POLICY_MAX_SUGGESTIONS: Record<SuggestedNewTagsPolicy, number> = {
  off: 0,
  strict: 5,
  balanced: 3,
  generous: 5,
  always: 5,
};

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
 * {{excluded_tags}} and {{approved_category_names}} are required in the shipped v21 prompt.
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
 * Whitespace + typography normalize for comparing saved Studio prompts to shipped defaults.
 * Word processors / chat paste often turn `'` into U+2019 and add a trailing newline; those
 * must not look like a custom prompt or keep Save enabled after "Use current default".
 */
function normalizePromptForDefaultComparison(value: string): string {
  return value
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export const DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE = `You catalog DTF transfer art for apparel. Choose title, category, and tags by the design's main message, subject, buyer intent, occasion, role, or theme — not style alone. Decorative fonts, colors, distressing, stars, lines, sparkles, emojis, borders, and accents count only when truly central.

Analyze the image and return only valid JSON.

Return:
title: a searchable catalog title following the title rules below.
description: 1 to 2 sentences with all readable text exactly as shown, plus the main visuals, style, and colors.
category: the best approved category, copied exactly. Use another name only if none genuinely fit.
tags: up to 12 searchable tag candidates.
readableTextLines: array of every distinct readable text line or phrase in natural reading order; use [] when there is no readable text.
centralSubject: one short literal noun phrase for the main non-text subject when useful; otherwise "".

Approved categories:
{{approved_category_names}}

Title rules:
- First identify all readable text exactly as shown and put each line in readableTextLines.
- Build the title from readableTextLines in reading order, then optionally append centralSubject.
- Form the description with the same readable wording — description and title must agree on that wording.
- If the design is all text or text-dominant, the title must be the complete readable phrase in natural reading order, not only the largest or first line.
- Keep contractions intact (I'm, Don't, Can't, We're, It's, and curly-apostrophe forms).
- If the design has readable text plus one meaningful person, animal, object, place, character, or scene, set centralSubject to one short literal noun phrase for that visual and include it in the title after the readable wording.
- Only add that subject when the non-text visual is clearly important, not merely decorative (stars, sparkles, lines, bows, polka dots, arrows, hearts, speech bubbles, flourishes, outlines, shadows).
- Never copy a description sentence as the title. Never begin the title with phrases like "The design features", "The image shows", "The artwork depicts", "An illustration of", or similar prose openings.
- Never use colors, fonts, outlines, placement, or styling language in the title unless those words are visibly printed.
- If there is no readable text, write a literal 5 to 7 word title describing the image and leave readableTextLines as [].
- Never build the title from style words, mood words, category words, or inferred tag words.
- Do not use words like funny, sarcastic, attitude, quote, retro, distressed, typography, text, statement, or design in the title unless they are actually part of the visible wording.

Tag rules:
- Tags may be words or short phrases because the server will match them later.
- Use accurate terms for subjects, themes, audience, occasion, style, text, recognizable characters, brands, franchises, or properties.
- Include style tags only when visually important and searchable.
- Use halftone only for clear dot-screen shading, gradients, or texture, not normal noise or compression.
- No filler tags: image, design, artwork, graphic, shirt, print, png, dtf.
- Name recognizable characters, brands, logos, teams, shows, movies, games, celebrities, or known properties when clear.
- Do not tag halloween for skeleton, skull, or bones alone — require additional Halloween cues.
- Do not use these tag words: {{excluded_tags}}

Return exactly this JSON and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"],"readableTextLines":["..."],"centralSubject":"..."}`;

/**
 * v25 shipped default (completeness / contraction clarifications; pre description-leakage harden).
 * Saved Studio Settings copies of this text auto-upgrade to {@link DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE}
 * via {@link isPreviousDefaultAiEnrichmentPromptTemplate}.
 */
export const PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V25 = `You catalog DTF transfer art for apparel. Choose title, category, and tags by the design's main message, subject, buyer intent, occasion, role, or theme — not style alone. Decorative fonts, colors, distressing, stars, lines, sparkles, emojis, borders, and accents count only when truly central.

Analyze the image and return only valid JSON.

Return:
title: a searchable title following the title rules below.
description: 1 to 2 sentences with all readable text exactly as shown, plus the main visuals, style, and colors.
category: the best approved category, copied exactly. Use another name only if none genuinely fit.
tags: up to 12 searchable tag candidates.

Approved categories:
{{approved_category_names}}

Title rules:
- First identify all readable text exactly as shown.
- Form the description first, then derive the title from that same readable wording — description and title must agree.
- If the design is all text or text-dominant, the title must be the complete readable phrase in natural reading order, not only the largest or first line.
- Keep contractions intact (I'm, Don't, Can't, We're, It's, and curly-apostrophe forms).
- If the design has readable text plus one meaningful person, animal, object, place, character, or scene, use the readable text plus one short literal noun for that visual.
- Only add that extra noun when the non-text visual is clearly important to the design, not merely decorative (stars, sparkles, lines, arrows, hearts, speech bubbles, bandages, flourishes).
- If there is no readable text, write a literal 5 to 7 word title describing the image.
- Never build the title from style words, mood words, category words, or inferred tag words.
- Do not use words like funny, sarcastic, attitude, quote, retro, distressed, typography, text, statement, or design in the title unless they are actually part of the visible wording.

Tag rules:
- Tags may be words or short phrases because the server will match them later.
- Use accurate terms for subjects, themes, audience, occasion, style, text, recognizable characters, brands, franchises, or properties.
- Include style tags only when visually important and searchable.
- Use halftone only for clear dot-screen shading, gradients, or texture, not normal noise or compression.
- No filler tags: image, design, artwork, graphic, shirt, print, png, dtf.
- Name recognizable characters, brands, logos, teams, shows, movies, games, celebrities, or known properties when clear.
- Do not tag halloween for skeleton, skull, or bones alone — require additional Halloween cues.
- Do not use these tag words: {{excluded_tags}}

Return exactly this JSON and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}`;

/**
 * v24 shipped default (description-first title rules; pre-completeness / contraction clarifications).
 * Saved Studio Settings copies of this text auto-upgrade to {@link DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE}
 * via {@link isPreviousDefaultAiEnrichmentPromptTemplate}.
 */
export const PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V24 = `You catalog DTF transfer art for apparel. Choose title, category, and tags by the design's main message, subject, buyer intent, occasion, role, or theme — not style alone. Decorative fonts, colors, distressing, stars, lines, sparkles, emojis, borders, and accents count only when truly central.

Analyze the image and return only valid JSON.

Return:
title: a short searchable title.
description: 1 to 2 sentences with all readable text exactly as shown, plus the main visuals, style, and colors.
category: the best approved category, copied exactly. Use another name only if none genuinely fit.
tags: up to 12 searchable tag candidates.

Approved categories:
{{approved_category_names}}

Title rules:
- First identify all readable text exactly as shown.
- First form the description mentally, then derive the title from that same content.
- If the design is all text or text-dominant, the title must be the full readable text in natural reading order.
- If the design has readable text plus one meaningful person, animal, object, place, character, or scene, use the readable text plus one short literal noun for that visual.
- Only add that extra noun when the non-text visual is clearly important to the design, not merely decorative.
- If there is no readable text, write a literal 5 to 7 word title describing the image.
- Never build the title from style words, mood words, category words, or inferred tag words.
- Do not use words like funny, sarcastic, attitude, quote, retro, distressed, typography, text, statement, or design in the title unless they are actually part of the visible wording.

Tag rules:
- Tags may be words or short phrases because the server will match them later.
- Use accurate terms for subjects, themes, audience, occasion, style, text, recognizable characters, brands, franchises, or properties.
- Include style tags only when visually important and searchable.
- Use halftone only for clear dot-screen shading, gradients, or texture, not normal noise or compression.
- No filler tags: image, design, artwork, graphic, shirt, print, png, dtf.
- Name recognizable characters, brands, logos, teams, shows, movies, games, celebrities, or known properties when clear.
- Do not tag halloween for skeleton, skull, or bones alone — require additional Halloween cues.
- Do not use these tag words: {{excluded_tags}}

Return exactly this JSON and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}`;

/**
 * v23 shipped default (numbered title rules + examples). Saved Studio Settings copies of this
 * text auto-upgrade to {@link DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE} via
 * {@link isPreviousDefaultAiEnrichmentPromptTemplate}.
 */
export const PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23 = `You catalog DTF transfer art for apparel. Identify the design's visible wording, main subject, message, buyer intent, occasion, role, and theme. Do not treat fonts, colors, distressing, decorative icons, or background accents as the main subject unless they are genuinely central.

Analyze the image and return only valid JSON.

Return:
title: a searchable title following the title rules below.
description: 1 to 2 sentences containing all readable text exactly as shown, followed by the main visuals, style, and colors.
category: the best approved category, copied exactly. Use another category name only when none genuinely fit.
tags: up to 12 accurate searchable tag candidates.

Approved categories:
{{approved_category_names}}

Title rules:
1. If the design is text-only or text-dominant, use all readable text as the title in natural reading order.
2. Do not summarize, shorten, rewrite, correct, or add keywords to visible wording.
3. Decorative stars, lines, borders, emojis, faces, flourishes, and typography effects do not make a design mixed-content.
4. If readable text is combined with a meaningful person, animal, object, place, character, or scene, use the readable text followed by one concise word naming the dominant visual.
5. Use only a concrete visual word such as Cow, Skeleton, Teacher, Truck, Beach, or Santa. Do not append tag-like words such as funny, sarcastic, quote, attitude, typography, distressed, or text.
6. If there is no readable text, describe the main visual literally in about 5 to 7 words.
7. Never build the title by combining inferred tags.

Title examples:
- Text-only: "Kinda Give A Damn Kinda Don't Care"
- Text with a prominent cow: "Just A Little Moody Cow"
- No text: "Floral Highland Cow Wearing Leopard Bow"

Tag rules:
- Tags may be words or short phrases because the server will match them later.
- Use terms for the subject, theme, audience, occasion, style, recognizable property, and buyer intent.
- Include style tags only when visually important and searchable.
- Use halftone only for clear dot-screen shading, gradients, or texture, not ordinary noise or compression.
- Do not use filler tags: image, design, artwork, graphic, shirt, print, png, dtf.
- Name recognizable characters, brands, logos, teams, shows, movies, games, celebrities, or properties when clear.
- Do not tag halloween for a skeleton, skull, or bones alone. Require additional Halloween cues such as a jack-o'-lantern, witch, haunted house, candy corn, visible Halloween wording, or a clear holiday scene.
- Do not use these tag words: {{excluded_tags}}

Return exactly this JSON and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}`;

/** Pre-title-rules shipped default (halloween guard + halftone, short title field, no title rules block). */
export const PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES = `You catalog DTF transfer art for apparel. Choose title, category, and tags by the design's core subject, message, joke, buyer intent, occasion, role, or theme, not style alone. Fonts, colors, lashes, heels, school items, crosses, or other decorative elements only count when truly central.

Analyze the image and return only valid JSON.

Return:
title: short searchable title.
description: 1 to 2 sentences with all readable text exactly as shown, plus style, colors, and main visuals.
category: best approved category, copied exactly. Use another name only if none genuinely fit.
tags: up to 12 searchable tag candidates.

Approved categories:
{{approved_category_names}}

Rules:
Tags may be words or short phrases because the server will match them later.
Use accurate terms for subjects, themes, audience, occasion, style, text, recognizable characters, brands, franchises, or properties.
Include style tags when visually important and searchable. Use halftone only for clear dot-screen shading, gradients, or texture, not normal noise or compression.
No filler tags: image, design, artwork, graphic, shirt, print, png, dtf.
Name recognizable characters, brands, logos, teams, shows, movies, games, celebrities, or known properties when clear.
Do not tag halloween for skeleton, skull, or bones alone — require additional Halloween cues (jack-o'-lantern, witches, haunted house, visible "Halloween" text, candy corn, or a clear Halloween holiday motif with other holiday cues). Do not over-block designs that are clearly Halloween.
Do not use these tag words: {{excluded_tags}}

Return exactly this JSON and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}`;

/** Pre-halloween-guard shipped default (halftone guidance, no skeleton≠Halloween rule). */
export const PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_HALLOWEEN_GUARD = `You catalog DTF transfer art for apparel. Choose title, category, and tags by the design's core subject, message, joke, buyer intent, occasion, role, or theme, not style alone. Fonts, colors, lashes, heels, school items, crosses, or other decorative elements only count when truly central.

Analyze the image and return only valid JSON.

Return:
title: short searchable title.
description: 1 to 2 sentences with all readable text exactly as shown, plus style, colors, and main visuals.
category: best approved category, copied exactly. Use another name only if none genuinely fit.
tags: up to 12 searchable tag candidates.

Approved categories:
{{approved_category_names}}

Rules:
Tags may be words or short phrases because the server will match them later.
Use accurate terms for subjects, themes, audience, occasion, style, text, recognizable characters, brands, franchises, or properties.
Include style tags when visually important and searchable. Use halftone only for clear dot-screen shading, gradients, or texture, not normal noise or compression.
No filler tags: image, design, artwork, graphic, shirt, print, png, dtf.
Name recognizable characters, brands, logos, teams, shows, movies, games, celebrities, or known properties when clear.
Do not use these tag words: {{excluded_tags}}

Return exactly this JSON and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}`;

/** Pre-halftone-guidance shipped default (business-context v21/v22 wording). */
export const PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21 = `You catalog DTF transfer art for apparel. Choose title, category, and tags by the design's core subject, message, joke, buyer intent, occasion, role, or theme, not style alone. Fonts, colors, lashes, heels, school items, crosses, or other decorative elements only count when truly central.

Analyze the image and return only valid JSON.

Return:
title: short searchable title.
description: 1 to 2 sentences with all readable text exactly as shown, plus style, colors, and main visuals.
category: best approved category, copied exactly. Use another name only if none genuinely fit.
tags: up to 12 searchable tag candidates.

Approved categories:
{{approved_category_names}}

Rules:
Tags may be words or short phrases because the server will match them later.
Use accurate terms for subjects, themes, audience, occasion, style, text, recognizable characters, brands, franchises, or properties.
No filler tags: image, design, artwork, graphic, shirt, print, png, dtf.
Name recognizable characters, brands, logos, teams, shows, movies, games, celebrities, or known properties when clear.
Do not use these tag words: {{excluded_tags}}

Return exactly this JSON and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}`;

export const PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20 = `Analyze the provided image and return only valid JSON.

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

export function isPreviousDefaultAiEnrichmentPromptTemplate(value: string): boolean {
  const normalized = normalizePromptForDefaultComparison(value);
  return (
    normalized ===
      normalizePromptForDefaultComparison(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20) ||
    normalized ===
      normalizePromptForDefaultComparison(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21) ||
    normalized ===
      normalizePromptForDefaultComparison(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_HALLOWEEN_GUARD,
      ) ||
    normalized ===
      normalizePromptForDefaultComparison(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES,
      ) ||
    normalized ===
      normalizePromptForDefaultComparison(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23) ||
    normalized ===
      normalizePromptForDefaultComparison(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V24) ||
    normalized ===
      normalizePromptForDefaultComparison(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V25)
  );
}

/** True when value matches the shipped default after whitespace/smart-quote normalization. */
export function isDefaultAiEnrichmentPromptTemplate(value: string): boolean {
  return (
    normalizePromptForDefaultComparison(value) ===
    normalizePromptForDefaultComparison(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE)
  );
}

export function resolveAiEnrichmentPromptTemplate(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;
  }

  const trimmed = raw.trim();

  if (
    !trimmed ||
    trimmed.length > AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH ||
    !hasRequiredAiEnrichmentPromptPlaceholders(trimmed) ||
    isPreviousDefaultAiEnrichmentPromptTemplate(trimmed) ||
    isDefaultAiEnrichmentPromptTemplate(trimmed)
  ) {
    return DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;
  }

  return trimmed;
}

export const AI_ENRICHMENT_TAG_RERANK_PROMPT_TEMPLATE_MAX_LENGTH = 4000;

/**
 * Owner-editable instructional portion of the tag reranker's second-call prompt. The structural
 * data sections — previous image analysis, resolved category, approved tag candidates JSON, task
 * line, and required response JSON shape — are always appended by
 * buildCatalogTagRerankUserPrompt and are never part of this template, since they carry
 * server-injected data that must always be present for the reranker to function. Only the "Rules"
 * guidance below is templated, mirroring how DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE keeps its JSON
 * contract fixed and its instructional wording editable.
 */
export const DEFAULT_TAG_RERANK_PROMPT_TEMPLATE = `Return only tag names that appear in approvedTagCandidates.
Do not invent final tags.
Do not use aliases unless the alias is also an approved tag name.
Choose tags that best help staff find this design later.
Prioritize buyer intent, main subject, audience, occasion, recognizable property, visible text theme, and searchable design theme.
Do not over-prioritize colors, decorative accents, or minor background elements unless they are important to finding the design.
Some approved tag candidates are only weakly related — their reason says something like "shares a token with this approved tag." Only choose one of these if it genuinely describes the design; reject it if the shared word is incidental (e.g. a candidate tag "ghostrider" surfaced from the word "ghost" does not belong on a design that is simply a ghost character).
Avoid duplicate or near-duplicate tags.
Use fewer than 8 tags if fewer are truly useful.
If an important concept from the previous image analysis is not covered by the approved candidates, put it in uncoveredConcepts.`;

function normalizeTagRerankPromptForDefaultComparison(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function isDefaultTagRerankPromptTemplate(value: string): boolean {
  return (
    normalizeTagRerankPromptForDefaultComparison(value) ===
    normalizeTagRerankPromptForDefaultComparison(DEFAULT_TAG_RERANK_PROMPT_TEMPLATE)
  );
}

export function resolveTagRerankPromptTemplate(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_TAG_RERANK_PROMPT_TEMPLATE;
  }

  const trimmed = raw.trim();

  if (!trimmed || trimmed.length > AI_ENRICHMENT_TAG_RERANK_PROMPT_TEMPLATE_MAX_LENGTH) {
    return DEFAULT_TAG_RERANK_PROMPT_TEMPLATE;
  }

  return trimmed;
}
