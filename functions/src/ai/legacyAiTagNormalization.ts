import { filterExcludedAiTags, mergeTagExclusions } from "./aiTagExclusions";

/**
 * Compatibility-only implementation for historical AI tag data.
 * Active Pass 1 does not call this module and no new tag fields are persisted.
 */

const MAX_AI_TAG_LENGTH = 40;
const TAG_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but",
  "by", "for", "from", "he", "her", "him", "his", "i", "if", "im", "in",
  "is", "it", "its", "me", "my", "not", "of", "on", "or", "our", "she",
  "so", "that", "the", "their", "them", "they", "this", "to", "was", "we",
  "were", "with", "you", "your",
]);

/** @deprecated Compatibility-only normalization for historical AI tag data. */
export function tokenizeTagCandidate(value: string): string[] {
  const normalized = value.toLowerCase().replace(/[\u0027’]/g, " ").trim();
  return normalized
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length > 1 &&
        token.length <= MAX_AI_TAG_LENGTH &&
        !TAG_STOPWORDS.has(token),
    );
}

const GENERIC_CATALOG_TAGS = new Set([
  "shirt", "tshirt", "tee", "design", "print", "png", "dtf", "transfer",
  "image", "artwork", "graphic", "background", "canvas", "quote", "saying",
  "slogan", "typography", "lettering", "text", "words", "word", "label",
  "font", "type", "caption",
]);

/** @deprecated Compatibility-only normalization for historical AI tag data. */
export function normalizeAiTags(
  value: unknown,
  _visibleText?: string[],
  maxTags = 20,
  exclusions: readonly string[] = mergeTagExclusions(),
): string[] {
  const normalizedTags: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        normalizedTags.push(...tokenizeTagCandidate(item));
      }
    }
  }
  const deduped = [...new Set(normalizedTags)].filter(
    (tag) => !GENERIC_CATALOG_TAGS.has(tag),
  );
  return filterExcludedAiTags(deduped, exclusions).slice(0, maxTags);
}
