import type { PrintRequestItem } from "../types/printRequest/printRequest.types";

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

function getSortOrder(value: PrintRequestItem): number | undefined {
  return typeof value.sortOrder === "number" && Number.isFinite(value.sortOrder)
    ? value.sortOrder
    : undefined;
}

export function sortPrintRequestItemsForDisplay(items: PrintRequestItem[]): PrintRequestItem[] {
  return [...items].sort((left, right) => {
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

    const createdAtDelta = getTimestampMillis(left.createdAt) - getTimestampMillis(right.createdAt);

    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    return left.id.localeCompare(right.id);
  });
}
