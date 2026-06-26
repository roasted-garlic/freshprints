import type { DesignStatus } from "../types/designStatus.types";

export const DESIGN_LIBRARY_SEARCH_QUERY_PARAM = "search";
export const DESIGN_LIBRARY_CATEGORY_QUERY_PARAM = "category";
export const DESIGN_LIBRARY_TAGS_QUERY_PARAM = "tags";
export const DESIGN_LIBRARY_ARCHIVED_QUERY_PARAM = "archived";

/** @deprecated Legacy URL param — stripped on load; imported/processing redirects to AI Review */
export const DESIGN_LIBRARY_STATUS_QUERY_PARAM = "status";
/** @deprecated Legacy single-tag param — migrated to `tags` */
export const DESIGN_LIBRARY_TAG_QUERY_PARAM = "tag";
/** @deprecated Legacy URL param — stripped on load */
export const DESIGN_LIBRARY_AI_REVIEW_QUERY_PARAM = "aiReview";

export const DESIGN_LIBRARY_CATALOG_STATUSES = ["ready"] as const satisfies readonly DesignStatus[];
export const DESIGN_LIBRARY_ARCHIVED_STATUSES = ["archived"] as const satisfies readonly DesignStatus[];

/** @deprecated Use DESIGN_LIBRARY_ARCHIVED_STATUSES — archived view is archived-only, not ready+archived */
export const DESIGN_LIBRARY_CATALOG_WITH_ARCHIVED_STATUSES = DESIGN_LIBRARY_ARCHIVED_STATUSES;

export const AI_REVIEW_PATH = "/ai-review";

export interface DesignLibraryUrlFilters {
  archived?: boolean;
  categoryId?: string;
  search?: string;
  tags?: string[];
}

export function normalizeDesignLibraryTag(value: string): string {
  return value.trim().toLowerCase();
}

export function parseDesignLibraryTagsParam(value: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }

  const uniqueTags = new Set<string>();

  for (const part of value.split(",")) {
    const normalizedTag = normalizeDesignLibraryTag(part);

    if (normalizedTag) {
      uniqueTags.add(normalizedTag);
    }
  }

  return [...uniqueTags].sort((left, right) => left.localeCompare(right));
}

export function parseDesignLibraryArchivedParam(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();

  return normalizedValue === "1" || normalizedValue === "true" || normalizedValue === "yes";
}

export function parseDesignLibraryUrlFilters(searchParams: URLSearchParams): DesignLibraryUrlFilters {
  const legacyTag = searchParams.get(DESIGN_LIBRARY_TAG_QUERY_PARAM);
  const tagsFromQuery = parseDesignLibraryTagsParam(searchParams.get(DESIGN_LIBRARY_TAGS_QUERY_PARAM));

  if (legacyTag && tagsFromQuery.length === 0) {
    const normalizedLegacyTag = normalizeDesignLibraryTag(legacyTag);

    if (normalizedLegacyTag) {
      tagsFromQuery.push(normalizedLegacyTag);
    }
  }

  const categoryId = searchParams.get(DESIGN_LIBRARY_CATEGORY_QUERY_PARAM)?.trim();

  return {
    archived: parseDesignLibraryArchivedParam(searchParams.get(DESIGN_LIBRARY_ARCHIVED_QUERY_PARAM)),
    categoryId: categoryId || undefined,
    search: searchParams.get(DESIGN_LIBRARY_SEARCH_QUERY_PARAM)?.trim() || undefined,
    tags: tagsFromQuery.length > 0 ? tagsFromQuery : undefined,
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

  if (filters.search?.trim()) {
    searchParams.set(DESIGN_LIBRARY_SEARCH_QUERY_PARAM, filters.search.trim());
  }

  if (filters.categoryId) {
    searchParams.set(DESIGN_LIBRARY_CATEGORY_QUERY_PARAM, filters.categoryId);
  }

  if (filters.tags && filters.tags.length > 0) {
    searchParams.set(DESIGN_LIBRARY_TAGS_QUERY_PARAM, filters.tags.join(","));
  }

  if (filters.archived) {
    searchParams.set(DESIGN_LIBRARY_ARCHIVED_QUERY_PARAM, "true");
  }

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

export function buildCatalogDesignListQuery(options: {
  archived: boolean;
  categoryId?: string;
  tags: string[];
}): {
  categoryId?: string;
  statusIn: DesignStatus[];
  tag?: string;
} {
  return {
    categoryId: options.categoryId,
    statusIn: options.archived
      ? [...DESIGN_LIBRARY_ARCHIVED_STATUSES]
      : [...DESIGN_LIBRARY_CATALOG_STATUSES],
    tag: options.tags[0],
  };
}
