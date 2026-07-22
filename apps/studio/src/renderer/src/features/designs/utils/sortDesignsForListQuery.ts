import type { Design } from "../types/design.types";
import type { DesignListSortDirection, DesignListSortField } from "../types/designQuery.types";

function getDesignSortMillis(design: Design, sortField: DesignListSortField): number {
  return sortField === "createdAt" ? design.createdAt.toMillis() : design.updatedAt.toMillis();
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
  const timeDifference =
    sortDirection === "desc" ? rightMillis - leftMillis : leftMillis - rightMillis;

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
