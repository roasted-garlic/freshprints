/**
 * Display-only masking of staff-defined censored terms in design title/description.
 * Does not mutate stored Firestore text. Matching is case-insensitive and whole-word /
 * whole-phrase aware (so `ass` does not match inside `class`).
 */

const WORD_CHAR = /[A-Za-z0-9]/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCensoredTerms(terms: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of terms) {
    if (typeof raw !== "string") {
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(trimmed);
  }

  // Longer phrases first so "eat my ass" wins over "ass" when both are listed.
  normalized.sort((left, right) => right.length - left.length);
  return normalized;
}

function maskMatchedSpan(matched: string): string {
  let result = "";
  for (const char of matched) {
    result += WORD_CHAR.test(char) ? "*" : char;
  }
  return result;
}

function buildTermPattern(term: string): RegExp {
  const escaped = escapeRegExp(term);
  // Whole-word / whole-phrase: no alphanumeric immediately before or after the match.
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "gi");
}

/**
 * Replace every staff term occurrence in `text` per product masking rules.
 * Empty/missing terms → returns `text` unchanged.
 */
export function maskCensoredDesignText(text: string, terms: readonly string[] | undefined): string {
  if (!text || !terms || terms.length === 0) {
    return text;
  }

  const normalizedTerms = normalizeCensoredTerms(terms);
  if (normalizedTerms.length === 0) {
    return text;
  }

  let result = text;
  for (const term of normalizedTerms) {
    const pattern = buildTermPattern(term);
    result = result.replace(pattern, (matched) => maskMatchedSpan(matched));
  }
  return result;
}

/**
 * Portal display gate: mask only when explicit + Censored mode + terms present.
 * `showExplicitContent === true` means Uncensored preference.
 * `sessionRevealed === true` means Click-to-reveal on Design Details / Share for this design —
 * same session gate as the image blur (does not change the global preference).
 */
export function resolvePortalCensoredDisplayText(input: {
  text: string;
  isExplicitContent?: boolean;
  censoredTerms?: readonly string[];
  showExplicitContent: boolean;
  sessionRevealed?: boolean;
}): string {
  if (input.showExplicitContent || input.sessionRevealed === true) {
    return input.text;
  }
  if (input.isExplicitContent !== true) {
    return input.text;
  }
  return maskCensoredDesignText(input.text, input.censoredTerms);
}
