/**
 * Honest Design Library count chip labels.
 * Never present an unfiltered library total as a client-page-local filtered total.
 */

export type DesignLibraryCountLabelMode =
  | "browse-unfiltered"
  | "browse-client-filtered"
  | "managed-search"
  | "managed-search-client-narrowed"
  | "managed-unavailable"
  | "counting";

export function resolveDesignLibraryCountLabel(args: {
  mode: DesignLibraryCountLabelMode;
  libraryTotal: number | null;
  managedTotal: number | null;
  loadedMatchingCount: number;
}): string {
  const plural = (n: number) => (n === 1 ? "design" : "designs");

  switch (args.mode) {
    case "counting":
      return "Counting designs…";
    case "managed-unavailable":
      return "Search unavailable";
    case "managed-search":
      if (args.managedTotal === null) {
        return "Searching…";
      }
      return `${args.managedTotal} ${args.managedTotal === 1 ? "result" : "results"}`;
    case "managed-search-client-narrowed":
      return `${args.loadedMatchingCount} matching (loaded)`;
    case "browse-client-filtered":
      return `${args.loadedMatchingCount} matching (loaded)`;
    case "browse-unfiltered":
      if (args.libraryTotal === null) {
        return "Counting designs…";
      }
      return `${args.libraryTotal} ${plural(args.libraryTotal)}`;
    default:
      return `${args.loadedMatchingCount} ${plural(args.loadedMatchingCount)}`;
  }
}

export function resolveDesignLibraryCountLabelMode(args: {
  managedSearchActive: boolean;
  managedSearchUnavailable: boolean;
  needsCompanionFilter: boolean;
  hasClientCategoryOrTags: boolean;
  /** Archived (or other) client-side text search over loaded pages only. */
  hasClientPageLocalSearch: boolean;
  includeArchived: boolean;
}): DesignLibraryCountLabelMode {
  if (args.managedSearchActive) {
    if (args.managedSearchUnavailable) {
      return "managed-unavailable";
    }
    if (args.needsCompanionFilter) {
      return "managed-search-client-narrowed";
    }
    return "managed-search";
  }

  if (
    args.hasClientCategoryOrTags ||
    args.needsCompanionFilter ||
    args.hasClientPageLocalSearch
  ) {
    return "browse-client-filtered";
  }

  return "browse-unfiltered";
}
