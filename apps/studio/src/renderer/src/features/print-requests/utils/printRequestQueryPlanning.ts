import type { PrintRequestItemStatus } from "@fresh-prints/shared/types/printRequest/printRequest.enums";
import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";

export type QueryFilterOperator = "==";
export type QueryOrderDirection = "asc" | "desc";

export interface QueryFilterDescriptor {
  field: string;
  operator: QueryFilterOperator;
  value: string | boolean;
}

export interface QueryOrderDescriptor {
  field: string;
  direction: QueryOrderDirection;
}

/** Cursor for `updatedAt DESC, __name__ DESC` pagination, mirroring the Design Library's
 * existing last-doc-id + last-sort-value cursor convention. */
export interface PrintRequestListCursor {
  requestId: string;
  updatedAtMillis: number;
}

export interface PrintRequestQueryPlan {
  filters: QueryFilterDescriptor[];
  orderBy: QueryOrderDescriptor[];
  limitCount?: number;
  cursor?: PrintRequestListCursor;
}

export const PRINT_REQUEST_LIST_PAGE_SIZE = 50;

export interface PrintRequestListQueryOptions {
  status?: PrintRequest["status"];
  customerId?: string;
  isInternal?: boolean;
  /** Server-maintained tab mirror — filters by `queueTab` (Wave C hydration remediation). */
  queueTab?: PrintRequestListTab;
  limitCount?: number;
  cursor?: PrintRequestListCursor;
}

export interface PrintRequestItemListQueryOptions {
  status?: PrintRequestItemStatus;
}

export interface CustomerListQueryOptions {
  isGuest?: boolean;
}

export interface PrintRequestItemSummary {
  totalQuantity: number;
  uniqueDesignCount: number;
}

function countDefinedRequestFilters(options: PrintRequestListQueryOptions): number {
  return [options.status, options.customerId, options.isInternal, options.queueTab].filter(
    (value) => value !== undefined,
  ).length;
}

export function buildPrintRequestListQueryPlan(
  options: PrintRequestListQueryOptions = {},
): PrintRequestQueryPlan {
  if (countDefinedRequestFilters(options) > 1) {
    throw new Error("Only one print request list filter can be combined with updatedAt ordering in this phase.");
  }

  const filters: QueryFilterDescriptor[] = [];

  if (options.status !== undefined) {
    filters.push({ field: "status", operator: "==", value: options.status });
  }

  if (options.customerId !== undefined) {
    filters.push({ field: "customerId", operator: "==", value: options.customerId });
  }

  if (options.isInternal !== undefined) {
    filters.push({ field: "isInternal", operator: "==", value: options.isInternal });
  }

  if (options.queueTab !== undefined) {
    filters.push({ field: "queueTab", operator: "==", value: options.queueTab });
  }

  return {
    filters,
    // `__name__` (document ID) tiebreaker makes updatedAt-desc pagination stable when multiple
    // requests share an updatedAt millisecond — mirrors the Design Library's existing cursor
    // convention.
    orderBy: [
      { field: "updatedAt", direction: "desc" },
      { field: "__name__", direction: "desc" },
    ],
    limitCount: options.limitCount,
    cursor: options.cursor,
  };
}

export function buildPrintRequestItemsQueryPlan(
  printRequestId: string,
  options: PrintRequestItemListQueryOptions = {},
): PrintRequestQueryPlan {
  const trimmedPrintRequestId = printRequestId.trim();

  if (!trimmedPrintRequestId) {
    throw new Error("A print request ID is required to list print request items.");
  }

  const filters: QueryFilterDescriptor[] = [
    { field: "printRequestId", operator: "==", value: trimmedPrintRequestId },
  ];

  if (options.status !== undefined) {
    filters.push({ field: "status", operator: "==", value: options.status });
  }

  return {
    filters,
    orderBy: [],
  };
}

function getTimestampMillis(value: PrintRequestItem["createdAt"]): number {
  if (typeof value?.toMillis === "function") {
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

export function buildCustomerListQueryPlan(options: CustomerListQueryOptions = {}): PrintRequestQueryPlan {
  const filters: QueryFilterDescriptor[] = [];

  if (options.isGuest !== undefined) {
    filters.push({ field: "isGuest", operator: "==", value: options.isGuest });
  }

  return {
    filters,
    orderBy: [{ field: "displayName", direction: "asc" }],
  };
}

export function buildPrintRequestItemSummaries(
  items: PrintRequestItem[],
): Record<string, PrintRequestItemSummary> {
  const designIdsByRequestId = new Map<string, Set<string>>();
  const totalQuantityByRequestId = new Map<string, number>();

  for (const item of items) {
    if (!designIdsByRequestId.has(item.printRequestId)) {
      designIdsByRequestId.set(item.printRequestId, new Set<string>());
    }

    designIdsByRequestId
      .get(item.printRequestId)
      ?.add(getPrintRequestItemSummaryIdentity(item));

    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    totalQuantityByRequestId.set(
      item.printRequestId,
      (totalQuantityByRequestId.get(item.printRequestId) ?? 0) + quantity,
    );
  }

  return Object.fromEntries(
    [...designIdsByRequestId.entries()].map(([printRequestId, designIds]) => [
      printRequestId,
      {
        totalQuantity: totalQuantityByRequestId.get(printRequestId) ?? 0,
        uniqueDesignCount: designIds.size,
      },
    ]),
  );
}

export function getPrintRequestItemSummaryIdentity(item: PrintRequestItem): string {
  if (item.sourceType === "customer_upload") {
    const customerUploadId = item.customerUploadId?.trim();
    return customerUploadId ? `upload:${customerUploadId}` : `item:${item.id}`;
  }

  const designId = item.designId?.trim();
  return designId ? `design:${designId}` : `item:${item.id}`;
}
