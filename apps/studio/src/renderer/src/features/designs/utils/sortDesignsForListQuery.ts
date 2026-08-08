import type { Design } from "../types/design.types";
import type { DesignListSortDirection, DesignListSortField } from "../types/designQuery.types";

type ListTimestamp = { toMillis: () => number };

function readTimestampMillis(value: unknown): number | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as Partial<ListTimestamp>).toMillis !== "function"
  ) {
    return undefined;
  }

  const millis = (value as ListTimestamp).toMillis();
  return Number.isFinite(millis) ? millis : undefined;
}

function getDesignSortMillis(
  design: Design,
  sortField: DesignListSortField,
): number | undefined {
  if (sortField === "readyAt") {
    // Legacy ready designs approved before `readyAt` existed fall back to `createdAt` so they
    // remain visible and ordered (Owner QA Amendment 3 correction).
    return readTimestampMillis(design.readyAt) ?? readTimestampMillis(design.createdAt);
  }

  return readTimestampMillis(sortField === "createdAt" ? design.createdAt : design.updatedAt);
}

function compareOptionalMillis(
  leftMillis: number | undefined,
  rightMillis: number | undefined,
  sortDirection: DesignListSortDirection,
): number {
  if (leftMillis === undefined) return rightMillis === undefined ? 0 : 1;
  if (rightMillis === undefined) return -1;
  return sortDirection === "desc" ? rightMillis - leftMillis : leftMillis - rightMillis;
}

/**
 * Sorts a list representation by an explicit numeric timestamp without requiring the item to
 * masquerade as a persisted Firestore model. Missing timestamps sort after valid timestamps.
 */
export function sortListItemsByExplicitMillis<T extends { id: string }>(
  items: readonly T[],
  getMillis: (item: T) => number | undefined,
  sortDirection: DesignListSortDirection = "desc",
): T[] {
  return [...items].sort((leftItem, rightItem) => {
    const timeDifference = compareOptionalMillis(
      getMillis(leftItem),
      getMillis(rightItem),
      sortDirection,
    );
    if (timeDifference !== 0) return timeDifference;

    return sortDirection === "desc"
      ? rightItem.id.localeCompare(leftItem.id)
      : leftItem.id.localeCompare(rightItem.id);
  });
}

/**
 * Compare two designs for Design Library / list queries.
 * `desc` ⇒ newer timestamps first (most recently processed/updated at the top when using updatedAt).
 */
export function compareDesignsForListSort(
  leftDesign: Design,
  rightDesign: Design,
  sortField: DesignListSortField,
  sortDirection: DesignListSortDirection = "desc",
): number {
  const leftMillis = getDesignSortMillis(leftDesign, sortField);
  const rightMillis = getDesignSortMillis(rightDesign, sortField);
  const timeDifference = compareOptionalMillis(leftMillis, rightMillis, sortDirection);

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return sortDirection === "desc"
    ? rightDesign.id.localeCompare(leftDesign.id)
    : leftDesign.id.localeCompare(rightDesign.id);
}

export function sortDesignsForListQuery(
  designs: readonly Design[],
  sortField: DesignListSortField,
  sortDirection: DesignListSortDirection = "desc",
): Design[] {
  return [...designs].sort((leftDesign, rightDesign) =>
    compareDesignsForListSort(leftDesign, rightDesign, sortField, sortDirection),
  );
}
