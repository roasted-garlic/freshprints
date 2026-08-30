import {
  PRINT_REQUEST_WORKING_TRIAGE_FILTERS,
  matchesPrintRequestWorkingTriageFilter,
  resolvePrintRequestWorkingTriageBucket,
  type PrintRequestWorkingTriageFilter,
} from "@fresh-prints/shared/utils/printRequestWorkingTriage";

export const PRINT_REQUEST_ID_QUERY_PARAM = "requestId";
export const PRINT_REQUEST_TAB_QUERY_PARAM = "tab";
export const PRINT_REQUEST_WORKING_FILTER_QUERY_PARAM = "workingFilter";
export const PRINT_REQUEST_KIND_QUERY_PARAM = "kind";

export const PRINT_REQUEST_LIST_TABS = ["working", "queued", "printing", "printed"] as const;
export const PRINT_REQUEST_INTERNAL_LIST_TABS = ["working", "queued", "printed"] as const;
export const PRINT_REQUEST_LIST_KINDS = ["customer", "internal"] as const;

export type PrintRequestRouteTab = (typeof PRINT_REQUEST_LIST_TABS)[number];
export type PrintRequestListKind = (typeof PRINT_REQUEST_LIST_KINDS)[number];

export interface CanonicalPrintRequestsRoute {
  requestId?: string;
  kind: PrintRequestListKind;
  tab: PrintRequestRouteTab;
  workingFilter?: PrintRequestWorkingTriageFilter;
}

export interface PrintRequestRouteTriageRequest {
  id: string;
  itemCount: number;
  updatedAtMillis: number;
  needsStaffRequeueAt?: unknown | null;
}

export function isPrintRequestRouteTab(value: string | null): value is PrintRequestRouteTab {
  return PRINT_REQUEST_LIST_TABS.includes(value as PrintRequestRouteTab);
}

export function isPrintRequestListKind(value: string | null): value is PrintRequestListKind {
  return PRINT_REQUEST_LIST_KINDS.includes(value as PrintRequestListKind);
}

export function resolvePrintRequestListKind(value: string | null): PrintRequestListKind {
  return value === "internal" ? "internal" : "customer";
}

export function isInternalFromPrintRequestListKind(kind: PrintRequestListKind): boolean {
  return kind === "internal";
}

export function printRequestListKindFromIsInternal(isInternal: boolean): PrintRequestListKind {
  return isInternal ? "internal" : "customer";
}

export function getPrintRequestListTabsForKind(
  kind: PrintRequestListKind,
): readonly PrintRequestRouteTab[] {
  return kind === "internal" ? PRINT_REQUEST_INTERNAL_LIST_TABS : PRINT_REQUEST_LIST_TABS;
}

export function normalizePrintRequestListTabForKind(
  tab: PrintRequestRouteTab,
  kind: PrintRequestListKind,
): PrintRequestRouteTab {
  if (kind === "internal" && tab === "printing") {
    return "printed";
  }

  return tab;
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
  kind?: PrintRequestListKind;
  tab?: PrintRequestRouteTab;
  workingFilter?: PrintRequestWorkingTriageFilter;
}): URLSearchParams {
  const searchParams = new URLSearchParams();
  const kind = resolvePrintRequestListKind(options?.kind ?? null);

  if (kind === "internal") {
    searchParams.set(PRINT_REQUEST_KIND_QUERY_PARAM, "internal");
  }

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
  kind?: PrintRequestListKind;
  tab?: PrintRequestRouteTab;
  workingFilter?: PrintRequestWorkingTriageFilter;
}): string {
  const searchParams = buildPrintRequestsSearchParams(options);

  if ([...searchParams.keys()].length === 0) {
    return "/print-requests";
  }

  return `/print-requests?${searchParams.toString()}`;
}

function resolveWorkingTabFilterForRequest(input: {
  requestedFilter: PrintRequestWorkingTriageFilter;
  itemCount: number;
  updatedAtMillis: number;
  needsStaffRequeueAt?: unknown | null;
  nowMs: number;
}): PrintRequestWorkingTriageFilter {
  const triageBucket = resolvePrintRequestWorkingTriageBucket({
    itemCount: input.itemCount,
    updatedAtMillis: input.updatedAtMillis,
    needsStaffRequeueAt: input.needsStaffRequeueAt,
    nowMs: input.nowMs,
  });

  return matchesPrintRequestWorkingTriageFilter(triageBucket, input.requestedFilter)
    ? input.requestedFilter
    : triageBucket;
}

