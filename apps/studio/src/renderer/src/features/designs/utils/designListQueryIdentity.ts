import type { DesignListQuery } from "../types/designQuery.types";

const DEFAULT_LIST_LIMIT = 100;

/**
 * Hook reload identity for `useDesigns` — must include every filter that changes the
 * Firestore query, including Needs Companion (`companionSetIncomplete`).
 * Cursor is intentionally omitted (owned by pagination state, not the query key).
 */
export function serializeDesignListQueryKey(listQuery: DesignListQuery): string {
  return JSON.stringify({
    aiReviewStatus: listQuery.aiReviewStatus,
    categoryId: listQuery.categoryId,
    companionSetIncomplete: listQuery.companionSetIncomplete === true ? true : undefined,
    limitCount: listQuery.limitCount,
    sortDirection: listQuery.sortDirection,
    sortField: listQuery.sortField,
    status: listQuery.status,
    statusIn: listQuery.statusIn,
    tag: listQuery.tag,
  });
}

/**
 * Page/count cache identity for `designService` — same filters as the hook key, plus cursor
 * and normalized limit/sort defaults used by cached page fetches.
 */
export function getDesignListQueryCacheKey(
  listQuery: DesignListQuery = {},
  options?: { defaultLimitCount?: number },
): string {
  const defaultLimit = options?.defaultLimitCount ?? DEFAULT_LIST_LIMIT;
  const normalizedStatus =
    listQuery.statusIn?.length === 1 ? listQuery.statusIn[0] : listQuery.status;
  const normalizedStatusIn =
    listQuery.statusIn && listQuery.statusIn.length > 1
      ? [...listQuery.statusIn].sort()
      : undefined;

  return JSON.stringify({
    aiReviewStatus: listQuery.aiReviewStatus,
    categoryId: listQuery.categoryId,
    companionSetIncomplete: listQuery.companionSetIncomplete === true ? true : undefined,
    cursor: listQuery.cursor
      ? [listQuery.cursor.designId, listQuery.cursor.sortMillis]
      : undefined,
    limitCount: listQuery.limitCount ?? defaultLimit,
    sortDirection: listQuery.sortDirection ?? "desc",
    sortField: listQuery.sortField ?? "updatedAt",
    status: normalizedStatus,
    statusIn: normalizedStatusIn,
    tag: listQuery.tag?.trim().toLowerCase(),
  });
}
