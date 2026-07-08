import type { CatalogTag, SuggestedNewTag } from "../../../packages/shared/src/types/catalogTag.types";
import { tokenizeTagCandidate } from "./catalogTitleRules";

const MAX_AI_APPROVED_TAGS = 12;
const MAX_TAG_LENGTH = 40;

/** Max entries in the compact approvedTagCandidates shortlist returned for the tag reranker. */
const MAX_APPROVED_TAG_CANDIDATES = 30;

/** Max nearby approved tags surfaced per unmatched candidate when building the shortlist. */
const MAX_NEARBY_MATCHES_PER_UNMATCHED_CANDIDATE = 3;

interface ResolveAiCatalogTagsInput {
  approvedTags: CatalogTag[];
  candidates: readonly string[] | undefined;
  maxApprovedTags?: number;
  suggestedNewTags?: readonly SuggestedNewTag[];
}

/**
 * A single approved-tag entry in the compact shortlist built for the text-only tag reranker
 * second call. Deterministic, server-generated — never includes the full tag database, full
 * preferredWhen text, or any AI-generated reasoning.
 */
export interface ApprovedTagCandidate {
  /** Approved tag name only. */
  name: string;
  /** Raw candidate string(s) that pointed at this approved tag. */
  matchedBy: string[];
  /** Short, human-readable, deterministically generated match reason (not AI). */
  reason: string;
}

export interface ResolveAiCatalogTagsResult {
  tags: string[];
  suggestedNewTags: SuggestedNewTag[];
  /** Compact approved-tag shortlist for the optional tag reranker second call. Capped, always returned. */
  approvedTagCandidates: ApprovedTagCandidate[];
  /** Count of raw candidates that matched no approved tag/alias/token — feeds the auto-rerank heuristic. */
  unmatchedCandidateCount: number;
  /**
   * True when every tag in `tags` was reached only via the per-token fallback match ("Matched via
   * partial token match" reason) — never an exact name/alias match. Used by the suggested-tags
   * last-resort gate (see isSuggestedTagsLastResort) to distinguish 3 solid approved matches from 3
   * weak ones that arguably still leave the design under-described. False when `tags` is empty.
   */
  allMatchesAreWeak: boolean;
}

const WEAK_MATCH_REASON = "Matched via partial token match";

/**
 * Last-resort gate for suggestedNewTags generation (plan: 2026-07-02-suggested-tags-last-resort).
 * Suggestions are only worth generating when approved-tag coverage is genuinely thin:
 * - 0-2 approved matches: always eligible.
 * - Exactly 3 approved matches: only eligible when all 3 are weak (partial-token-only) matches AND
 *   there are at least 2 unmatched candidates left to draw suggestions from.
 * - 4+ approved matches: never eligible, regardless of match quality or remaining room.
 *
 * Accepts plain values (not the full result shape) so it can be evaluated both as a live check
 * during resolution — approvedResult can still grow via suggestedNewTags reconciliation, which
 * must be able to tighten the gate mid-loop — and as a post-hoc check by callers holding a
 * finished ResolveAiCatalogTagsResult.
 */