export function shouldReplacePrintRequestsPath(
  current: {
    requestId: string | null;
    kind: string | null;
    tab: string | null;
    workingFilter: string | null;
  },
  next: CanonicalPrintRequestsRoute,
): boolean {
  const nextWorkingFilter = next.tab === "working" ? next.workingFilter ?? "active" : null;
  return (
    resolvePrintRequestListKind(current.kind) !== next.kind ||
    current.tab !== next.tab ||
    current.requestId !== (next.requestId?.trim() || null) ||
    current.workingFilter !== nextWorkingFilter
  );
}

export function resolveCanonicalPrintRequestsRoute(input: {
  dataReady: boolean;
  eligibleRequestIds: readonly string[];
  requestedRequestId: string | null;
  requestedKind: string | null;
  requestedTab: string | null;
  requestedWorkingFilter: string | null;
  requestsByTab: Record<PrintRequestRouteTab, readonly PrintRequestRouteTriageRequest[]>;
  loadedRequestHint?: PrintRequestRouteLoadedRequestHint | null;
  nowMs?: number;
}): CanonicalPrintRequestsRoute | null {
  if (!input.dataReady) {
    return null;
  }

  const requestedKind = resolvePrintRequestListKind(input.requestedKind);
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
  const nowMs = input.nowMs ?? Date.now();

  if (requestedRequestId) {
    const located = findRequestInAnyTab(requestedRequestId, input.requestsByTab);
    const hint =
      input.loadedRequestHint?.id === requestedRequestId ? input.loadedRequestHint : null;
    const hintTab =
      hint?.queueTab && isPrintRequestRouteTab(hint.queueTab)
        ? normalizePrintRequestListTabForKind(hint.queueTab, requestedKind)
        : null;
    const tab = located?.tab ?? hintTab ?? requestedTab;
    const triageSource =
      located?.request ??
      (hint
        ? {
            id: requestedRequestId,
            itemCount: hint.itemCount,
            updatedAtMillis: hint.updatedAtMillis,
          }
        : null);

    if (triageSource) {
      const routeFilter =
        tab === "working" && workingFilter
          ? {
              workingFilter: resolveWorkingTabFilterForRequest({
                requestedFilter: workingFilter,
                itemCount: triageSource.itemCount,
                updatedAtMillis: triageSource.updatedAtMillis,
                needsStaffRequeueAt: triageSource.needsStaffRequeueAt,
                nowMs,
              }),
            }
          : tab === "working"
            ? {
                workingFilter: resolvePrintRequestWorkingTriageBucket({
                  itemCount: triageSource.itemCount,
                  updatedAtMillis: triageSource.updatedAtMillis,
                  needsStaffRequeueAt: triageSource.needsStaffRequeueAt,
                  nowMs,
                }),
              }
            : {};

      const shouldKeepRequest =
        eligibleRequestIds.has(requestedRequestId) || located !== null || hintTab !== null;

      if (shouldKeepRequest) {
        return { requestId: requestedRequestId, kind: requestedKind, tab, ...routeFilter };
      }

      if (tab === "working" && workingFilter) {
        return {
          requestId: requestedRequestId,
          kind: requestedKind,
          tab,
          workingFilter: resolveWorkingTabFilterForRequest({
            requestedFilter: workingFilter,
            itemCount: triageSource.itemCount,
            updatedAtMillis: triageSource.updatedAtMillis,
            needsStaffRequeueAt: triageSource.needsStaffRequeueAt,
            nowMs,
          }),
        };
      }
    }
  }

  const fallbackRequestId = input.eligibleRequestIds[0];
  return fallbackRequestId
    ? { requestId: fallbackRequestId, kind: requestedKind, tab: requestedTab, ...routeFilter }
    : { kind: requestedKind, tab: requestedTab, ...routeFilter };
}

export interface PrintRequestRouteLoadedRequestHint {
  id: string;
  queueTab: PrintRequestRouteTab | null | undefined;
  itemCount: number;
  updatedAtMillis: number;
  needsStaffRequeueAt?: unknown | null;
}

