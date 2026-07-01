import type { CatalogTag, SuggestedNewTag } from "../../../shared/types/catalogTag.types";
import { tokenizeTagCandidate } from "./catalogTitleRules";

const MAX_AI_APPROVED_TAGS = 12;
const MAX_TAG_LENGTH = 40;

interface ResolveAiCatalogTagsInput {
  approvedTags: CatalogTag[];
  candidates: readonly string[] | undefined;
  maxApprovedTags?: number;
  suggestedNewTags?: readonly SuggestedNewTag[];
}

export interface ResolveAiCatalogTagsResult {
  tags: string[];
  suggestedNewTags: SuggestedNewTag[];
}

function normalizeTagCandidate(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Stronger normalization for alias phrase matching. Extends normalizeTagCandidate with:
 * - hyphens treated as spaces (rock-and-roll → rock and roll)
 * - ampersands treated as "and" (rock & roll → rock and roll)
 * - apostrophes removed (rock 'n' roll → rock n roll, rockin' → rockin)
 * - multiple spaces collapsed
 */
function normalizeForAliasMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['-]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract all contiguous word n-grams (length 1 to maxN) from a normalized string.
 * Used to find approved alias phrases embedded in free-text fields like preferredWhen/reason.
 */
function extractNgrams(normalized: string, maxN = 4): Set<string> {
  const words = normalized.split(" ").filter(Boolean);
  const result = new Set<string>();

  for (let start = 0; start < words.length; start++) {
    for (let len = 1; len <= maxN && start + len <= words.length; len++) {
      result.add(words.slice(start, start + len).join(" "));
    }
  }

  return result;
}

function isUsableTagCandidate(value: string): boolean {
  return Boolean(value) && value.length <= MAX_TAG_LENGTH && !value.includes("/");
}

const CANDIDATE_STOPWORDS = new Set(["and", "the", "of", "a", "an", "to", "in", "on", "or"]);

/**
 * Split a multi-word candidate into single-word fallback tokens. Used only when the full
 * candidate (e.g. "rock and roll") does not match an approved tag name or alias, so we can
 * still salvage a matching single-word approved tag before falling back to a suggestion.
 */
function tokenizeCandidate(value: string): string[] {
  return value
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !CANDIDATE_STOPWORDS.has(token));
}

interface ApprovedTagLookups {
  /** Exact-match lookup: normalizeTagCandidate(name|alias) → canonical tag name. */
  lookup: Map<string, string>;
  /** Alias phrase lookup: normalizeForAliasMatch(alias) → canonical tag name.
   *  Used for punctuation-tolerant matching (hyphens/ampersands/apostrophes). */
  aliasLookup: Map<string, string>;
}

function buildApprovedTagLookup(approvedTags: CatalogTag[]): ApprovedTagLookups {
  const lookup = new Map<string, string>();
  const aliasLookup = new Map<string, string>();

  for (const tag of approvedTags) {
    if (tag.status !== "approved") {
      continue;
    }

    const normalizedName = normalizeTagCandidate(tag.name);

    if (isUsableTagCandidate(normalizedName)) {
      lookup.set(normalizedName, tag.name);
      aliasLookup.set(normalizeForAliasMatch(tag.name), tag.name);
    }

    for (const alias of tag.aliases) {
      const normalizedAlias = normalizeTagCandidate(alias);

      if (isUsableTagCandidate(normalizedAlias)) {
        lookup.set(normalizedAlias, tag.name);
      }

      // Always add alias to aliasLookup (multiword aliases like "rock and roll" are usable
      // there even if they fail the single-word isUsableTagCandidate check for the main lookup).
      const aliasNormalized = normalizeForAliasMatch(alias);

      if (aliasNormalized) {
        aliasLookup.set(aliasNormalized, tag.name);
      }
    }
  }

  return { lookup, aliasLookup };
}

/**
 * Reduce an unmatched raw candidate (which may be a multi-word phrase like "messy bun") to a
 * safe single-word reusable tag name, keeping the original phrase as an alias when it differs.
 * Returns undefined when no safe single-word reduction exists (e.g. the phrase tokenizes to
 * nothing usable after dropping stopwords) — callers must drop the candidate in that case rather
 * than persist a suggested tag whose name contains a space.
 */
function reduceToSafeSuggestedTag(rawCandidate: string): { name: string; aliases: string[] } | undefined {
  if (!rawCandidate.includes(" ")) {
    return isUsableTagCandidate(rawCandidate) ? { aliases: [], name: rawCandidate } : undefined;
  }

  const tokens = tokenizeTagCandidate(rawCandidate);
  const name = tokens[tokens.length - 1];

  if (!name || !isUsableTagCandidate(name)) {
    return undefined;
  }

  return { aliases: [rawCandidate], name };
}

function buildSuggestedNewTag(rawCandidate: string): SuggestedNewTag | undefined {
  const reduced = reduceToSafeSuggestedTag(rawCandidate);

  if (!reduced) {
    return undefined;
  }

  return {
    aliases: reduced.aliases,
    name: reduced.name,
    preferredWhen: `Use when "${rawCandidate}" is a primary searchable subject, theme, style, or occasion for the design.`,
    reason: "AI output did not match an approved tag name or alias.",
    source: "ai",
  };
}

function normalizeSuggestedTag(input: SuggestedNewTag): SuggestedNewTag | null {
  const name = normalizeTagCandidate(input.name);

  if (!isUsableTagCandidate(name) || name.includes(" ")) {
    return null;
  }

  const preferredWhen = input.preferredWhen.trim().replace(/\s+/g, " ");

  if (!preferredWhen) {
    return null;
  }

  const aliases = [
    ...new Set(
      input.aliases
        .map(normalizeTagCandidate)
        .filter((alias) => alias && alias !== name && isUsableTagCandidate(alias)),
    ),
  ];

  return {
    aliases,
    name,
    preferredWhen,
    reason: input.reason?.trim() || "AI did not find a sufficiently relevant approved tag.",
    source: "ai",
  };
}

/**
 * Check whether any n-gram extracted from the given text phrases matches an entry in the
 * normalized alias lookup. Returns the canonical approved tag name on the first match, or
 * undefined when no match is found.
 *
 * This is used to reconcile suggested new tags against approved aliases using context from the
 * suggestion's preferredWhen and reason fields — the model's own statement of the concept it is
 * trying to tag. We deliberately do NOT scan the full description or title here; those fields
 * contain incidental occurrences of words (e.g. "ROCK IT" in visible text) that would cause
 * false positives.
 */
function findAliasMatchInContext(
  contextPhrases: string[],
  aliasLookup: Map<string, string>,
): string | undefined {
  for (const phrase of contextPhrases) {
    if (!phrase.trim()) {
      continue;
    }

    const normalized = normalizeForAliasMatch(phrase);
    const ngrams = extractNgrams(normalized);

    for (const ngram of ngrams) {
      const match = aliasLookup.get(ngram);

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

export function resolveAiCatalogTags({
  approvedTags,
  candidates,
  maxApprovedTags = MAX_AI_APPROVED_TAGS,
  suggestedNewTags,
}: ResolveAiCatalogTagsInput): ResolveAiCatalogTagsResult {
  const { lookup, aliasLookup } = buildApprovedTagLookup(approvedTags);
  const approvedResult: string[] = [];
  const suggestedResult: SuggestedNewTag[] = [];
  const seenApproved = new Set<string>();
  const seenSuggested = new Set<string>();
  const unmatchedCandidates = new Set<string>();

  const pushApproved = (approvedTagName: string): void => {
    if (!seenApproved.has(approvedTagName) && approvedResult.length < maxApprovedTags) {
      approvedResult.push(approvedTagName);
      seenApproved.add(approvedTagName);
    }
  };

  for (const candidate of candidates ?? []) {
    const normalizedCandidate = normalizeTagCandidate(candidate);

    if (!isUsableTagCandidate(normalizedCandidate)) {
      continue;
    }

    // Match the full candidate first so multi-word approved names and aliases
    // (e.g. "rock and roll") resolve before we fall back to single-word matching.
    const approvedTagName = lookup.get(normalizedCandidate);

    if (approvedTagName) {
      pushApproved(approvedTagName);
      continue;
    }

    // Punctuation-tolerant alias match: handles hyphens/ampersands/apostrophes in candidates
    // (e.g. "rock-and-roll" matching approved alias "rock and roll").
    const aliasNormalized = normalizeForAliasMatch(candidate);
    const aliasTagName = aliasLookup.get(aliasNormalized);

    if (aliasTagName) {
      pushApproved(aliasTagName);
      continue;
    }

    // No full-string match. For multi-word candidates, try each single word against the
    // approved lookup so a candidate like "rock music" can still match an approved "music".
    const tokens = normalizedCandidate.includes(" ")
      ? tokenizeCandidate(normalizedCandidate)
      : [];
    let matchedAnyToken = false;

    for (const token of tokens) {
      const tokenTagName = lookup.get(token);

      if (tokenTagName) {
        pushApproved(tokenTagName);
        matchedAnyToken = true;
      }
    }

    if (!matchedAnyToken) {
      unmatchedCandidates.add(normalizedCandidate);
    }
  }

  for (const suggestion of suggestedNewTags ?? []) {
    const normalizedSuggestion = normalizeSuggestedTag(suggestion);

    if (!normalizedSuggestion) {
      continue;
    }

    if (seenSuggested.has(normalizedSuggestion.name)) {
      continue;
    }

    // Check 1: suggestion name and its own aliases against the exact lookup.
    const suggestionTerms = [normalizedSuggestion.name, ...normalizedSuggestion.aliases];
    const exactMatch = suggestionTerms.some((value) => lookup.has(value));

    if (exactMatch) {
      continue;
    }

    // Check 2: punctuation-tolerant alias match on suggestion name and aliases.
    const aliasTermMatch = suggestionTerms.some((value) =>
      aliasLookup.has(normalizeForAliasMatch(value)),
    );

    if (aliasTermMatch) {
      // Add the matched approved tag name to results.
      const matchedApprovedName = suggestionTerms
        .map((value) => aliasLookup.get(normalizeForAliasMatch(value)))
        .find(Boolean);

      if (matchedApprovedName) {
        pushApproved(matchedApprovedName);
      }

      continue;
    }

    // Check 3: context scan — search the suggestion's preferredWhen and reason text for
    // n-grams that match an approved alias phrase. This catches cases where the model names a
    // broad concept (e.g. "rock") but its own explanation references a more specific approved
    // alias phrase (e.g. "rock-and-roll pose" → matches alias "rock and roll" on tag "music").
    const contextMatch = findAliasMatchInContext(
      [normalizedSuggestion.preferredWhen, normalizedSuggestion.reason ?? ""],
      aliasLookup,
    );

    if (contextMatch) {
      pushApproved(contextMatch);
      continue;
    }

    suggestedResult.push(normalizedSuggestion);
    seenSuggested.add(normalizedSuggestion.name);
  }

  for (const candidate of unmatchedCandidates) {
    const suggestion = buildSuggestedNewTag(candidate);

    if (suggestion && !seenSuggested.has(suggestion.name) && !lookup.has(suggestion.name)) {
      suggestedResult.push(suggestion);
      seenSuggested.add(suggestion.name);
    }
  }

  return {
    suggestedNewTags: suggestedResult,
    tags: approvedResult,
  };
}
