/**
 * Deterministic Explicit Content Automation matcher + vocabulary resolution.
 * Classification signal only — never a hard Autonomous blocker.
 * ADR-FP-172: root Explicit writes are standard enrichment (not Ready-gated).
 */

import {
  DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS,
  EXPLICIT_CONTENT_AUTOMATION_ALIAS_FAMILIES,
  EXPLICIT_CONTENT_AUTOMATION_TERM_MAX_LENGTH,
  EXPLICIT_CONTENT_AUTOMATION_TERM_PATTERN,
  EXPLICIT_CONTENT_AUTOMATION_TERMS_MAX_COUNT,
} from "../constants/explicitContentAutomation.constants";

export const EXPLICIT_CONTENT_SOURCES = ["staff", "automation"] as const;
export type ExplicitContentSource = (typeof EXPLICIT_CONTENT_SOURCES)[number];

export interface ExplicitContentAutomationMatch {
  /** Masker-effective surface form to store in censoredTerms. */
  surfaceForm: string;
  /** Vocabulary term (owner list or active alias) that matched. */
  matchedVocabularyTerm: string;
}

export interface ExplicitContentAutomationClassifyInput {
  /** Pre-sanitize artwork evidence lines. */
  artworkEvidenceLines: readonly string[];
  /** Final title/description — used only to collect extra masker forms after an artwork hit. */
  title?: string;
  description?: string;
  /** Resolved owner vocabulary (empty = disabled). */
  vocabularyTerms: readonly string[];
}

export interface ExplicitContentAutomationClassifyResult {
  artworkHit: boolean;
  /** Unique masker-effective forms for censoredTerms when auto-writing Explicit. */
  censoredTerms: string[];
  matches: ExplicitContentAutomationMatch[];
}

/** Payload for root Explicit persistence (markAiSuccess). */
export interface ExplicitContentAutomationWrite {
  isExplicitContent: true;
  censoredTerms: string[];
  explicitContentSource: "automation";
}

export interface ExplicitContentPriorFields {
  isExplicitContent?: unknown;
  censoredTerms?: unknown;
  explicitContentSource?: unknown;
  /** Deliberate staff lock against automatic Explicit mutation (ADR-FP-173). */
  explicitContentAutomationLocked?: unknown;
}

const LEET_MAP: Readonly<Record<string, string>> = {
  "@": "a",
  $: "s",
  "0": "o",
  "1": "i",
  "!": "i",
  "*": "",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve Firestore field:
 * - absent/undefined → defaults
 * - [] → intentional empty (no fallback)
 * - array → validated unique lowercase terms
 */
export function resolveExplicitContentAutomationTerms(raw: unknown): string[] {
  if (raw === undefined) {
    return [...DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS];
  }
  if (!Array.isArray(raw)) {
    return [...DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS];
  }
  return normalizeExplicitContentAutomationTermsInput(raw);
}

/** Validate/normalize owner-submitted list for Settings save (allows empty). */
export function normalizeExplicitContentAutomationTermsInput(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }
    const normalized = entry.trim().toLowerCase().replace(/\s+/g, " ");
    if (!normalized) {
      continue;
    }
    if (normalized.length > EXPLICIT_CONTENT_AUTOMATION_TERM_MAX_LENGTH) {
      continue;
    }
    if (!EXPLICIT_CONTENT_AUTOMATION_TERM_PATTERN.test(normalized)) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    resolved.push(normalized);
    if (resolved.length >= EXPLICIT_CONTENT_AUTOMATION_TERMS_MAX_COUNT) {
      break;
    }
  }

  return resolved;
}

/**
 * Active match terms = owner list ∪ code aliases whose canonical is present in owner list.
 * Explicitly listed aliases remain active even if their canonical was removed.
 */
export function buildActiveExplicitContentMatchTerms(
  vocabularyTerms: readonly string[],
): Set<string> {
  const owner = new Set(
    vocabularyTerms.map((term) => term.trim().toLowerCase()).filter(Boolean),
  );
  const active = new Set(owner);

  for (const [canonical, aliases] of Object.entries(EXPLICIT_CONTENT_AUTOMATION_ALIAS_FAMILIES)) {
    if (!owner.has(canonical)) {
      continue;
    }
    for (const alias of aliases) {
      active.add(alias);
    }
  }

  return active;
}

