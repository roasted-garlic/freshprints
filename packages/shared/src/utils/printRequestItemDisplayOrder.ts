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

  if (leftSortOrder !== undefined || rightSortOrder !== undefined) {
    if (leftSortOrder === undefined) {
      return 1;
    }

    if (rightSortOrder === undefined) {
      return -1;
    }

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }
  }

  const leftCreated = left.createdAtMillis ?? 0;
  const rightCreated = right.createdAtMillis ?? 0;
  if (leftCreated !== rightCreated) {
    return leftCreated - rightCreated;
  }

  return left.id.localeCompare(right.id);
}

/**
 * Stable request-item display order: sortOrder asc, then createdAt asc, then id.
 * Matches DATA_MODEL / Studio. Portal Current Request / detail use
 * {@link sortPrintRequestItemsNewestFirst} instead.
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
 * Portal Current Request / detail: last-added first (highest sortOrder / newest createdAt).
 * Persisted sortOrder values remain ascending appends; this only reverses presentation.
 */
export function sortPrintRequestItemsNewestFirst(items: PrintRequestItem[]): PrintRequestItem[] {
  return sortPrintRequestItemsForDisplay(items).reverse();
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
 * Portal duplicate callable + optimistic UI use this. Studio keeps
 * {@link resolveDuplicateInsertAfterSortOrder} with ascending display.
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
