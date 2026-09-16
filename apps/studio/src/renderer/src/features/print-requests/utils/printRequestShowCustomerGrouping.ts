import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import {
  resolveGangSheetProductionGroupKey,
} from "@fresh-prints/shared/utils/groupPrintRequestsByShow";
import {
  normalizePrintRequestListSearchQuery,
  printRequestMatchesCustomerListSearch,
  printRequestMatchesListSearch,
  type PrintRequestListSearchCustomer,
} from "./printRequestListSearch";

export interface PrintRequestCustomerGroup {
  key: string;
  requests: PrintRequest[];
  totalQuantity: number;
  totalPriceUsd: number | null;
}

function activeAllocations(allocations: readonly ShowAllocation[]): ShowAllocation[] {
  return allocations.filter((allocation) => allocation.status !== "canceled");
}

export function filterPrintRequestsByShow(input: {
  requests: readonly PrintRequest[];
  allocationsByRequestId: Readonly<Record<string, readonly ShowAllocation[]>>;
  showId: string | null;
}): PrintRequest[] {
  if (!input.showId) {
    return [...input.requests];
  }

  return input.requests.filter((request) =>
    activeAllocations(input.allocationsByRequestId[request.id] ?? []).some(
      (allocation) => allocation.upcomingShowId === input.showId,
    ),
  );
}

export function clipAllocationsToShow(input: {
  requests: readonly PrintRequest[];
  allocationsByRequestId: Readonly<Record<string, readonly ShowAllocation[]>>;
  showId: string | null;
}): Record<string, ShowAllocation[]> {
  return Object.fromEntries(
    input.requests.map((request) => [
      request.id,
      input.showId
        ? activeAllocations(input.allocationsByRequestId[request.id] ?? []).filter(
            (allocation) => allocation.upcomingShowId === input.showId,
          )
        : [...(input.allocationsByRequestId[request.id] ?? [])],
    ]),
  );
}

export function filterPrintRequestsForShowAndSearch(input: {
  requests: readonly PrintRequest[];
  allocationsByRequestId: Readonly<Record<string, readonly ShowAllocation[]>>;
  showId: string | null;
  query: string;
  customersById: ReadonlyMap<string, PrintRequestListSearchCustomer>;
}): PrintRequest[] {
  const scopedRequests = filterPrintRequestsByShow(input);
  const normalizedQuery = normalizePrintRequestListSearchQuery(input.query);
  if (!normalizedQuery) {
    return scopedRequests;
  }

  const customerKeysWithMatches = new Set<string>();
  for (const request of scopedRequests) {
    const key = resolveCustomerGroupKey(request);
    if (printRequestMatchesCustomerListSearch(request, normalizedQuery, input.customersById)) {
      customerKeysWithMatches.add(key);
    }
  }

  return scopedRequests.filter((request) => {
    const customerKey = resolveCustomerGroupKey(request);
    return (
      customerKeysWithMatches.has(customerKey) ||
      printRequestMatchesListSearch(request, normalizedQuery, input.customersById)
    );
  });
}

function resolveCustomerGroupKey(request: PrintRequest): string {
  return resolveGangSheetProductionGroupKey({
    customerId: request.customerId,
    customerUsernameSnapshot: request.customerUsernameSnapshot,
    isInternal: false,
    printRequestId: request.id,
  });
}

export function groupPrintRequestsByCustomerWithinShow(input: {
  requests: readonly PrintRequest[];
  summariesByRequestId: Readonly<Record<string, { totalQuantity: number }>>;
  getRequestPriceUsd: (request: PrintRequest) => number | null;
}): PrintRequestCustomerGroup[] {
  const groups = new Map<string, PrintRequestCustomerGroup>();
  const priceCounts = new Map<string, number>();

  for (const request of input.requests) {
    const key = resolveCustomerGroupKey(request);
    const group =
      groups.get(key) ??
      {
        key,
        requests: [],
        totalQuantity: 0,
        totalPriceUsd: 0,
      };
    group.requests.push(request);
    group.totalQuantity += input.summariesByRequestId[request.id]?.totalQuantity ?? 0;

    const priceUsd = input.getRequestPriceUsd(request);
    if (priceUsd !== null) {
      group.totalPriceUsd = (group.totalPriceUsd ?? 0) + priceUsd;
      priceCounts.set(key, (priceCounts.get(key) ?? 0) + 1);
    }

    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    totalPriceUsd: priceCounts.has(group.key) ? group.totalPriceUsd : null,
  }));
}
