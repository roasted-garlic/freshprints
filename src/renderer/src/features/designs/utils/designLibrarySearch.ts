import type { Design } from "../types/design.types";

export function filterDesignsBySearch(designs: Design[], searchQuery: string): Design[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return designs;
  }

  return designs.filter((design) => {
    const titleMatches = design.title.toLowerCase().includes(normalizedQuery);
    const tagMatches = design.tags.some((tag) => tag.includes(normalizedQuery));

    return titleMatches || tagMatches;
  });
}