function collapseSeparators(value: string): string {
  return value.replace(/[\s_\-./\\|]+/g, "");
}

function applyLeet(value: string): string {
  let out = "";
  for (const char of value) {
    out += LEET_MAP[char] ?? char;
  }
  return out;
}

/** Compact form for obfuscation matching: lowercase, leet, drop remaining non-letters. */
export function compactForExplicitMatch(value: string): string {
  const lower = value.toLowerCase();
  const leet = applyLeet(lower);
  const collapsed = collapseSeparators(leet);
  return collapsed.replace(/[^a-z]/g, "");
}

/** True when `short` equals `long` after removing exactly one letter (bounded hole for f*ck → fuck). */
function isSingleLetterHole(short: string, long: string): boolean {
  if (long.length !== short.length + 1 || short.length < 2) {
    return false;
  }
  for (let index = 0; index < long.length; index += 1) {
    if (long.slice(0, index) + long.slice(index + 1) === short) {
      return true;
    }
  }
  return false;
}

function compactMatchesTerm(candidate: string, compactTerm: string): boolean {
  const compactCandidate = compactForExplicitMatch(candidate);
  if (!compactCandidate || compactCandidate.length < 2) {
    return false;
  }
  if (compactCandidate === compactTerm) {
    return true;
  }
  // f*ck / f_ck → fck vs fuck (exactly one missing letter)
  return isSingleLetterHole(compactCandidate, compactTerm);
}

function tokenizePreservingWords(line: string): string[] {
  return line
    .toLowerCase()
    .split(/[^a-z0-9*_-]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildBoundaryPattern(term: string): RegExp {
  const escaped = escapeRegExp(term);
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "gi");
}

/**
 * Extract the actual matched span from haystack for a vocabulary term (case-insensitive literal).
 */
function findLiteralSurfaceForms(haystack: string, term: string): string[] {
  const pattern = buildBoundaryPattern(term);
  const forms: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(haystack)) !== null) {
    forms.push(match[0]);
  }
  return forms;
}

function findCompactHits(
  line: string,
  activeTerms: ReadonlySet<string>,
): ExplicitContentAutomationMatch[] {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }

  const hits: ExplicitContentAutomationMatch[] = [];
  const tokens = tokenizePreservingWords(line);

  for (const term of activeTerms) {
    const compactTerm = compactForExplicitMatch(term);
    if (!compactTerm || compactTerm.length < 2) {
      continue;
    }

    // Whole line compact / single-hole match (e.g. "f u c k", "f*ck", "f-u-c-k")
    if (compactMatchesTerm(trimmed, compactTerm)) {
      hits.push({ surfaceForm: trimmed, matchedVocabularyTerm: term });
      continue;
    }

    for (const token of tokens) {
      if (compactMatchesTerm(token, compactTerm)) {
        hits.push({ surfaceForm: token, matchedVocabularyTerm: term });
      }
    }
  }

  return hits;
}

function collectArtworkMatches(
  lines: readonly string[],
  activeTerms: ReadonlySet<string>,
): ExplicitContentAutomationMatch[] {
  const matches: ExplicitContentAutomationMatch[] = [];

  for (const rawLine of lines) {
    if (typeof rawLine !== "string") {
      continue;
    }
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    for (const term of activeTerms) {
      for (const surface of findLiteralSurfaceForms(line, term)) {
        matches.push({ surfaceForm: surface, matchedVocabularyTerm: term });
      }
    }

    matches.push(...findCompactHits(line, activeTerms));
  }

  return matches;
}

