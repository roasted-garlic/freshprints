import type { CatalogDesign } from '../types/catalog.types';

export function filterCatalogDesignsBySearch(
  designs: CatalogDesign[],
  searchQuery: string,
): CatalogDesign[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return designs;
  }

  return designs.filter((design) => {
    const titleMatches = design.title.toLowerCase().includes(normalizedQuery);
    const descriptionMatches = design.description?.toLowerCase().includes(normalizedQuery) ?? false;
    const tagMatches = design.tags.some((tag) => tag.includes(normalizedQuery));

    return titleMatches || descriptionMatches || tagMatches;
  });
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
    .filter((tag) => !normalizedSearch || tag.includes(normalizedSearch))
    .map((tag) => ({
      tag,
      count: tagCounts.get(tag) ?? 0,
      isSelected: selectedTags.includes(tag),
    }));
}
