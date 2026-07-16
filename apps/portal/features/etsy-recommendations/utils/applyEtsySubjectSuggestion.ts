import { ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH } from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants';
import type { EtsyRecommendationSuggestEntry } from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestDictionary';

function normalizeSuggestKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function suggestionPhrases(suggestion: EtsyRecommendationSuggestEntry): string[] {
  return [suggestion.apiToken, suggestion.label, ...(suggestion.aliases ?? [])]
    .map(normalizeSuggestKey)
    .filter(Boolean);
}

function suggestionWords(suggestion: EtsyRecommendationSuggestEntry): string[] {
  const words = new Set<string>();
  for (const phrase of suggestionPhrases(suggestion)) {
    for (const word of phrase.split(' ').filter(Boolean)) {
      words.add(word);
    }
  }
  return [...words];
}

/** True when typed filter is clearly refining this suggestion (prefix of phrase or any word). */
function typedMatchesSuggestionFilter(typed: string, suggestion: EtsyRecommendationSuggestEntry): boolean {
  if (!typed) {
    return false;
  }
  const phrases = suggestionPhrases(suggestion);
  if (phrases.some((phrase) => phrase.startsWith(typed) || typed.startsWith(phrase))) {
    return true;
  }
  // "q" → harley quinn (matches word "quinn"); "har" → harley
  return suggestionWords(suggestion).some(
    (word) => word.startsWith(typed) || typed.startsWith(word),
  );
}

/**
 * Apply a suggestion pick: replace incomplete typed filter with the suggestion,
 * or append as a second subject when the field already has a complete different term.
 */
export function applyEtsySubjectSuggestion(
  current: string,
  suggestion: EtsyRecommendationSuggestEntry,
): string {
  const token = suggestion.apiToken;
  const trimmed = current.trim();
  if (!trimmed) {
    return token.slice(0, ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH);
  }

  const currentKey = normalizeSuggestKey(trimmed);
  const tokenKey = normalizeSuggestKey(token);
  if (currentKey === tokenKey || currentKey.includes(tokenKey)) {
    return token.slice(0, ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH);
  }

  // Whole field is still a filter for this pick (including single letters like "q").
  if (typedMatchesSuggestionFilter(currentKey, suggestion)) {
    return token.slice(0, ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH);
  }

  // Trailing word(s) are an incomplete filter for this pick — replace only that tail.
  const words = trimmed.split(/\s+/);
  for (let take = Math.min(words.length, 4); take >= 1; take -= 1) {
    const trailing = normalizeSuggestKey(words.slice(-take).join(' '));
    if (trailing && typedMatchesSuggestionFilter(trailing, suggestion)) {
      const prefix = words.slice(0, -take).join(' ').trim();
      const next = prefix ? `${prefix} ${token}` : token;
      return next.slice(0, ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH);
    }
  }

  // Distinct second subject (e.g. "grinch" + pick "christmas").
  return `${trimmed} ${token}`.slice(0, ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH);
}
