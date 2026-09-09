import type { DesignListSortDirection, DesignListSortField } from "../types/designQuery.types";
import type { DesignStatus } from "../types/designStatus.types";

export const DESIGN_LIBRARY_SEARCH_QUERY_PARAM = "search";
export const DESIGN_LIBRARY_CATEGORY_QUERY_PARAM = "category";
export const DESIGN_LIBRARY_ARCHIVED_QUERY_PARAM = "archived";
export const DESIGN_LIBRARY_NEEDS_COMPANION_QUERY_PARAM = "needsCompanion";
export const DESIGN_LIBRARY_MODE_QUERY_PARAM = "mode";
export const DESIGN_LIBRARY_REQUEST_ID_QUERY_PARAM = "requestId";
export const DESIGN_LIBRARY_DESIGN_ID_QUERY_PARAM = "designId";

/** @deprecated Legacy URL param — stripped on load; imported/processing redirects to AI Review */
export const DESIGN_LIBRARY_STATUS_QUERY_PARAM = "status";
/** @deprecated Legacy tag params are intentionally ignored; no tag URL contract remains. */
export const DESIGN_LIBRARY_TAG_QUERY_PARAM = "tag";
/** @deprecated Legacy tag params are intentionally ignored; no tag URL contract remains. */
export const DESIGN_LIBRARY_TAGS_QUERY_PARAM = "tags";
/** @deprecated Legacy URL param — stripped on load */
export const DESIGN_LIBRARY_AI_REVIEW_QUERY_PARAM = "aiReview";

export const DESIGN_LIBRARY_CATALOG_STATUSES = ["ready"] as const satisfies readonly DesignStatus[];
export const DESIGN_LIBRARY_ARCHIVED_STATUSES = ["archived"] as const satisfies readonly DesignStatus[];

/** @deprecated Use DESIGN_LIBRARY_ARCHIVED_STATUSES — archived view is archived-only, not ready+archived */
export const DESIGN_LIBRARY_CATALOG_WITH_ARCHIVED_STATUSES = DESIGN_LIBRARY_ARCHIVED_STATUSES;

export const AI_REVIEW_PATH = "/ai-review";

export type DesignLibraryMode = "browse" | "request-selection";

export interface DesignLibraryUrlFilters {
  archived?: boolean;
  categoryId?: string;
  mode?: DesignLibraryMode;
  /** `true` ⇒ show only designs with `companionSetIncomplete === true` ("Needs Companion"). */
  needsCompanion?: boolean;
  requestId?: string;
  search?: string;
  designId?: string;
}

function parseBooleanUrlParam(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();

  return normalizedValue === "1" || normalizedValue === "true" || normalizedValue === "yes";
}

export function parseDesignLibraryArchivedParam(value: string | null): boolean {
  return parseBooleanUrlParam(value);
}

/** Parses the `needsCompanion` URL param the same way as `archived` (true/1/yes). */
export function parseDesignLibraryNeedsCompanionParam(value: string | null): boolean {
  return parseBooleanUrlParam(value);
}

export function parseDesignLibraryUrlFilters(searchParams: URLSearchParams): DesignLibraryUrlFilters {
  const categoryId = searchParams.get(DESIGN_LIBRARY_CATEGORY_QUERY_PARAM)?.trim();
  const mode = searchParams.get(DESIGN_LIBRARY_MODE_QUERY_PARAM)?.trim();
  const requestId = searchParams.get(DESIGN_LIBRARY_REQUEST_ID_QUERY_PARAM)?.trim();

  return {
    archived: parseDesignLibraryArchivedParam(searchParams.get(DESIGN_LIBRARY_ARCHIVED_QUERY_PARAM)),
    categoryId: categoryId || undefined,
    mode: mode === "request-selection" ? "request-selection" : "browse",
    needsCompanion: parseDesignLibraryNeedsCompanionParam(
      searchParams.get(DESIGN_LIBRARY_NEEDS_COMPANION_QUERY_PARAM),
    ),
    requestId: requestId || undefined,
    search: searchParams.get(DESIGN_LIBRARY_SEARCH_QUERY_PARAM)?.trim() || undefined,
    designId: searchParams.get(DESIGN_LIBRARY_DESIGN_ID_QUERY_PARAM)?.trim() || undefined,
  };
}

