import {
  PRINT_REQUEST_WORKING_TRIAGE_FILTERS,
  type PrintRequestWorkingTriageFilter,
} from "@fresh-prints/shared/utils/printRequestWorkingTriage";

export const PRINT_REQUEST_ID_QUERY_PARAM = "requestId";
export const PRINT_REQUEST_TAB_QUERY_PARAM = "tab";
export const PRINT_REQUEST_WORKING_FILTER_QUERY_PARAM = "workingFilter";

export const PRINT_REQUEST_LIST_TABS = ["working", "queued", "printing", "printed"] as const;

export type PrintRequestRouteTab = (typeof PRINT_REQUEST_LIST_TABS)[number];

export interface CanonicalPrintRequestsRoute {
  requestId?: string;
  tab: PrintRequestRouteTab;
  workingFilter?: PrintRequestWorkingTriageFilter;
}

export function isPrintRequestRouteTab(value: string | null): value is PrintRequestRouteTab {
  return PRINT_REQUEST_LIST_TABS.includes(value as PrintRequestRouteTab);
}

export function isPrintRequestWorkingFilter(
  value: string | null,
): value is PrintRequestWorkingTriageFilter {
  return PRINT_REQUEST_WORKING_TRIAGE_FILTERS.includes(
    value as PrintRequestWorkingTriageFilter,
  );
}

export function buildPrintRequestsSearchParams(options?: {
  requestId?: string;
  tab?: PrintRequestRouteTab;
  workingFilter?: PrintRequestWorkingTriageFilter;
}): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (options?.tab) {
    searchParams.set(PRINT_REQUEST_TAB_QUERY_PARAM, options.tab);
  }

  if (options?.tab === "working") {
    searchParams.set(
      PRINT_REQUEST_WORKING_FILTER_QUERY_PARAM,
      options.workingFilter ?? "active",
    );
  }

  if (options?.requestId?.trim()) {
    searchParams.set(PRINT_REQUEST_ID_QUERY_PARAM, options.requestId.trim());
  }

  return searchParams;
}

export function getPrintRequestsPath(options?: {
  requestId?: string;
  tab?: PrintRequestRouteTab;
  workingFilter?: PrintRequestWorkingTriageFilter;
}): string {
  const searchParams = buildPrintRequestsSearchParams(options);

  if ([...searchParams.keys()].length === 0) {
    return "/print-requests";
  }

  return `/print-requests?${searchParams.toString()}`;
}

export function shouldReplacePrintRequestsPath(
  current: { requestId: string | null; tab: string | null; workingFilter: string | null },
  next: CanonicalPrintRequestsRoute,
): boolean {
  const nextWorkingFilter = next.tab === "working" ? next.workingFilter ?? "active" : null;
  return (
    current.tab !== next.tab ||
    current.requestId !== (next.requestId?.trim() || null) ||
    current.workingFilter !== nextWorkingFilter
  );
}

export function resolveCanonicalPrintRequestsRoute(input: {
  dataReady: boolean;
  eligibleRequestIds: readonly string[];
  requestedRequestId: string | null;
  requestedTab: string | null;
  requestedWorkingFilter: string | null;
  requestsByTab: Record<PrintRequestRouteTab, readonly { id: string }[]>;
}): CanonicalPrintRequestsRoute | null {
  if (!input.dataReady) {
    return null;
  }

  const requestedTab = isPrintRequestRouteTab(input.requestedTab)
    ? input.requestedTab
    : "working";
  const workingFilter =
    requestedTab === "working" && isPrintRequestWorkingFilter(input.requestedWorkingFilter)
      ? input.requestedWorkingFilter
      : requestedTab === "working"
        ? "active"
        : undefined;
  const requestedRequestId = input.requestedRequestId?.trim() || null;
  const eligibleRequestIds = new Set(input.eligibleRequestIds);
  const routeFilter = workingFilter ? { workingFilter } : {};

  if (
    requestedRequestId &&
    input.requestsByTab[requestedTab].some((request) => request.id === requestedRequestId) &&
    eligibleRequestIds.has(requestedRequestId)
  ) {
    return { requestId: requestedRequestId, tab: requestedTab, ...routeFilter };
  }

  const fallbackRequestId = input.eligibleRequestIds[0];
  return fallbackRequestId
    ? { requestId: fallbackRequestId, tab: requestedTab, ...routeFilter }
    : { tab: requestedTab, ...routeFilter };
}

export function resolveWorkingFilterClick(input: {
  currentRequestId: string | null;
  destinationFilter: PrintRequestWorkingTriageFilter;
  destinationRequestIds: readonly string[];
}): CanonicalPrintRequestsRoute {
  const currentRequestId = input.currentRequestId?.trim() || null;
  const requestId =
    currentRequestId && input.destinationRequestIds.includes(currentRequestId)
      ? currentRequestId
      : input.destinationRequestIds[0];

  return {
    ...(requestId ? { requestId } : {}),
    tab: "working",
    workingFilter: input.destinationFilter,
  };
}