export function isSuggestedTagsLastResort(input: {
  approvedCount: number;
  allMatchesAreWeak: boolean;
  unmatchedCandidateCount: number;
}): boolean {
  if (input.approvedCount <= 2) {
    return true;
  }

  if (input.approvedCount === 3) {
    return input.allMatchesAreWeak && input.unmatchedCandidateCount >= 2;
  }

  return false;
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
export function normalizeForAliasMatch(value: string): string {
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
 * Minimum token length considered specific enough to justify surfacing an approved tag as a
 * "nearby match" candidate on shared-token overlap alone. Short common words (e.g. "ghost",
 * "kids", "rock") appear inside many unrelated approved tag names/aliases and produced
 * false-positive shortlist entries (e.g. an unmatched "ghost" candidate pulling in an unrelated
 * approved tag "ghostrider" via its "ghost rider" alias) that the reranker then had no way to
 * distinguish from a real match. Longer tokens are rare enough to be a meaningful signal.
 */
const MIN_NEARBY_MATCH_TOKEN_LENGTH = 6;

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

/**
 * Build a token index of approved tags (name + aliases) for the nearby-match pass used when
 * constructing the approvedTagCandidates shortlist. Distinct from the exact/alias lookups used
 * for real matching — this is deliberately loose (any shared non-stopword token) since it only
 * feeds a shortlist shown to the reranker for judgment, never an auto-approved match.
 */
function buildApprovedTagTokenIndex(approvedTags: CatalogTag[]): Map<string, Set<string>> {
  const tokenIndex = new Map<string, Set<string>>();

  const indexTerm = (term: string, approvedTagName: string): void => {
    for (const token of tokenizeCandidate(normalizeForAliasMatch(term))) {
      let names = tokenIndex.get(token);

      if (!names) {
        names = new Set<string>();
        tokenIndex.set(token, names);
      }

      names.add(approvedTagName);
    }
  };

  for (const tag of approvedTags) {
    if (tag.status !== "approved") {
      continue;
    }

    indexTerm(tag.name, tag.name);

    for (const alias of tag.aliases) {
      indexTerm(alias, tag.name);
    }
  }

  return tokenIndex;
}

/**
 * Build the compact approvedTagCandidates shortlist for the optional tag reranker second call:
 * every approved tag matched during resolution (reason preserved), plus up to
 * MAX_NEARBY_MATCHES_PER_UNMATCHED_CANDIDATE approved tags per unmatched candidate that share at
 * least one token, capped overall at MAX_APPROVED_TAG_CANDIDATES. Deterministic, no AI — this is
 * candidate-adjacent, not the full approved tag database.
 */
function buildApprovedTagCandidates(
  matchInfoByApprovedName: Map<string, { matchedBy: Set<string>; reason: string }>,
  unmatchedCandidates: ReadonlySet<string>,
  approvedTags: CatalogTag[],
): ApprovedTagCandidate[] {
  const result: ApprovedTagCandidate[] = [];
  const included = new Set<string>();

  for (const [name, info] of matchInfoByApprovedName) {
    if (result.length >= MAX_APPROVED_TAG_CANDIDATES) {
      return result;
    }

    result.push({ matchedBy: [...info.matchedBy], name, reason: info.reason });
    included.add(name);
  }

  if (unmatchedCandidates.size === 0) {
    return result;
  }

  const tokenIndex = buildApprovedTagTokenIndex(approvedTags);

  for (const candidate of unmatchedCandidates) {
    if (result.length >= MAX_APPROVED_TAG_CANDIDATES) {
      break;
    }

    const candidateTokens = tokenizeCandidate(normalizeForAliasMatch(candidate)).filter(
      (token) => token.length >= MIN_NEARBY_MATCH_TOKEN_LENGTH,
    );
    const nearbyNames = new Set<string>();

    for (const token of candidateTokens) {
      for (const approvedName of tokenIndex.get(token) ?? []) {
        if (!included.has(approvedName)) {
          nearbyNames.add(approvedName);
        }
      }
    }

    let addedForThisCandidate = 0;

    for (const nearbyName of nearbyNames) {
      if (addedForThisCandidate >= MAX_NEARBY_MATCHES_PER_UNMATCHED_CANDIDATE) {
        break;
      }

      if (result.length >= MAX_APPROVED_TAG_CANDIDATES) {
        break;
      }

      result.push({
        matchedBy: [candidate],
        name: nearbyName,
        reason: `Unmatched candidate '${candidate}' shares a token with this approved tag`,
      });
      included.add(nearbyName);
      addedForThisCandidate += 1;
    }
  }

  return result;
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

  // Tracks how each matched approved tag was reached, for the compact approvedTagCandidates
  // shortlist built after matching completes. Not used by tags/suggestedNewTags computation.
  const matchInfoByApprovedName = new Map<string, { matchedBy: Set<string>; reason: string }>();

  const recordMatch = (approvedTagName: string, matchedByCandidate: string, reason: string): void => {
    const existing = matchInfoByApprovedName.get(approvedTagName);

    if (existing) {
      existing.matchedBy.add(matchedByCandidate);

      // A tag reached first via a weak (partial-token) match and later confirmed by a stronger
      // exact/alias match should report the stronger reason — never downgrade an already-strong
      // reason, and always upgrade a weak one once real evidence arrives.
      if (existing.reason === WEAK_MATCH_REASON && reason !== WEAK_MATCH_REASON) {
        existing.reason = reason;
      }

      return;
    }

    matchInfoByApprovedName.set(approvedTagName, {
      matchedBy: new Set([matchedByCandidate]),
      reason,
    });
  };

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
      recordMatch(approvedTagName, normalizedCandidate, "Matched via exact name or alias match");
      continue;
    }

    // Punctuation-tolerant alias match: handles hyphens/ampersands/apostrophes in candidates
    // (e.g. "rock-and-roll" matching approved alias "rock and roll").
    const aliasNormalized = normalizeForAliasMatch(candidate);
    const aliasTagName = aliasLookup.get(aliasNormalized);

    if (aliasTagName) {
      pushApproved(aliasTagName);
      recordMatch(aliasTagName, normalizedCandidate, "Matched via punctuation-tolerant alias match");
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
        recordMatch(tokenTagName, normalizedCandidate, WEAK_MATCH_REASON);
        matchedAnyToken = true;
      }
    }

    if (!matchedAnyToken) {
      unmatchedCandidates.add(normalizedCandidate);
    }
  }

  // Suggested-new-tags exist only to fill the gap left when approved tags don't reach the cap
  // (e.g. 7 approved matches on an 8-tag cap leaves room for exactly 1 suggestion). Once the
  // gap is filled — either by more approved matches or by prior suggestions — stop suggesting.
  const remainingSuggestionRoom = (): number =>
    Math.max(0, maxApprovedTags - approvedResult.length - suggestedResult.length);

  const computeAllMatchesAreWeak = (): boolean =>
    approvedResult.length > 0 &&
    approvedResult.every((name) => matchInfoByApprovedName.get(name)?.reason === WEAK_MATCH_REASON);

  // Last-resort gate, evaluated live: approvedResult can still grow via suggestedNewTags
  // reconciliation below (checks 2/3 promote a "suggestion" that actually matches an approved
  // alias/context into approvedResult), which can only make the gate MORE restrictive — so it is
  // re-checked fresh immediately before every point a suggestion would actually be recorded,
  // rather than decided once up front.
  const suggestionsCurrentlyAllowed = (): boolean =>
    isSuggestedTagsLastResort({
      allMatchesAreWeak: computeAllMatchesAreWeak(),
      approvedCount: approvedResult.length,
      unmatchedCandidateCount: unmatchedCandidates.size,
    });

  // The reconciliation loop below still runs unconditionally: an AI-provided suggestedNewTags
  // entry may actually match an approved tag/alias/context (checks 1-3), which promotes it into
  // approvedResult via pushApproved rather than treating it as a suggestion. That reconciliation
  // must always run, since it can change approvedResult itself — one of the last-resort gate's own
  // inputs. Only the final "this is genuinely a new suggestion" outcome (suggestedResult.push) is
  // gated by suggestionsCurrentlyAllowed().
  for (const suggestion of suggestedNewTags ?? []) {
    if (remainingSuggestionRoom() <= 0) {
      break;
    }

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

    if (suggestionsCurrentlyAllowed()) {
      suggestedResult.push(normalizedSuggestion);
      seenSuggested.add(normalizedSuggestion.name);
    }
  }

  for (const candidate of unmatchedCandidates) {
    if (remainingSuggestionRoom() <= 0) {
      break;
    }

    if (!suggestionsCurrentlyAllowed()) {
      break;
    }

    const suggestion = buildSuggestedNewTag(candidate);

    if (suggestion && !seenSuggested.has(suggestion.name) && !lookup.has(suggestion.name)) {
      suggestedResult.push(suggestion);
      seenSuggested.add(suggestion.name);
    }
  }

  return {
    allMatchesAreWeak: computeAllMatchesAreWeak(),
    approvedTagCandidates: buildApprovedTagCandidates(
      matchInfoByApprovedName,
      unmatchedCandidates,
      approvedTags,
    ),
    suggestedNewTags: suggestedResult,
    tags: approvedResult,
    unmatchedCandidateCount: unmatchedCandidates.size,
  };
}
