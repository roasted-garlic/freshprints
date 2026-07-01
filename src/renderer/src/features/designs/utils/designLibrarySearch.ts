import type { Category } from "../types/category.types";
import type { AiReviewStatus } from "../types/aiReview.types";
import type { CatalogTag } from "../types/catalogTag.types";
import type { Design } from "../types/design.types";
import { resolveDesignAiReviewDisplay } from "./aiReviewState";

export function filterDesignsBySearch(designs: Design[], searchQuery: string): Design[] {
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

export function filterDesignsByAiReviewStatus(
  designs: Design[],
  aiReviewStatus: AiReviewStatus | undefined,
): Design[] {
  if (!aiReviewStatus) {
    return designs;
  }

  return designs.filter(
    (design) => resolveDesignAiReviewDisplay(design).aiReviewStatus === aiReviewStatus,
  );
}

export function filterDesignsByTags(designs: Design[], selectedTags: string[]): Design[] {
  if (selectedTags.length === 0) {
    return designs;
  }

  return designs.filter((design) =>
    selectedTags.every((tag) => design.tags.includes(tag)),
  );
}

export function filterDesignsByCategory(designs: Design[], categoryId?: string): Design[] {
  if (!categoryId?.trim()) {
    return designs;
  }

  return designs.filter((design) => design.categoryId === categoryId);
}

export function sortTagsAlphabetically(tags: string[]): string[] {
  return [...tags].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

export function filterTagsBySearch(availableTags: string[], searchQuery: string): string[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return sortTagsAlphabetically(availableTags);
  }

  return sortTagsAlphabetically(
    availableTags.filter((tag) => tag.includes(normalizedQuery)),
  );
}

function normalizeTagLookupValue(value: string): string {
  return value.trim().toLowerCase();
}

function buildCatalogTagLookup(catalogTags: readonly CatalogTag[] = []): Map<string, CatalogTag> {
  const lookup = new Map<string, CatalogTag>();

  for (const catalogTag of catalogTags) {
    if (catalogTag.status !== "approved") {
      continue;
    }

    lookup.set(normalizeTagLookupValue(catalogTag.name), catalogTag);
    for (const alias of catalogTag.aliases) {
      lookup.set(normalizeTagLookupValue(alias), catalogTag);
    }
  }

  return lookup;
}

function tagMatchesCatalogSearch(
  tag: string,
  normalizedSearch: string,
  catalogTagLookup: Map<string, CatalogTag>,
): boolean {
  if (!normalizedSearch) {
    return true;
  }

  const normalizedTag = normalizeTagLookupValue(tag);

  if (normalizedTag.includes(normalizedSearch)) {
    return true;
  }

  const catalogTag = catalogTagLookup.get(normalizedTag);

  if (!catalogTag) {
    return false;
  }

  return (
    catalogTag.name.toLowerCase().includes(normalizedSearch) ||
    catalogTag.aliases.some((alias) => alias.toLowerCase().includes(normalizedSearch)) ||
    catalogTag.preferredWhen.toLowerCase().includes(normalizedSearch)
  );
}

function sortFacetedTagsByCatalogStatus(
  facetedTags: FacetedTag[],
  catalogTagLookup: Map<string, CatalogTag>,
): FacetedTag[] {
  return [...facetedTags].sort((left, right) => {
    const leftApproved = catalogTagLookup.has(normalizeTagLookupValue(left.tag));
    const rightApproved = catalogTagLookup.has(normalizeTagLookupValue(right.tag));

    if (leftApproved !== rightApproved) {
      return leftApproved ? -1 : 1;
    }

    return left.tag.localeCompare(right.tag, undefined, { sensitivity: "base" });
  });
}

export function collectUniqueDesignTags(designs: Design[]): string[] {
  const tagSet = new Set<string>();

  for (const design of designs) {
    for (const tag of design.tags) {
      tagSet.add(tag);
    }
  }

  return sortTagsAlphabetically([...tagSet]);
}

export function collectUsedCategoryIds(designs: Design[]): string[] {
  const usedCategoryIds = new Set<string>();

  for (const design of designs) {
    if (design.categoryId?.trim()) {
      usedCategoryIds.add(design.categoryId);
    }
  }

  return [...usedCategoryIds].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

export interface CategoryFilterOption {
  label: string;
  value: string;
}

export function buildCategoryFilterOptions(params: {
  allOptionValue: string;
  categories: Category[];
  designs: Design[];
  selectedCategoryId?: string;
}): CategoryFilterOption[] {
  const { allOptionValue, categories, designs, selectedCategoryId } = params;
  const usedCategoryIds = new Set(collectUsedCategoryIds(designs));
  const options: CategoryFilterOption[] = [{ label: "All categories", value: allOptionValue }];

  for (const category of categories) {
    if (!category.isActive) {
      continue;
    }

    if (!usedCategoryIds.has(category.id) && category.id !== selectedCategoryId) {
      continue;
    }

    options.push({
      label: category.name,
      value: category.id,
    });
  }

  return options;
}

export interface FacetedTag {
  tag: string;
  count: number;
  isSelected: boolean;
}

/**
 * Computes live faceted tag options from a base design set.
 *
 * `baseDesigns` must already have every non-tag filter applied (catalog/archived scope,
 * search, category). `draftSelectedTags` are the tags currently checked — typically the
 * modal's draft selection, so the list narrows live as the user toggles.
 *
 * AND semantics: a design matches the selection only if it has *all* selected tags. For
 * each candidate tag the count is how many designs match all selected tags *plus* that
 * candidate. Candidates with a zero count are dropped — that is what prevents zero-result
 * combinations. Selected tags are always returned (so they can be unchecked) and their
 * count reflects the full current selection.
 *
 * Returned tags are sorted alphabetically. Pass `tagSearchQuery` to filter labels by
 * substring (selected tags always survive the search filter).
 *
 * Limitation: counts reflect only the designs present in `baseDesigns`. Callers that load
 * the full catalog scope into memory get whole-inventory counts; callers passing a
 * paginated subset get counts for that subset only.
 */
export function computeFacetedTagsForDraftSelection(params: {
  baseDesigns: Design[];
  catalogTags?: CatalogTag[];
  draftSelectedTags: string[];
  tagSearchQuery?: string;
}): FacetedTag[] {
  const { baseDesigns, catalogTags, draftSelectedTags, tagSearchQuery } = params;
  const catalogTagLookup = buildCatalogTagLookup(catalogTags);

  // Designs already matching every selected tag — the pool every candidate narrows from.
  const selectionMatches = filterDesignsByTags(baseDesigns, draftSelectedTags);
  const selectedCount = selectionMatches.length;

  // Candidate tags are every tag present on the matching designs, plus the selected tags
  // themselves (so they remain visible even if selecting them emptied the pool).
  const candidateTags = sortTagsAlphabetically([
    ...new Set([...collectUniqueDesignTags(selectionMatches), ...draftSelectedTags]),
  ]);

  const normalizedSearch = tagSearchQuery?.trim().toLowerCase() ?? "";

  const faceted: FacetedTag[] = [];

  for (const tag of candidateTags) {
    const isSelected = draftSelectedTags.includes(tag);

    // Count designs that match the selection plus this candidate tag.
    const count = isSelected
      ? selectedCount
      : selectionMatches.filter((design) => design.tags.includes(tag)).length;

    // Hide unrelated tags that would produce zero results (selected tags always stay).
    if (count === 0 && !isSelected) {
      continue;
    }

    // Apply the tag metadata search, but never hide a selected tag.
    if (
      normalizedSearch &&
      !isSelected &&
      !tagMatchesCatalogSearch(tag, normalizedSearch, catalogTagLookup)
    ) {
      continue;
    }

    faceted.push({ tag, count, isSelected });
  }

  return sortFacetedTagsByCatalogStatus(faceted, catalogTagLookup);
}
