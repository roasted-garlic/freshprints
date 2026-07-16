import {
  ETSY_RECOMMENDATION_DIGITAL_PNG_TERMS,
  ETSY_RECOMMENDATION_MAX_API_KEYWORD_TOKENS,
  ETSY_RECOMMENDATION_MAX_QUERY_LENGTH,
  ETSY_RECOMMENDATION_MAX_SAYING_API_TOKENS,
  ETSY_RECOMMENDATION_SEARCH_MAX_PRICE_USD,
  ETSY_RECOMMENDATION_SEARCH_CUSTOM_PRICE_FLAG,
} from "../constants/etsyRecommendation/etsyRecommendation.constants";
import type { EtsyRecommendationAnswers } from "../types/etsyRecommendation/etsyRecommendation.types";
import { parseEtsyRecommendationSubjectText } from "./etsyRecommendationSubjectParser";
import {
  getOccasionApiToken,
  getSubjectApiToken,
} from "./etsyRecommendationValidation";

/** Low-signal tokens skipped when pulling extras from exact saying into Open API keywords. */
const API_KEYWORD_STOP_WORDS = new Set([
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
]);

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function appendUniquePart(combined: string, part: string): string {
  const normalized = normalizeWhitespace(part);
  if (!normalized) {
    return combined;
  }
  if (!combined) {
    return normalized;
  }
  if (combined.toLowerCase().includes(normalized.toLowerCase())) {
    return combined;
  }
  return `${combined} ${normalized}`;
}

function dedupeTokens(value: string): string {
  const tokens = value.split(" ");
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const token of tokens) {
    if (!token) {
      continue;
    }
    const key = token.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(token);
  }
  return deduped.join(" ");
}

function truncateAtWordBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  const sliced = value.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.5) {
    return sliced.slice(0, lastSpace).trimEnd();
  }
  return sliced.trimEnd();
}

function finalizeQuery(value: string): string {
  let query = dedupeTokens(normalizeWhitespace(value));
  if (query.length > ETSY_RECOMMENDATION_MAX_QUERY_LENGTH) {
    query = truncateAtWordBoundary(query, ETSY_RECOMMENDATION_MAX_QUERY_LENGTH);
  }
  return query;
}

/**
 * Resolve subject search tokens: prefer parsed subjectText; else legacy subject ids.
 */
export function resolveEtsyRecommendationSubjectTokens(
  answers: EtsyRecommendationAnswers,
): string[] {
  if (answers.subjectText?.trim()) {
    return parseEtsyRecommendationSubjectText(answers.subjectText).subjectTokens;
  }
  if (answers.subjects && answers.subjects.length > 0) {
    return answers.subjects.map((id) => getSubjectApiToken(id));
  }
  throw new Error("Describe what the design is of.");
}

function styleTokens(answers: EtsyRecommendationAnswers): string[] {
  return answers.styles ? [...answers.styles] : [];
}

function occasionTokens(answers: EtsyRecommendationAnswers): string[] {
  if (answers.subjectText?.trim()) {
    return [];
  }
  if (!answers.occasions || answers.occasions.length === 0) {
    return [];
  }
  return answers.occasions.map((id) => getOccasionApiToken(id));
}

function buildBaseQuery(answers: EtsyRecommendationAnswers): string {
  let combined = "";
  for (const token of resolveEtsyRecommendationSubjectTokens(answers)) {
    combined = appendUniquePart(combined, token);
  }
  for (const token of styleTokens(answers)) {
    combined = appendUniquePart(combined, token);
  }
  for (const token of occasionTokens(answers)) {
    combined = appendUniquePart(combined, token);
  }
  return combined;
}

/**
 * Canonical Etsy website search query.
 * Always appends `png`. Instant download is applied via URL params, not `q`.
 */
export function buildEtsyRecommendationCanonicalQuery(answers: EtsyRecommendationAnswers): string {
  let combined = buildBaseQuery(answers);
  if (answers.wording?.trim()) {
    combined = appendUniquePart(combined, normalizeWhitespace(answers.wording));
  }
  combined = appendUniquePart(combined, ETSY_RECOMMENDATION_DIGITAL_PNG_TERMS);
  return finalizeQuery(combined);
}

/**
 * Broader website query: exact saying when provided, otherwise subject tokens + `png`.
 */
