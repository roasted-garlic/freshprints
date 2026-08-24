import { catalogSearchTokensMatch } from "./catalogSearchNormalization";

export interface CatalogDesignTextSearchFields {
  /** Optional document id; matched with a case-insensitive substring (Studio Design Library). */
  id?: string;
  title: string;
  description?: string | null;
  tags?: readonly string[];
}

/**
 * Shared progressive substring search for catalog-facing design text fields.
 * Used by Studio Design Library, Portal Catalog post-filters, and Needs Review queue.
 *
 * Semantics come from {@link catalogSearchTokensMatch}: `sum` matches anywhere in normalized
 * text, each added character narrows results, and `summer` matches `summerween`.
 */
export function catalogDesignTextMatchesSearch(
  fields: CatalogDesignTextSearchFields,
  searchQuery: string,
): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  if (fields.id?.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  if (catalogSearchTokensMatch(fields.title, normalizedQuery)) {
    return true;
  }

  if (fields.description != null && catalogSearchTokensMatch(fields.description, normalizedQuery)) {
    return true;
  }

  for (const tag of fields.tags ?? []) {
    if (catalogSearchTokensMatch(tag, normalizedQuery)) {
      return true;
    }
  }

  return false;
}

/** Regression fixtures for cross-surface "summer" search parity (Studio + Portal). */
export const CATALOG_SUMMER_SEARCH_PARITY_FIXTURES = [
  { title: "I Freaking Love Summerween Can I...", query: "sum", expect: true },
  { title: "I Freaking Love Summerween Can I...", query: "summ", expect: true },
  { title: "I Freaking Love Summerween Can I...", query: "summer", expect: true },
  { title: "The Boys Of Summer", query: "summer", expect: true },
  { title: "Teacher Summer Recharge Required", query: "sum", expect: true },
  { title: "Class Dismissed (have An Amazing Summer)", query: "sum", expect: true },
  { title: "Winter Wonderland", query: "sum", expect: false },
  { title: "consume", query: "sum", expect: true },
  { title: "consume", query: "summ", expect: false },
] as const;
