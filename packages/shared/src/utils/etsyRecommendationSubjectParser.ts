import { ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH } from "../constants/etsyRecommendation/etsyRecommendation.constants";
import { getSuggestDictionaryPhraseIndex } from "../constants/etsyRecommendation/etsyRecommendationSuggestDictionary";

const SUBJECT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "have",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "so",
  "the",
  "to",
  "we",
  "who",
  "with",
  "you",
  "your",
  "design",
  "saying",
  "text",
  "phrase",
  "that",
  "this",
]);

export interface ParsedSubjectText {
  /** Distinctive subject tokens / short phrases for Open API. */
  subjectTokens: string[];
  /** Human-readable joined form. */
  previewLabel: string;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenWordCount(token: string): number {
  return token.split(" ").filter(Boolean).length;
}

/**
 * Parse free-text subject (max 80) into short Open API subject tokens.
 * Longest-match dictionary phrases first, then distinctive leftover words.
 */
export function parseEtsyRecommendationSubjectText(
  subjectText: string,
  maxTokens = 8,
): ParsedSubjectText {
  const trimmed = normalizeWhitespace(subjectText);
  if (!trimmed) {
    throw new Error("Describe what the design is of.");
  }
  if (trimmed.length > ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH) {
    throw new Error(
      `Subject must be ${ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH} characters or fewer.`,
    );
  }

  let remaining = ` ${normalizeForMatch(trimmed)} `;
  const subjectTokens: string[] = [];
  const seen = new Set<string>();
  let used = 0;

  const pushToken = (token: string) => {
    const normalized = normalizeWhitespace(token);
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    const count = tokenWordCount(normalized);
    if (used + count > maxTokens) {
      return;
    }
    seen.add(key);
    used += count;
    subjectTokens.push(normalized);
  };

  const phraseIndex = getSuggestDictionaryPhraseIndex();
  let matched = true;
  while (matched) {
    matched = false;
    for (const { phrase, entry } of phraseIndex) {
      if (!phrase) {
        continue;
      }
      const pattern = new RegExp(` ${escapeRegExp(phrase)} `, "i");
      if (!pattern.test(remaining)) {
        continue;
      }
      pushToken(entry.apiToken);
      remaining = remaining.replace(pattern, " ");
      remaining = ` ${normalizeForMatch(remaining)} `;
      matched = true;
      break;
    }
  }

  // Drop leftover words that are only incomplete prefixes of tokens we already matched
  // (e.g. typed "high" then "highland cow" → remaining "high").
  const matchedBlob = subjectTokens.join(" ").toLowerCase();
  for (const word of remaining.split(" ").filter(Boolean)) {
    const lower = word.toLowerCase();
    if (SUBJECT_STOP_WORDS.has(lower)) {
      continue;
    }
    if (
      matchedBlob.includes(lower) ||
      subjectTokens.some((token) => {
        const tokenLower = token.toLowerCase();
        return tokenLower.startsWith(lower) || lower.startsWith(tokenLower);
      })
    ) {
      continue;
    }
    pushToken(word);
  }

  if (subjectTokens.length === 0) {
    for (const word of normalizeForMatch(trimmed).split(" ").filter(Boolean)) {
      pushToken(word);
      if (subjectTokens.length >= Math.min(3, maxTokens)) {
        break;
      }
    }
  }

  if (subjectTokens.length === 0) {
    throw new Error("Describe what the design is of.");
  }

  return {
    subjectTokens,
    previewLabel: subjectTokens.join(" "),
  };
}