export function getLegacyDesignLibraryRedirectPath(
  searchParams: URLSearchParams,
): string | null {
  const legacyStatus = searchParams.get(DESIGN_LIBRARY_STATUS_QUERY_PARAM);

  if (legacyStatus === "imported" || legacyStatus === "processing") {
    return AI_REVIEW_PATH;
  }

  return null;
}

export function buildDesignLibrarySearchParams(
  filters: DesignLibraryUrlFilters,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (filters.mode === "request-selection") {
    searchParams.set(DESIGN_LIBRARY_MODE_QUERY_PARAM, filters.mode);
  }

  if (filters.requestId?.trim()) {
    searchParams.set(DESIGN_LIBRARY_REQUEST_ID_QUERY_PARAM, filters.requestId.trim());
  }

  if (filters.search?.trim()) {
    searchParams.set(DESIGN_LIBRARY_SEARCH_QUERY_PARAM, filters.search.trim());
  }

  if (filters.categoryId) {
    searchParams.set(DESIGN_LIBRARY_CATEGORY_QUERY_PARAM, filters.categoryId);
  }


  if (filters.archived) {
    searchParams.set(DESIGN_LIBRARY_ARCHIVED_QUERY_PARAM, "true");
  }

  if (filters.needsCompanion) {
    searchParams.set(DESIGN_LIBRARY_NEEDS_COMPANION_QUERY_PARAM, "true");
  }
  if (filters.designId?.trim()) searchParams.set(DESIGN_LIBRARY_DESIGN_ID_QUERY_PARAM, filters.designId.trim());

  return searchParams;
}

export function getDesignLibraryPath(options?: DesignLibraryUrlFilters): string {
  const searchParams = buildDesignLibrarySearchParams(options ?? {});

  if ([...searchParams.keys()].length === 0) {
    return "/designs";
  }

  return `/designs?${searchParams.toString()}`;
}

export function getAiReviewPath(): string {
  return AI_REVIEW_PATH;
}

/**
 * Design Library default: most recent transition into `status: "ready"` first (`readyAt`).
 *
 * This is a server-side `orderBy`, not a page-local sort — Owner QA Amendment 3 correction. Sorting
 * a `createdAt`-ordered page by `readyAt` afterwards could never surface an old design reapproved
 * today, because that design was outside the fetched `createdAt` page to begin with.
 */
export const DESIGN_LIBRARY_DEFAULT_SORT_FIELD: DesignListSortField = "readyAt";

/**
 * Archived browse keeps `createdAt`: `readyAt` is only written on the transition into `ready`, and
 * the composite index backing the ready ordering is scoped to `status == "ready"`.
 */
export const DESIGN_LIBRARY_ARCHIVED_SORT_FIELD: DesignListSortField = "createdAt";
export const DESIGN_LIBRARY_DEFAULT_SORT_DIRECTION: DesignListSortDirection = "desc";

export function buildCatalogDesignListQuery(options: {
  archived: boolean;
  categoryId?: string;
  /** Firestore Needs Companion browse — omit for Algolia-managed / non-companion paths */
  companionSetIncomplete?: boolean;
  halftoneOnly?: boolean;
}): {
  categoryId?: string;
  companionSetIncomplete?: boolean;
  halftoneOnly?: boolean;
  sortDirection: DesignListSortDirection;
  sortField: DesignListSortField;
  statusIn: DesignStatus[];
} {
  return {
    categoryId: options.categoryId,
    ...(options.companionSetIncomplete === true
      ? { companionSetIncomplete: true as const }
      : {}),
    ...(options.halftoneOnly === true ? { halftoneOnly: true as const } : {}),
    sortDirection: DESIGN_LIBRARY_DEFAULT_SORT_DIRECTION,
    sortField: options.archived
      ? DESIGN_LIBRARY_ARCHIVED_SORT_FIELD
      : DESIGN_LIBRARY_DEFAULT_SORT_FIELD,
    statusIn: options.archived
      ? [...DESIGN_LIBRARY_ARCHIVED_STATUSES]
      : [...DESIGN_LIBRARY_CATALOG_STATUSES],
  };
}
