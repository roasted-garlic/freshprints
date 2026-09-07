/**
 * Normalize a catalog phrase for punctuation-tolerant matching.
 *
 * This helper is intentionally domain-neutral. It is shared by historical
 * compatibility resolvers without importing the retired AI tag execution
 * module into the category path.
 */
export function normalizeCatalogPhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\u0027-]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
