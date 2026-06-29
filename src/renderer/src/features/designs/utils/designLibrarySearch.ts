import type { AiReviewStatus } from "../types/aiReview.types";
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

export function collectUniqueDesignTags(designs: Design[]): string[] {
  const tagSet = new Set<string>();

  for (const design of designs) {
    for (const tag of design.tags) {
      tagSet.add(tag);
    }
  }

  return sortTagsAlphabetically([...tagSet]);
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
  draftSelectedTags: string[];
  tagSearchQuery?: string;
}): FacetedTag[] {
  const { baseDesigns, draftSelectedTags, tagSearchQuery } = params;

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

    // Apply the tag label search, but never hide a selected tag.
    if (normalizedSearch && !isSelected && !tag.includes(normalizedSearch)) {
      continue;
    }

    faceted.push({ tag, count, isSelected });
  }

  return faceted;
}