function collectCatalogSurfaceForms(
  text: string | undefined,
  matchedVocabularyTerms: ReadonlySet<string>,
): string[] {
  if (!text?.trim() || matchedVocabularyTerms.size === 0) {
    return [];
  }

  const forms: string[] = [];
  for (const term of matchedVocabularyTerms) {
    forms.push(...findLiteralSurfaceForms(text, term));
    // Compact scan on title/desc for obfuscated rendered copy
    for (const hit of findCompactHits(text, matchedVocabularyTerms)) {
      forms.push(hit.surfaceForm);
    }
  }
  return forms;
}

function normalizeSurfaceForStorage(surface: string): string {
  const trimmed = surface.trim();
  if (!trimmed) {
    return "";
  }
  // Letter-only forms → lowercase (masker is case-insensitive).
  // Forms with punctuation keep original characters (needed for f*ck / f-u-c-k).
  if (/^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

function dedupeSurfaces(surfaces: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of surfaces) {
    const normalized = normalizeSurfaceForStorage(raw);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(normalized);
  }
  // Longer first — same preference as Portal masker
  out.sort((a, b) => b.length - a.length);
  return out;
}

/**
 * Classify artwork evidence for automatic Explicit Content.
 * Title/description never create an artwork hit alone; they only contribute masker forms after a hit.
 */
export function classifyExplicitContentAutomation(
  input: ExplicitContentAutomationClassifyInput,
): ExplicitContentAutomationClassifyResult {
  const vocabularyTerms = input.vocabularyTerms ?? [];
  if (vocabularyTerms.length === 0) {
    return { artworkHit: false, censoredTerms: [], matches: [] };
  }

  const activeTerms = buildActiveExplicitContentMatchTerms(vocabularyTerms);
  const artworkMatches = collectArtworkMatches(input.artworkEvidenceLines ?? [], activeTerms);

  if (artworkMatches.length === 0) {
    return { artworkHit: false, censoredTerms: [], matches: [] };
  }

  const matchedVocab = new Set(artworkMatches.map((match) => match.matchedVocabularyTerm));
  const surfaces = [
    ...artworkMatches.map((match) => match.surfaceForm),
    ...collectCatalogSurfaceForms(input.title, matchedVocab),
    ...collectCatalogSurfaceForms(input.description, matchedVocab),
  ];

  return {
    artworkHit: true,
    censoredTerms: dedupeSurfaces(surfaces),
    matches: artworkMatches,
  };
}

function hasLegacyExplicitFields(prior: ExplicitContentPriorFields): boolean {
  if (typeof prior.isExplicitContent === "boolean") {
    return true;
  }
  if (
    Array.isArray(prior.censoredTerms) &&
    prior.censoredTerms.some((term) => typeof term === "string" && term.trim())
  ) {
    return true;
  }
  return false;
}

/** Normalize persisted `explicitContentSource` (last-writer provenance only). */
export function resolveExplicitContentSource(
  prior: ExplicitContentPriorFields,
): ExplicitContentSource | null {
  const raw = prior.explicitContentSource;
  if (raw === "staff" || raw === "automation") {
    return raw;
  }
  return null;
}

/**
 * Deliberate staff lock against automatic Explicit root mutation (ADR-FP-173).
 * Absent/false = unlocked. Never inferred from source or legacy Explicit fields.
 */
export function isExplicitContentAutomationLocked(prior: ExplicitContentPriorFields): boolean {
  return prior.explicitContentAutomationLocked === true;
}

/**
 * Whether automation must not write Explicit root fields.
 * ADR-FP-173: only the deliberate lock blocks — not `explicitContentSource` or legacy fields.
 */
export function hasProtectedStaffExplicitAuthority(prior: ExplicitContentPriorFields): boolean {
  return isExplicitContentAutomationLocked(prior);
}

/**
 * @deprecated Prefer {@link isExplicitContentAutomationLocked} / {@link hasProtectedStaffExplicitAuthority}.
 */
export function hasProtectedHumanExplicitAuthority(prior: ExplicitContentPriorFields): boolean {
  return isExplicitContentAutomationLocked(prior);
}

/**
 * Decide whether automation may write root Explicit fields this enrichment.
 * Never clears on non-match. Never writes when settings failed or lock is true.
 * Staff provenance alone does not block.
 */
export function resolveExplicitContentAutomationWrite(input: {
  classification: ExplicitContentAutomationClassifyResult;
  settingsReadFailed: boolean;
  prior: ExplicitContentPriorFields;
}): ExplicitContentAutomationWrite | undefined {
  if (input.settingsReadFailed) {
    return undefined;
  }
  if (isExplicitContentAutomationLocked(input.prior)) {
    return undefined;
  }
  const terms = input.classification.censoredTerms.filter(
    (term): term is string => typeof term === "string" && term.trim().length > 0,
  );
  if (!input.classification.artworkHit || terms.length === 0) {
    // No automated clearing — leave prior Explicit state intact.
    return undefined;
  }
  return {
    isExplicitContent: true,
    censoredTerms: terms,
    explicitContentSource: "automation",
  };
}

export interface ExplicitContentAutomationPreviewPayload {
  /**
   * True when automation will/did apply a root Explicit write (ADR-FP-172).
   * Retained name for compatibility; not gated on wouldAutoApprove / Ready.
   */
  wouldMarkExplicitContent: boolean;
  /** Same as wouldMarkExplicitContent — additive truthful alias. */
  applied?: boolean;
  /** Artwork hit with non-empty detected terms. */
  detected?: boolean;
  artworkHit: boolean;
  proposedCensoredTerms?: string[];
  /** @deprecated Prefer suppressedDueToAutomationLock (ADR-FP-173). */
  suppressedDueToHumanAuthority?: boolean;
  /** True when deliberate lock blocked an otherwise-positive automatic write. */
  suppressedDueToAutomationLock?: boolean;
}

/**
 * Build staff-visible Explicit automation preview from one classifier result.
 * `willApplyRootWrite` is the post-lock decision for root mutation.
 */
export function buildExplicitContentAutomationPreview(input: {
  classification: ExplicitContentAutomationClassifyResult;
  willApplyRootWrite: boolean;
  suppressedDueToAutomationLock?: boolean;
  /** @deprecated Use suppressedDueToAutomationLock. */
  suppressedDueToHumanAuthority?: boolean;
}): ExplicitContentAutomationPreviewPayload {
  const artworkHit = input.classification.artworkHit === true;
  const terms = input.classification.censoredTerms.filter(
    (term): term is string => typeof term === "string" && term.trim().length > 0,
  );
  const detected = artworkHit && terms.length > 0;
  const suppressed =
    input.suppressedDueToAutomationLock === true ||
    input.suppressedDueToHumanAuthority === true;
  const applied = input.willApplyRootWrite === true && !suppressed && detected;

  const preview: ExplicitContentAutomationPreviewPayload = {
    wouldMarkExplicitContent: applied,
    applied,
    detected,
    artworkHit,
  };
  if (terms.length > 0) {
    preview.proposedCensoredTerms = terms;
  }
  if (suppressed) {
    preview.suppressedDueToAutomationLock = true;
    preview.suppressedDueToHumanAuthority = true;
  }
  return preview;
}

/** Apply deliberate automation lock to an existing preview. */
export function applyHumanAuthorityToExplicitContentAutomationPreview(
  preview: ExplicitContentAutomationPreviewPayload,
  input: {
    hasProtectedAuthority: boolean;
  },
): ExplicitContentAutomationPreviewPayload {
  if (!input.hasProtectedAuthority) {
    return preview;
  }
  const terms = preview.proposedCensoredTerms ?? [];
  const wouldHaveAppliedWithoutLock = preview.artworkHit === true && terms.length > 0;

  return buildExplicitContentAutomationPreview({
    willApplyRootWrite: false,
    classification: {
      artworkHit: preview.artworkHit,
      censoredTerms: terms,
      matches: [],
    },
    suppressedDueToAutomationLock: wouldHaveAppliedWithoutLock,
  });
}

/** @deprecated Legacy helper name; unused except documentation. */
export function hasLegacyExplicitFieldsForProvenance(
  prior: ExplicitContentPriorFields,
): boolean {
  return hasLegacyExplicitFields(prior);
}
