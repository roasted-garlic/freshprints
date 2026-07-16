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

export interface ParsedEtsyMultiValueInput {
  selected: string[];
  draft: string;
}

export function parseEtsyMultiValueInput(value: string): ParsedEtsyMultiValueInput {
  const parts = value.split(',');
  if (parts.length === 1) {
    return { selected: [], draft: value.trimStart() };
  }
  return {
    selected: parts
      .slice(0, -1)
      .map((part) => part.trim())
      .filter(Boolean),
    draft: parts.at(-1)?.trimStart() ?? '',
  };
}

export function serializeEtsyMultiValueInput(selected: readonly string[], draft = ''): string {
  if (selected.length === 0) {
    return draft;
  }
  // Keep a trailing ", " so committed chips stay distinct from an in-progress draft.
  return `${selected.join(', ')}, ${draft}`;
}

export function listEtsyMultiValueInputValues(value: string): string[] {
  const { selected, draft } = parseEtsyMultiValueInput(value);
  const values = draft.trim() ? [...selected, draft.trim()] : selected;
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = normalizeSuggestKey(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function normalizeEtsyMultiValueInput(value: string): string {
  return listEtsyMultiValueInputValues(value).join(', ');
}

export function commitEtsyMultiValueDraft(current: string, maxItems: number): string {
  const { selected, draft } = parseEtsyMultiValueInput(current);
  const trimmedDraft = draft.trim();
  if (!trimmedDraft || selected.length >= maxItems) {
    return serializeEtsyMultiValueInput(selected);
  }
  const draftKey = normalizeSuggestKey(trimmedDraft);
  if (selected.some((value) => normalizeSuggestKey(value) === draftKey)) {
    return serializeEtsyMultiValueInput(selected);
  }
  return serializeEtsyMultiValueInput([...selected, trimmedDraft]);
}

export function applyEtsyMultiValueSuggestion(
  current: string,
  suggestionValue: string,
  maxItems: number,
): string {
  const { selected } = parseEtsyMultiValueInput(current);
  if (selected.length >= maxItems) {
    return serializeEtsyMultiValueInput(selected);
  }
  const suggestionKey = normalizeSuggestKey(suggestionValue);
  if (selected.some((value) => normalizeSuggestKey(value) === suggestionKey)) {
    return serializeEtsyMultiValueInput(selected);
  }
  return serializeEtsyMultiValueInput([...selected, suggestionValue.trim()]);
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
  const parsed = parseEtsyMultiValueInput(current);
  const draftKey = normalizeSuggestKey(parsed.draft);
  const shouldReplaceDraft =
    !draftKey || typedMatchesSuggestionFilter(draftKey, suggestion);
  const base = shouldReplaceDraft
    ? serializeEtsyMultiValueInput(parsed.selected)
    : commitEtsyMultiValueDraft(current, 3);
  return applyEtsyMultiValueSuggestion(base, suggestion.apiToken, 3).slice(
    0,
    ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH,
  );
}
