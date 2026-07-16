import {
  ETSY_RECOMMENDATION_STYLE_OPTIONS,
  ETSY_RECOMMENDATION_SUGGESTION_MAX_ALIASES,
  ETSY_RECOMMENDATION_SUGGESTION_MAX_ALIAS_LENGTH,
  type EtsyRecommendationSuggestionKind,
} from "./etsyRecommendation.constants";
import {
  ETSY_RECOMMENDATION_SUGGEST_DICTIONARY,
  type EtsyRecommendationSuggestEntry,
  suggestEntryPhrases,
} from "./etsyRecommendationSuggestDictionary";

/** Normalize a label/token for case-insensitive dedupe keys. */
export function normalizeSuggestionLabelKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface AdminSuggestionOverlay {
  id: string;
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  apiToken: string;
  aliases?: string[];
  active: boolean;
  labelKey: string;
}

/** Collect normalized collision keys for a subject-like entry. */
export function collectSubjectCollisionKeys(entry: {
  label: string;
  apiToken: string;
  aliases?: readonly string[];
}): Set<string> {
  const keys = new Set<string>();
  const labelKey = normalizeSuggestionLabelKey(entry.label);
  const tokenKey = normalizeSuggestionLabelKey(entry.apiToken);
  if (labelKey) {
    keys.add(labelKey);
  }
  if (tokenKey) {
    keys.add(tokenKey);
  }
  for (const alias of entry.aliases ?? []) {
    const aliasKey = normalizeSuggestionLabelKey(alias);
    if (aliasKey) {
      keys.add(aliasKey);
    }
  }
  return keys;
}

let cachedStaticSubjectKeys: Set<string> | null = null;
let cachedStaticStyleKeys: Set<string> | null = null;

/** All normalized phrases from the static subject suggest dictionary. */
export function getStaticSubjectCollisionKeys(): Set<string> {
  if (cachedStaticSubjectKeys) {
    return cachedStaticSubjectKeys;
  }
  const keys = new Set<string>();
  for (const entry of ETSY_RECOMMENDATION_SUGGEST_DICTIONARY) {
    for (const phrase of suggestEntryPhrases(entry)) {
      keys.add(phrase);
    }
  }
  cachedStaticSubjectKeys = keys;
  return keys;
}

/** Normalized static tone/style option strings. */
export function getStaticStyleCollisionKeys(): Set<string> {
  if (cachedStaticStyleKeys) {
    return cachedStaticStyleKeys;
  }
  const keys = new Set<string>();
  for (const style of ETSY_RECOMMENDATION_STYLE_OPTIONS) {
    const key = normalizeSuggestionLabelKey(style);
    if (key) {
      keys.add(key);
    }
  }
  cachedStaticStyleKeys = keys;
  return keys;
}

export function adminOverlayToSuggestEntry(
  overlay: AdminSuggestionOverlay,
): EtsyRecommendationSuggestEntry {
  return {
    id: `admin_${overlay.id}`,
    label: overlay.label,
    apiToken: overlay.apiToken,
    ...(overlay.aliases?.length ? { aliases: overlay.aliases } : {}),
  };
}

/** Merge static dictionary with active admin subject overlays (id-deduped). */
export function mergeSubjectSuggestEntries(
  adminOverlays: readonly AdminSuggestionOverlay[],
): EtsyRecommendationSuggestEntry[] {
  const out: EtsyRecommendationSuggestEntry[] = [...ETSY_RECOMMENDATION_SUGGEST_DICTIONARY];
  const seenIds = new Set(out.map((entry) => entry.id));
  for (const overlay of adminOverlays) {
    if (overlay.kind !== "subject" || !overlay.active) {
      continue;
    }
    const entry = adminOverlayToSuggestEntry(overlay);
    if (seenIds.has(entry.id)) {
      continue;
    }
    seenIds.add(entry.id);
    out.push(entry);
  }
  return out;
}

/** Merge static style options with active admin style overlays. */
export function mergeStyleSuggestionLabels(
  adminOverlays: readonly AdminSuggestionOverlay[],
): string[] {
  const out: string[] = [...ETSY_RECOMMENDATION_STYLE_OPTIONS];
  const seen = new Set(out.map((style) => normalizeSuggestionLabelKey(style)));
  for (const overlay of adminOverlays) {
    if (overlay.kind !== "style" || !overlay.active) {
      continue;
    }
    const key = normalizeSuggestionLabelKey(overlay.label);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(overlay.label.trim());
  }
  return out;
}

export interface ParsedSuggestionAliasesResult {
  aliases: string[];
  error?: string;
}

/** Validate and normalize optional aliases (shared + callable). */
export function parseSuggestionAliases(raw: unknown): ParsedSuggestionAliasesResult {
  if (raw == null) {
    return { aliases: [] };
  }
  if (!Array.isArray(raw)) {
    return { aliases: [], error: "Aliases must be a list of short phrases." };
  }
  if (raw.length > ETSY_RECOMMENDATION_SUGGESTION_MAX_ALIASES) {
    return {
      aliases: [],
      error: `At most ${ETSY_RECOMMENDATION_SUGGESTION_MAX_ALIASES} aliases are allowed.`,
    };
  }
  const aliases: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== "string") {
      return { aliases: [], error: "Each alias must be text." };
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.length > ETSY_RECOMMENDATION_SUGGESTION_MAX_ALIAS_LENGTH) {
      return {
        aliases: [],
        error: `Each alias must be ${ETSY_RECOMMENDATION_SUGGESTION_MAX_ALIAS_LENGTH} characters or fewer.`,
      };
    }
    if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
      return { aliases: [], error: "Aliases cannot include control characters." };
    }
    const key = normalizeSuggestionLabelKey(trimmed);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    aliases.push(trimmed);
  }
  return { aliases };
}
