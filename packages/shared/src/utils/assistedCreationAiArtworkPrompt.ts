/**
 * Copy-only AI artwork prompt builders for Studio AI Context (no provider API).
 */

export const ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE =
  "Create the requested DTF apparel artwork from the JSON context below. Preserve all required wording and customer-specified details. Use a centered, balanced composition with crisp vector-style shapes, smooth curves, bold readable typography, and a limited high-contrast palette of flat, solid, clearly separated colors. Use a pure white background, with slightly off-white internal white elements when needed. Do not use gradients, transparency, blur, glow, realistic rendering, soft shading, blended colors, textures, distress, grunge, halftones, fuzzy edges, mockups, color-palette strips, color-count labels, text decorations, random decorations, or unrelated elements. Return only the finished artwork.";

export const ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE =
  "Use the attached reference images only as directed by the reference_images entries, preserving the requested layout, subject, proportions, wording, and overall vibe while cleaning and simplifying the artwork for vectorization.";

export function buildAssistedCreationAiArtworkPrompt(input: {
  hasReferenceImages: boolean;
}): string {
  if (!input.hasReferenceImages) {
    return ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE;
  }
  const firstPeriod = ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE.indexOf(". ");
  if (firstPeriod < 0) {
    return `${ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE} ${ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE}`;
  }
  const firstSentence = ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE.slice(0, firstPeriod + 1);
  const rest = ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE.slice(firstPeriod + 2);
  return `${firstSentence} ${ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE} ${rest}`;
}

/** Full paste payload: prompt + blank line + pretty-printed JSON profile. */
export function buildAssistedCreationFullAiInput(input: {
  hasReferenceImages: boolean;
  profile: unknown;
}): string {
  const prompt = buildAssistedCreationAiArtworkPrompt({
    hasReferenceImages: input.hasReferenceImages,
  });
  return `${prompt}\n\n${JSON.stringify(input.profile, null, 2)}`;
}
