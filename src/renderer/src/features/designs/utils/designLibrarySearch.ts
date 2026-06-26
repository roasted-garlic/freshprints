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
