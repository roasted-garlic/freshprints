/**
 * Normalizes catalog search text for case- and separator-insensitive matching.
 * Separators: whitespace, underscore, hyphen (and runs thereof).
 * This is normalization only — not fuzzy/typo tolerance.
 */
export function normalizeCatalogSearchToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Progressive substring match on normalized haystack text.
 *
 * Each additional typed character narrows results: `sum` matches `assumptions`,
 * `summ` drops rows without `summ`, and `summer` matches `summerween` because the
 * normalized title still contains the `summer` prefix.
 */
export function catalogSearchTokensMatch(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeCatalogSearchToken(needle);
  if (!normalizedNeedle) {
    return true;
  }

  return normalizeCatalogSearchToken(haystack).includes(normalizedNeedle);
}

/** Alias for tag-label filtering; same progressive substring semantics. */
export function catalogSearchTagLabelMatch(tagLabel: string, needle: string): boolean {
  return catalogSearchTokensMatch(tagLabel, needle);
}
