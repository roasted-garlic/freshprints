import type { CatalogDesign } from '../types/catalog.types';
import { catalogDesignTextMatchesSearch } from '@fresh-prints/shared/utils/catalogDesignTextSearch';

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
        id: design.id,
        title: design.title,
        description: design.description,
      },
      normalizedQuery,
    ),
  );
}

/**
 * Client post-filters after catalog load.
 *
 * When Algolia managed search already applied `q` / category, do **not** re-apply local text search
 * — that drops Smart Profile hits (searchConcepts, themes, …)
 * that are not present in legacy design text (Slice 3 DEV QA FAIL).
 */
export function resolveManagedSearchClientFilters(options: {
  isManagedSearchQuery: boolean;
  searchQuery?: string;
  categoryId?: string;
  halftoneFilterOn?: boolean;
}): {
  search: string;
  categoryId: string | undefined;
  halftoneFilterOn: boolean;
} {
  if (options.isManagedSearchQuery) {
    return { search: '', categoryId: undefined, halftoneFilterOn: false };
  }
  return {
    search: options.searchQuery?.trim() ? (options.searchQuery ?? '') : '',
    categoryId: options.categoryId,
    halftoneFilterOn: options.halftoneFilterOn === true,
  };
}

/** Apply the human-only Halftone staff decision without consulting legacy tags. */
export function filterCatalogDesignsByHalftone(
  designs: CatalogDesign[],
  halftoneFilterOn: boolean,
): CatalogDesign[] {
  return halftoneFilterOn ? designs.filter((design) => design.isHalftone === true) : designs;
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
