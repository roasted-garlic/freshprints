import type { PrintRequestItem } from "../types/printRequest/printRequest.types";

/** Minimal fields needed to place a duplicate relative to its source. */
export interface PrintRequestItemSortAnchor {
  id: string;
  sortOrder?: number;
}

function getTimestampMillis(value: PrintRequestItem["createdAt"] | undefined): number {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  return 0;
}

function getSortOrder(value: PrintRequestItemSortAnchor): number | undefined {
  return typeof value.sortOrder === "number" && Number.isFinite(value.sortOrder)
    ? value.sortOrder
    : undefined;
}

function compareSortAnchors(
  left: PrintRequestItemSortAnchor & { createdAtMillis?: number },
  right: PrintRequestItemSortAnchor & { createdAtMillis?: number },
): number {
  const leftSortOrder = getSortOrder(left);
  const rightSortOrder = getSortOrder(right);

  // Only compare by sortOrder when BOTH rows have one. Otherwise fall through to
  // createdAt so legacy / customer-upload rows without sortOrder stay chronological
  // (newest-first must not promote an older upload to the front just because it lacks
  // sortOrder).
  if (leftSortOrder !== undefined && rightSortOrder !== undefined && leftSortOrder !== rightSortOrder) {
    return leftSortOrder - rightSortOrder;
  }

  const leftCreated = left.createdAtMillis ?? 0;
  const rightCreated = right.createdAtMillis ?? 0;
  if (leftCreated !== rightCreated) {
    return leftCreated - rightCreated;
  }

  // Prefer the row that has a sortOrder when timestamps tie.
  if (leftSortOrder !== undefined && rightSortOrder === undefined) {
    return -1;
  }
  if (leftSortOrder === undefined && rightSortOrder !== undefined) {
    return 1;
  }

  return left.id.localeCompare(right.id);
}

/**
 * Ascending display order: sortOrder (when both present), then createdAt, then id.
 * Prefer {@link sortPrintRequestItemsNewestFirst} for Studio/Portal request grids.
 */
export function sortPrintRequestItemsForDisplay(items: PrintRequestItem[]): PrintRequestItem[] {
  return [...items].sort((left, right) =>
    compareSortAnchors(
      {
        id: left.id,
        sortOrder: left.sortOrder,
        createdAtMillis: getTimestampMillis(left.createdAt),
      },
      {
        id: right.id,
        sortOrder: right.sortOrder,
        createdAtMillis: getTimestampMillis(right.createdAt),
      },
    ),
  );
}

/**
 * Request design grids (Portal + Studio): last-added first (highest sortOrder / newest createdAt).
 * Persisted sortOrder values remain ascending appends; this only reverses presentation.
 */
export function sortPrintRequestItemsNewestFirst(items: PrintRequestItem[]): PrintRequestItem[] {
  return [...items].sort((left, right) =>
    compareSortAnchors(
      {
        id: right.id,
        sortOrder: right.sortOrder,
        createdAtMillis: getTimestampMillis(right.createdAt),
      },
      {
        id: left.id,
        sortOrder: left.sortOrder,
        createdAtMillis: getTimestampMillis(left.createdAt),
      },
    ),
  );
}

/** Next append sortOrder for a new request item (1-based; gaps from duplicates are fine). */
export function resolveNextPrintRequestItemSortOrder(
  items: Array<{ sortOrder?: number }>,
): number {
  let max = 0;
  for (const item of items) {
    if (typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)) {
      max = Math.max(max, item.sortOrder);
    }
  }
  return max + 1;
}

/**
 * Sort order for a duplicate that should appear immediately after `sourceItemId`
 * in **ascending** display order (to the right in LTR grids that sort oldest→newest).
 * Studio uses this with ascending display.
 *
 * When the source has no `sortOrder`, returns an anchor so the caller can persist
 * `sourceSortOrderUpdate` on the source and `duplicateSortOrder` on the new item.
 *
 * Pass the request's sibling items (any order); they are sorted with the same rules as
 * `sortPrintRequestItemsForDisplay` when `createdAtMillis` is provided.
 */
export function resolveDuplicateInsertAfterSortOrder(input: {
  sourceItemId: string;
  items: Array<PrintRequestItemSortAnchor & { createdAtMillis?: number }>;
}): {
  duplicateSortOrder: number;
  sourceSortOrderUpdate?: number;
} {
  const sortedItems = [...input.items].sort(compareSortAnchors);

  const sourceIndex = sortedItems.findIndex((entry) => entry.id === input.sourceItemId);
  const sourceItem = sourceIndex >= 0 ? sortedItems[sourceIndex] : undefined;
  const sourceSortOrder = sourceItem ? getSortOrder(sourceItem) : undefined;

  if (sourceSortOrder !== undefined) {
    const nextItem =
      sourceIndex >= 0 && sourceIndex < sortedItems.length - 1
        ? sortedItems[sourceIndex + 1]
        : undefined;
    const nextSortOrder = nextItem ? getSortOrder(nextItem) : undefined;

    const duplicateSortOrder =
      nextSortOrder !== undefined && nextSortOrder > sourceSortOrder
        ? (sourceSortOrder + nextSortOrder) / 2
        : sourceSortOrder + 0.5;

    return { duplicateSortOrder };
  }

  const anchoredOrder = (Math.max(sourceIndex, 0) + 1) * 100;
  return {
    duplicateSortOrder: anchoredOrder + 50,
    sourceSortOrderUpdate: anchoredOrder,
  };
}

/**
 * Sort order for a duplicate that should appear immediately to the **right** of
 * `sourceItemId` when the UI uses {@link sortPrintRequestItemsNewestFirst}
 * (descending sortOrder). Under that display, visual-right is a lower fractional
 * sortOrder than the source (insert-before in ascending sort-space).
 *
 * Portal duplicate callable + optimistic UI use this. Studio request grids use the same
 * newest-first display and this insert-before helper for visual-right duplicates.
 */
export function resolveDuplicateInsertBeforeSortOrder(input: {
  sourceItemId: string;
  items: Array<PrintRequestItemSortAnchor & { createdAtMillis?: number }>;
}): {
  duplicateSortOrder: number;
  sourceSortOrderUpdate?: number;
} {
  const sortedItems = [...input.items].sort(compareSortAnchors);

  const sourceIndex = sortedItems.findIndex((entry) => entry.id === input.sourceItemId);
  const sourceItem = sourceIndex >= 0 ? sortedItems[sourceIndex] : undefined;
  const sourceSortOrder = sourceItem ? getSortOrder(sourceItem) : undefined;

  if (sourceSortOrder !== undefined) {
    const previousItem = sourceIndex > 0 ? sortedItems[sourceIndex - 1] : undefined;
    const previousSortOrder = previousItem ? getSortOrder(previousItem) : undefined;

    const duplicateSortOrder =
      previousSortOrder !== undefined && previousSortOrder < sourceSortOrder
        ? (previousSortOrder + sourceSortOrder) / 2
        : sourceSortOrder - 0.5;

    return { duplicateSortOrder };
  }

  const anchoredOrder = (Math.max(sourceIndex, 0) + 1) * 100;
  return {
    duplicateSortOrder: anchoredOrder - 50,
    sourceSortOrderUpdate: anchoredOrder,
  };
}