export function buildPrintRequestDeepLinkPath(input: {
  id: string;
  isInternal?: boolean;
  queueTab?: PrintRequestRouteTab | string | null;
  itemCount?: number;
  updatedAtMillis?: number;
  needsStaffRequeueAt?: unknown | null;
}): string {
  const kind = printRequestListKindFromIsInternal(input.isInternal ?? false);
  const tab =
    input.queueTab && isPrintRequestRouteTab(input.queueTab)
      ? normalizePrintRequestListTabForKind(input.queueTab, kind)
      : undefined;
  const workingFilter =
    tab === "working" &&
    typeof input.itemCount === "number" &&
    typeof input.updatedAtMillis === "number"
      ? resolvePrintRequestWorkingTriageBucket({
          itemCount: input.itemCount,
          updatedAtMillis: input.updatedAtMillis,
          needsStaffRequeueAt: input.needsStaffRequeueAt,
        })
      : undefined;

  return getPrintRequestsPath({
    requestId: input.id,
    kind,
    tab,
    workingFilter,
  });
}

export function resolvePrintRequestNavigationTarget(input: {
  id: string;
  isInternal?: boolean;
  closureKind?: string | null;
  convertedToInternalRequestId?: string | null;
}): {
  requestId: string;
  kind: PrintRequestListKind;
  followsConversion: boolean;
  archivedCustomerRequestId?: string;
} {
  const internalRequestId = input.convertedToInternalRequestId?.trim();

  if (
    !input.isInternal &&
    input.closureKind === "converted_to_internal" &&
    internalRequestId
  ) {
    return {
      requestId: internalRequestId,
      kind: "internal",
      followsConversion: true,
      archivedCustomerRequestId: input.id,
    };
  }

  return {
    requestId: input.id,
    kind: printRequestListKindFromIsInternal(input.isInternal ?? false),
    followsConversion: false,
  };
}

export function buildPrintRequestNavigationDeepLinkPath(input: {
  id: string;
  isInternal?: boolean;
  closureKind?: string | null;
  convertedToInternalRequestId?: string | null;
  queueTab?: PrintRequestRouteTab | string | null;
  itemCount?: number;
  updatedAtMillis?: number;
  needsStaffRequeueAt?: unknown | null;
  convertedInternalRequest?: {
    queueTab?: PrintRequestRouteTab | string | null;
    itemCount?: number;
    updatedAtMillis?: number;
    needsStaffRequeueAt?: unknown | null;
  } | null;
}): { path: string; archivedCustomerPath?: string } {
  const target = resolvePrintRequestNavigationTarget(input);

  if (target.followsConversion) {
    const internalHint = input.convertedInternalRequest;
    return {
      path: buildPrintRequestDeepLinkPath({
        id: target.requestId,
        isInternal: true,
        queueTab: internalHint?.queueTab,
        itemCount: internalHint?.itemCount,
        updatedAtMillis: internalHint?.updatedAtMillis,
        needsStaffRequeueAt: internalHint?.needsStaffRequeueAt,
      }),
      archivedCustomerPath: buildPrintRequestDeepLinkPath({
        id: target.archivedCustomerRequestId!,
        isInternal: false,
        queueTab: input.queueTab,
        itemCount: input.itemCount,
        updatedAtMillis: input.updatedAtMillis,
        needsStaffRequeueAt: input.needsStaffRequeueAt,
      }),
    };
  }

  return {
    path: buildPrintRequestDeepLinkPath({
      id: input.id,
      isInternal: input.isInternal,
      queueTab: input.queueTab,
      itemCount: input.itemCount,
      updatedAtMillis: input.updatedAtMillis,
      needsStaffRequeueAt: input.needsStaffRequeueAt,
    }),
  };
}

function findRequestInAnyTab(
  requestId: string,
  requestsByTab: Record<PrintRequestRouteTab, readonly PrintRequestRouteTriageRequest[]>,
): { tab: PrintRequestRouteTab; request: PrintRequestRouteTriageRequest } | null {
  for (const tab of PRINT_REQUEST_LIST_TABS) {
    const request = requestsByTab[tab].find((entry) => entry.id === requestId);
    if (request) {
      return { tab, request };
    }
  }
  return null;
}

export function resolveWorkingFilterClick(input: {
  currentRequestId: string | null;
  destinationFilter: PrintRequestWorkingTriageFilter;
  destinationRequestIds: readonly string[];
  kind: PrintRequestListKind;
}): CanonicalPrintRequestsRoute {
  const currentRequestId = input.currentRequestId?.trim() || null;
  const requestId =
    currentRequestId && input.destinationRequestIds.includes(currentRequestId)
      ? currentRequestId
      : input.destinationRequestIds[0];

  return {
    ...(requestId ? { requestId } : {}),
    kind: input.kind,
    tab: "working",
    workingFilter: input.destinationFilter,
  };
}
