/**
 * Normalizes catalog search text for case- and separator-insensitive substring matching.
 * Separators: whitespace, underscore, hyphen (and runs thereof).
 * This is normalization only — not fuzzy/typo tolerance.
 */
export function normalizeCatalogSearchToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Returns true when normalized `needle` is a substring of normalized `haystack`.
 */
export function catalogSearchTokensMatch(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeCatalogSearchToken(needle);
  if (!normalizedNeedle) {
    return true;
  }

  return normalizeCatalogSearchToken(haystack).includes(normalizedNeedle);
}
