/**
 * AI-path visible-text / catalog-copy quality helpers.
 * Conservative: drop transcription noise; keep short intentional wording.
 * Do not call from staff `normalizeSmartProfileDimensions`.
 */

const FILL_IN_BLANK = /\b\w+\s+_{2,}|_{2,}\s+\w+/;
const REPEATED_UNDERSCORES = /_{2,}/;
const MUSIC_PAREN_DIRECTION = /\((?:freely|ad lib|adlib|rubato|optional|nc)[^)]*\)/i;
const NO_CHORD = /\bN\.C\.\b|\bN\.C\b/i;
const LEADING_PAGE_NUMBER = /^\d{1,3}(?:\s+|$)/;
const SCRIPTURE = /^(?:[1-3]\s+)?[A-Za-z][A-Za-z.]{1,20}\s+\d{1,3}:\d{1,3}$/;
const CLASS_OF = /^class of \d{2,4}$/i;
const ROUTE_NUM = /^route\s+\d{1,4}$/i;
const USA_YEAR = /^usa\s+\d{4}$/i;
const FOUR_DIGIT_YEAR = /^(?:19|20)\d{2}$/;
const ISOLATED_PAGE_OR_MEASURE = /^\d{1,3}$/;
const ISOLATED_CHORD =
  /^(?:N\.C\.?|[A-G](?:#|b)?(?:maj|min|m|dim|aug|sus|add)?[0-9]{0,2})$/;

const ALLOWED_PUNCT = new Set(["'", "’", "&", ".", ",", ":", "-", "–", "—", "!", "?"]);

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function letterLength(token: string): number {
  return token.replace(/[^A-Za-z]/g, "").length;
}

function symbolRatio(phrase: string): number {
  const compact = phrase.replace(/\s+/g, "");
  if (!compact.length) {
    return 0;
  }
  let symbols = 0;
  for (const char of compact) {
    if (/[A-Za-z0-9]/.test(char) || ALLOWED_PUNCT.has(char)) {
      continue;
    }
    symbols += 1;
  }
  return symbols / compact.length;
}

function wordTokens(phrase: string): string[] {
  return collapseWhitespace(phrase).split(" ").filter(Boolean);
}

export function looksLikeMeaningfulPrimaryText(phrase: string): boolean {
  const trimmed = collapseWhitespace(phrase);
  if (!trimmed) {
    return false;
  }
  if (CLASS_OF.test(trimmed) || SCRIPTURE.test(trimmed) || ROUTE_NUM.test(trimmed) || USA_YEAR.test(trimmed)) {
    return true;
  }
  if (FOUR_DIGIT_YEAR.test(trimmed)) {
    return true;
  }
  if (ISOLATED_PAGE_OR_MEASURE.test(trimmed) || ISOLATED_CHORD.test(trimmed)) {
    return false;
  }
  if (looksLikeTranscriptionNoise(trimmed)) {
    return false;
  }
  const words = wordTokens(trimmed);
  if (words.length === 0 || words.length > 16) {
    return false;
  }
  if (symbolRatio(trimmed) > 0.2) {
    return false;
  }
  return true;
}

export function looksLikeTranscriptionNoise(phrase: string): boolean {
  const trimmed = collapseWhitespace(phrase);
  if (!trimmed) {
    return false;
  }
  if (CLASS_OF.test(trimmed) || SCRIPTURE.test(trimmed) || ROUTE_NUM.test(trimmed) || USA_YEAR.test(trimmed)) {
    return false;
  }
  if (REPEATED_UNDERSCORES.test(trimmed) || FILL_IN_BLANK.test(trimmed)) {
    return true;
  }
  if (ISOLATED_PAGE_OR_MEASURE.test(trimmed) || ISOLATED_CHORD.test(trimmed)) {
    return true;
  }
  if (symbolRatio(trimmed) >= 0.28) {
    return true;
  }
  const words = wordTokens(trimmed);
  if (words.length >= 6) {
    const shortTokens = words.filter((token) => letterLength(token) <= 2);
    if (shortTokens.length / words.length >= 0.5) {
      return true;
    }
  }
  const stopWords = words.filter((token) =>
    /^(?:the|and|to|of|a|after|from|who|said|that|have|for|in|on|with|was|were)$/i.test(token),
  );
  if (words.length >= 16 && stopWords.length >= 4) {
    return true;
  }
  if (words.length >= 24) {
    return true;
  }
  const hasMusicDumpCue =
    MUSIC_PAREN_DIRECTION.test(trimmed) ||
    NO_CHORD.test(trimmed) ||
    LEADING_PAGE_NUMBER.test(trimmed);
  if (hasMusicDumpCue && words.length >= 4) {
    return true;
  }
  if (words.length >= 18 && (hasMusicDumpCue || /[|]/.test(trimmed))) {
    return true;
  }
  return false;
}

export function looksLikeOcrDumpTitle(title: string | undefined): boolean {
  const trimmed = collapseWhitespace(title ?? "");
  if (!trimmed) {
    return false;
  }
  if (looksLikeTranscriptionNoise(trimmed)) {
    return true;
  }
  const words = wordTokens(trimmed);
  if (LEADING_PAGE_NUMBER.test(trimmed) && words.length >= 5) {
    return true;
  }
  if (NO_CHORD.test(trimmed) || MUSIC_PAREN_DIRECTION.test(trimmed)) {
    return true;
  }
  if (words.length >= 10 && /\bif\b/i.test(trimmed) && /\bwould\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

function stripDumpDecorations(segment: string): string {
  return collapseWhitespace(
    segment
      .replace(MUSIC_PAREN_DIRECTION, " ")
      .replace(/\bN\.C\.\b|\bN\.C\b/gi, " ")
      .replace(/\bNC\b/g, " ")
      .replace(REPEATED_UNDERSCORES, " ")
      .replace(/\bif\s+would\b[\s\S]*$/i, " ")
      .replace(/^\d{1,3}\s+/, " ")
      .replace(/^[.\-|]+|[.\-|]+$/g, " "),
  );
}

function extractPhrasesFromNoisyLine(phrase: string): string[] {
  const segments = collapseWhitespace(phrase)
    .split(/\s+[–—|-]\s+|\s+\/\s+/)
    .map((segment) => stripDumpDecorations(segment))
    .filter(Boolean);

  const extracted: string[] = [];
  for (const segment of segments) {
    if (!looksLikeTranscriptionNoise(segment) && looksLikeMeaningfulPrimaryText(segment)) {
      extracted.push(segment);
      continue;
    }
    const cleaned = stripDumpDecorations(segment);
    if (cleaned && !looksLikeTranscriptionNoise(cleaned) && looksLikeMeaningfulPrimaryText(cleaned)) {
      extracted.push(cleaned);
    }
  }
  return extracted;
}

function isRedundantJoin(candidate: string, kept: readonly string[]): boolean {
  const comparable = collapseWhitespace(candidate).toLowerCase();
  if (kept.length < 2) {
    return false;
  }
  const joined = kept.map((item) => item.toLowerCase()).join(" ");
  return comparable === joined || comparable === [...kept].reverse().map((item) => item.toLowerCase()).join(" ");
}

function dropContainedNoisySupersets(phrases: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const phrase of phrases) {
    const key = phrase.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    if (isRedundantJoin(phrase, unique)) {
      continue;
    }
    seen.add(key);
    unique.push(phrase);
  }
  return unique;
}

/** Keep Class A phrases; extract identity fragments from Class C dumps; drop the rest. */
export function sanitizeMeaningfulVisibleTextPhrases(
  phrases: readonly string[] | undefined,
): string[] | undefined {
  if (!phrases?.length) {
    return undefined;
  }

  const kept: string[] = [];
  const seen = new Set<string>();

  const push = (value: string) => {
    const normalized = collapseWhitespace(value);
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    if (!looksLikeMeaningfulPrimaryText(normalized)) {
      return;
    }
    if (/^[^A-Za-z0-9]+$/.test(normalized)) {
      return;
    }
    seen.add(key);
    kept.push(normalized);
  };

  for (const raw of phrases) {
    if (typeof raw !== "string") {
      continue;
    }
    const trimmed = collapseWhitespace(raw);
    if (!trimmed) {
      continue;
    }
    if (!looksLikeTranscriptionNoise(trimmed) && looksLikeMeaningfulPrimaryText(trimmed)) {
      push(trimmed);
      continue;
    }
    for (const extracted of extractPhrasesFromNoisyLine(trimmed)) {
      push(extracted);
    }
  }

  const coherent = dropContainedNoisySupersets(kept).slice(0, 12);
  return coherent.length > 0 ? coherent : undefined;
}

function sentenceLooksLikeDump(sentence: string): boolean {
  const trimmed = collapseWhitespace(sentence);
  if (!trimmed) {
    return false;
  }
  if (looksLikeOcrDumpTitle(trimmed) || looksLikeTranscriptionNoise(trimmed)) {
    return true;
  }
  if (REPEATED_UNDERSCORES.test(trimmed) || NO_CHORD.test(trimmed) || MUSIC_PAREN_DIRECTION.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Drop OCR/transcription sentences while keeping clean visual prose.
 * Does not invent a replacement when nothing usable remains (caller may fallback).
 */
export function stripOcrDumpFromDescription(description: string | undefined): string {
  const trimmed = (description ?? "").trim();
  if (!trimmed) {
    return "";
  }

  const sentences = trimmed.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  const kept = sentences.filter((sentence) => !sentenceLooksLikeDump(sentence));

  if (kept.length === 0) {
    const withoutUnderscoreSpans = trimmed.replace(/[^.]{0,40}_{2,}[^.]{0,80}/g, " ").replace(/\s+/g, " ").trim();
    if (withoutUnderscoreSpans && !sentenceLooksLikeDump(withoutUnderscoreSpans)) {
      return withoutUnderscoreSpans;
    }
    return "";
  }

  return kept.join(" ").replace(/\s+/g, " ").trim();
}

export function synthesizeSemanticCatalogDescription(input: {
  centralSubject?: string;
  visibleText?: readonly string[];
}): string {
  const subject = collapseWhitespace(input.centralSubject ?? "");
  const phrases = (input.visibleText ?? []).slice(0, 2);
  if (subject && phrases.length > 0) {
    const quoted = phrases.map((phrase) => `"${phrase}"`).join(" and ");
    return `A ${subject} design featuring ${quoted}.`;
  }
  if (subject) {
    return `A ${subject} apparel design.`;
  }
  if (phrases.length > 0) {
    return `Apparel artwork featuring ${phrases.map((phrase) => `"${phrase}"`).join(" and ")}.`;
  }
  return "Illustrated apparel artwork.";
}