export function buildEtsyRecommendationBroaderQuery(answers: EtsyRecommendationAnswers): string {
  let combined = "";
  if (answers.wording?.trim()) {
    combined = appendUniquePart(combined, normalizeWhitespace(answers.wording));
  } else {
    for (const token of resolveEtsyRecommendationSubjectTokens(answers)) {
      combined = appendUniquePart(combined, token);
    }
  }
  combined = appendUniquePart(combined, ETSY_RECOMMENDATION_DIGITAL_PNG_TERMS);
  return finalizeQuery(combined);
}

/**
 * Soften punctuation for Open API keywords (website `q` keeps original saying text).
 */
export function sanitizeEtsyApiKeywords(query: string): string {
  return finalizeQuery(query.replace(/[^\p{L}\p{N}\s]+/gu, " "));
}

const REQUIRED_DIGITAL_TOKENS = ETSY_RECOMMENDATION_DIGITAL_PNG_TERMS.split(" ").filter(Boolean);

function tokenKey(token: string): string {
  return token.toLowerCase();
}

function ensureRequiredDigitalTerms(tokens: string[]): string[] {
  const seen = new Set(tokens.map(tokenKey));
  const out = [...tokens];
  for (const required of REQUIRED_DIGITAL_TOKENS) {
    const key = tokenKey(required);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(required);
    }
  }
  return out;
}

function sayingTokensForApi(wording: string | undefined): string[] {
  if (!wording?.trim()) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of sanitizeEtsyApiKeywords(wording).split(" ").filter(Boolean)) {
    const key = tokenKey(token);
    if (API_KEYWORD_STOP_WORDS.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(token);
    if (out.length >= ETSY_RECOMMENDATION_MAX_SAYING_API_TOKENS) {
      break;
    }
  }
  return out;
}

/**
 * Focused Open API keywords: subject tokens + styles + occasion + capped saying + `png`.
 */
export function buildEtsyRecommendationApiKeywords(answers: EtsyRecommendationAnswers): string {
  const budget = ETSY_RECOMMENDATION_MAX_API_KEYWORD_TOKENS;
  const contentBudget = Math.max(1, budget - REQUIRED_DIGITAL_TOKENS.length);

  const out: string[] = [];
  const seen = new Set<string>();

  const push = (part: string) => {
    for (const token of sanitizeEtsyApiKeywords(part).split(" ").filter(Boolean)) {
      if (out.length >= contentBudget) {
        return;
      }
      const key = tokenKey(token);
      if (seen.has(key) || REQUIRED_DIGITAL_TOKENS.some((r) => tokenKey(r) === key)) {
        continue;
      }
      seen.add(key);
      out.push(token);
    }
  };

  for (const token of resolveEtsyRecommendationSubjectTokens(answers)) {
    push(token);
  }
  for (const token of styleTokens(answers)) {
    push(token);
  }
  for (const token of occasionTokens(answers)) {
    push(token);
  }
  for (const token of sayingTokensForApi(answers.wording)) {
    push(token);
  }

  return finalizeQuery(ensureRequiredDigitalTerms(out).join(" "));
}

/**
 * Fallback Open API keywords: broader query (subjects + `png`) with punctuation softened.
 */
export function buildEtsyRecommendationApiKeywordsFallback(
  answers: EtsyRecommendationAnswers,
): string {
  return sanitizeEtsyApiKeywords(buildEtsyRecommendationBroaderQuery(answers));
}

export function buildEtsyRecommendationSearchUrl(canonicalQuery: string): string {
  const q = canonicalQuery.trim();
  if (!q) {
    throw new Error("Canonical query is required.");
  }
  const url = new URL("https://www.etsy.com/search");
  url.searchParams.set("q", q);
  url.searchParams.set("instant_download", "true");
  url.searchParams.set("explicit", "1");
  url.searchParams.set("custom_price", String(ETSY_RECOMMENDATION_SEARCH_CUSTOM_PRICE_FLAG));
  url.searchParams.set("max", String(ETSY_RECOMMENDATION_SEARCH_MAX_PRICE_USD));
  return url.toString();
}

/** Decode the `q` param from an official Etsy search URL for equivalence tests. */
export function decodeEtsySearchUrlQuery(etsySearchUrl: string): string {
  const url = new URL(etsySearchUrl);
  if (url.hostname !== "www.etsy.com" && url.hostname !== "etsy.com") {
    throw new Error("Not an Etsy search URL.");
  }
  const q = url.searchParams.get("q");
  if (q == null) {
    throw new Error("Missing q parameter.");
  }
  return q;
}
