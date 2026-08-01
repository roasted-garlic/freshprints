import type { Design } from "../../designs/types/design.types";

const PICKER_VISIBLE_LIMIT = 80;

/**
 * Title/id search for Assisted “Share a library design”.
 * Empty needle returns all candidates (caller may already have capped the list).
 */
export function filterAssistedCatalogDesignsBySearch(
  designs: readonly Design[],
  searchQuery: string,
): Design[] {
  const needle = searchQuery.trim().toLowerCase();
  if (!needle) {
    return [...designs];
  }
  return designs.filter((design) => {
    const title = design.title?.toLowerCase() ?? "";
    const id = design.id.toLowerCase();
    return title.includes(needle) || id.includes(needle);
  });
}

export function limitAssistedCatalogPickerDesigns(designs: readonly Design[]): Design[] {
  return designs.slice(0, PICKER_VISIBLE_LIMIT);
}

export function assistedCatalogPickerEmptyMessage(options: {
  isLoading: boolean;
  isUnavailable: boolean;
  catalogCount: number;
  filteredCount: number;
  searchQuery: string;
}): string | null {
  if (options.isLoading) {
    return "Loading ready designs…";
  }
  if (options.isUnavailable) {
    return "Ready designs are temporarily unavailable. Try again in a moment.";
  }
  if (options.catalogCount === 0) {
    return "No ready Design Library designs are available yet.";
  }
  if (options.filteredCount === 0) {
    return options.searchQuery.trim()
      ? "No ready designs match that search."
      : "No ready Design Library designs are available yet.";
  }
  return null;
}

/** Exported for tests — matches modal display cap. */
export const ASSISTED_CATALOG_PICKER_VISIBLE_LIMIT = PICKER_VISIBLE_LIMIT;
