import type { CatalogTag } from "../types/catalogTag.types";

export interface CatalogTagSuggestion {
  /** Canonical approved tag name that will be added when this suggestion is chosen. */
  name: string;
  /** The alias the query matched, when the match came from an alias rather than the name. */
  matchedAlias?: string;
}

const MAX_TAG_SUGGESTIONS = 8;

/**
 * Build an autocomplete suggestion list of approved catalog tags for a tag input query.
 *
 * Matches the query against each approved tag's name and aliases so a user typing an alias
 * (e.g. "rock and roll") still sees — and can pick — the canonical tag ("music"). Name matches
 * rank ahead of alias matches, and prefix matches rank ahead of substring matches. Tags already
 * present in `selectedTags` are excluded so the list only offers additions.
 */
export function buildCatalogTagSuggestions(
  query: string,
  approvedTags: readonly CatalogTag[],
  selectedTags: readonly string[] = [],
): CatalogTagSuggestion[] {
  const normalizedQuery = query.trim().toLowerCase();
  const selected = new Set(selectedTags.map((tag) => tag.toLowerCase()));

  interface RankedSuggestion extends CatalogTagSuggestion {
    rank: number;
  }

  const ranked: RankedSuggestion[] = [];

  for (const tag of approvedTags) {
    if (tag.status !== "approved" || selected.has(tag.name.toLowerCase())) {
      continue;
    }

    const nameLower = tag.name.toLowerCase();
    let best: RankedSuggestion | null = null;

    const consider = (candidate: RankedSuggestion) => {
      if (!best || candidate.rank < best.rank) {
        best = candidate;
      }
    };

    // Empty query lists approved tags with featured first (autocomplete caps at MAX_TAG_SUGGESTIONS).
    // Typed queries keep name/alias match ranking so search still feels predictable.
    if (!normalizedQuery) {
      consider({ name: tag.name, rank: tag.isFeatured === true ? 0 : 2 });
    } else {
      if (nameLower.startsWith(normalizedQuery)) {
        consider({ name: tag.name, rank: 0 });
      } else if (nameLower.includes(normalizedQuery)) {
        consider({ name: tag.name, rank: 1 });
      }

      for (const alias of tag.aliases) {
        const aliasLower = alias.toLowerCase();

        if (aliasLower.startsWith(normalizedQuery)) {
          consider({ name: tag.name, matchedAlias: alias, rank: 2 });
        } else if (aliasLower.includes(normalizedQuery)) {
          consider({ name: tag.name, matchedAlias: alias, rank: 3 });
        }
      }
    }

    if (best) {
      ranked.push(best);
    }
  }

  ranked.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.name.localeCompare(b.name)));

  return ranked.slice(0, MAX_TAG_SUGGESTIONS).map(({ name, matchedAlias }) => ({ name, matchedAlias }));
}
