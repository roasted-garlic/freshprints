import type { CatalogDesign } from '../types/catalog.types';
import { catalogDesignTextMatchesSearch } from '@fresh-prints/shared/utils/catalogDesignTextSearch';
import { catalogSearchTokensMatch } from '@fresh-prints/shared/utils/catalogSearchNormalization';

/** Canonical design tag synced by staff Halftone confirmation (ADR-FP-080). */
export const CANONICAL_HALFTONE_TAG = 'halftone';

export function isCanonicalHalftoneTag(tag: string): boolean {
  return tag.trim().toLowerCase() === CANONICAL_HALFTONE_TAG;
}

export function selectedTagsIncludeHalftone(selectedTags: readonly string[]): boolean {
  return selectedTags.some(isCanonicalHalftoneTag);
}

/** Non-halftone selected tags (for Tags button count / active chips). */
export function visibleSelectedTags(selectedTags: readonly string[]): string[] {
  return selectedTags.filter((tag) => !isCanonicalHalftoneTag(tag));
}

export function countVisibleSelectedTags(selectedTags: readonly string[]): number {
  return visibleSelectedTags(selectedTags).length;
}

export function setHalftoneInSelectedTags(
  selectedTags: readonly string[],
  halftoneOn: boolean,
): string[] {
  const withoutHalftone = visibleSelectedTags(selectedTags);
  if (!halftoneOn) {
    return sortCatalogTags(withoutHalftone);
  }
  return sortCatalogTags([...withoutHalftone, CANONICAL_HALFTONE_TAG]);
}

export function getPrimaryCatalogQueryTag(selectedTags: readonly string[]): string | undefined {
  if (selectedTagsIncludeHalftone(selectedTags)) {
    return CANONICAL_HALFTONE_TAG;
  }

  const visible = visibleSelectedTags(selectedTags);
  return visible[0];
}

export function buildApprovedCatalogTagOptions(
  approvedTags: readonly { name: string; count?: number }[],
  selectedTags: string[],
  tagSearchQuery: string,
): Array<{ tag: string; count?: number; isSelected: boolean }> {
  const normalizedSearch = tagSearchQuery.trim().toLowerCase();
  const countByName = new Map(approvedTags.map((tag) => [tag.name, tag.count]));

  return sortCatalogTags(approvedTags.map((tag) => tag.name))
    .filter((tag) => !isCanonicalHalftoneTag(tag))
    .filter((tag) => !normalizedSearch || catalogSearchTokensMatch(tag, normalizedSearch))
    .map((tag) => ({
      tag,
      count: countByName.get(tag),
      isSelected: selectedTags.includes(tag),
    }));
}

export function filterCatalogDesignsBySearch(
  designs: CatalogDesign[],
  searchQuery: string,
): CatalogDesign[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return designs;
  }

  return designs.filter((design) =>
    catalogDesignTextMatchesSearch(
      {
        title: design.title,
        description: design.description,
        tags: design.tags,
      },
      normalizedQuery,
    ),
  );
}

/**
 * Client post-filters after catalog load.
 *
 * When Algolia managed search already applied `q` / tags / category, do **not** re-apply
 * title/description/tags search — that drops Smart Profile hits (searchConcepts, themes, …)
 * that are not present in legacy design text (Slice 3 DEV QA FAIL).
 */
export function resolveManagedSearchClientFilters(options: {
  isManagedSearchQuery: boolean;
  searchQuery?: string;
  categoryId?: string;
  selectedTags: string[];
}): {
  search: string;
  categoryId: string | undefined;
  selectedTags: string[];
} {
  if (options.isManagedSearchQuery) {
    return { search: '', categoryId: undefined, selectedTags: [] };
  }
  return {
    search: options.searchQuery?.trim() ? (options.searchQuery ?? '') : '',
    categoryId: options.categoryId,
    selectedTags: options.selectedTags,
  };
}

export function filterCatalogDesignsByCategory(
  designs: CatalogDesign[],
  categoryId?: string,
): CatalogDesign[] {
  if (!categoryId?.trim()) {
    return designs;
  }

  return designs.filter((design) => design.categoryId === categoryId);
}

export function filterCatalogDesignsByTags(
  designs: CatalogDesign[],
  selectedTags: string[],
): CatalogDesign[] {
  if (selectedTags.length === 0) {
    return designs;
  }

  return designs.filter((design) => selectedTags.every((tag) => design.tags.includes(tag)));
}

export function sortCatalogTags(tags: string[]): string[] {
  return [...tags].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

export function buildCatalogTagOptions(
  designs: CatalogDesign[],
  selectedTags: string[],
  tagSearchQuery: string,
): Array<{ tag: string; count: number; isSelected: boolean }> {
  const normalizedSearch = tagSearchQuery.trim().toLowerCase();
  const tagCounts = new Map<string, number>();

  for (const design of designs) {
    const uniqueTags = new Set(design.tags);

    for (const tag of uniqueTags) {
      if (selectedTags.length > 0 && !selectedTags.every((selectedTag) => design.tags.includes(selectedTag))) {
        continue;
      }

      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return sortCatalogTags([...tagCounts.keys()])
    .filter((tag) => !isCanonicalHalftoneTag(tag))
    .filter((tag) => !normalizedSearch || catalogSearchTokensMatch(tag, normalizedSearch))
    .map((tag) => ({
      tag,
      count: tagCounts.get(tag) ?? 0,
      isSelected: selectedTags.includes(tag),
    }));
}
