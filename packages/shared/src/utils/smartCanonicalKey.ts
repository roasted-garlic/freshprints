/**
 * Safe deterministic canonical key for Smart Profile tokens.
 * Case / whitespace / punctuation / separator folding + obvious plural fold.
 * Does NOT perform semantic synonym collapse (teacher≠educator, cow≠highland cow).
 */

const SEPARATOR_PATTERN = /[\s_/\\|+·•–—-]+/g;
const PUNCT_PATTERN = /[^\p{L}\p{N}\s]/gu;

/** Common plural → singular for short tokens where meaning is preserved. Not a semantic rewrite table. */
const OBVIOUS_PLURAL_EXCEPTIONS = new Map<string, string>([
  ["people", "people"],
  ["children", "child"],
  ["mice", "mouse"],
  ["geese", "goose"],
  ["teeth", "tooth"],
  ["feet", "foot"],
  ["men", "man"],
  ["women", "woman"],
]);

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function foldObviousPluralToken(token: string): string {
  if (token.length < 3) {
    return token;
  }

  const exception = OBVIOUS_PLURAL_EXCEPTIONS.get(token);
  if (exception) {
    return exception;
  }

  // ies → y (parties → party) — only when stem is letters
  if (token.length >= 4 && token.endsWith("ies") && !/[aeiou]ies$/.test(token)) {
    return `${token.slice(0, -3)}y`;
  }

  // ses/xes/ches/shes → drop es
  if (
    token.length >= 5 &&
    (token.endsWith("sses") ||
      token.endsWith("xes") ||
      token.endsWith("ches") ||
      token.endsWith("shes"))
  ) {
    return token.slice(0, -2);
  }

  // simple trailing s (not ss, us, is)
  if (
    token.length >= 4 &&
    token.endsWith("s") &&
    !token.endsWith("ss") &&
    !token.endsWith("us") &&
    !token.endsWith("is")
  ) {
    return token.slice(0, -1);
  }

  return token;
}

/**
 * Build a match key for exact/canonical equivalence.
 * Display form is chosen separately (prefer existing vocab display).
 */
export function smartCanonicalKey(value: string): string {
  const collapsed = collapseWhitespace(value);
  if (!collapsed) {
    return "";
  }

  const lower = collapsed.toLowerCase();
  const withoutPunct = lower.replace(PUNCT_PATTERN, " ");
  const separatorsNormalized = withoutPunct.replace(SEPARATOR_PATTERN, " ");
  const spaced = collapseWhitespace(separatorsNormalized);
  if (!spaced) {
    return "";
  }

  return spaced
    .split(" ")
    .map(foldObviousPluralToken)
    .filter(Boolean)
    .join(" ");
}

/** Map of smartCanonicalKey → preferred display string (first/canonical winner). */
export type SmartCanonicalVocabMap = ReadonlyMap<string, string>;

export function buildSmartCanonicalVocabMap(
  values: readonly string[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!values) {
    return map;
  }

  for (const raw of values) {
    if (typeof raw !== "string") {
      continue;
    }
    const display = collapseWhitespace(raw);
    if (!display) {
      continue;
    }
    const key = smartCanonicalKey(display);
    if (!key || map.has(key)) {
      continue;
    }
    map.set(key, display);
  }

  return map;
}

/**
 * Exact/canonical match onto bounded vocab. Preserves novel terms when unmatched.
 * Never rewrites via loose semantic synonyms.
 */
export function matchExactCanonicalDisplay(
  value: string,
  vocab: SmartCanonicalVocabMap | undefined,
): string {
  const display = collapseWhitespace(value);
  if (!display) {
    return "";
  }

  if (!vocab || vocab.size === 0) {
    return display;
  }

  const key = smartCanonicalKey(display);
  if (!key) {
    return display;
  }

  return vocab.get(key) ?? display;
}
