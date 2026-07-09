export const PRINT_REQUEST_ID_QUERY_PARAM = "requestId";
export const PRINT_REQUEST_TAB_QUERY_PARAM = "tab";

export const PRINT_REQUEST_LIST_TABS = ["working", "queued", "printing", "printed"] as const;

export type PrintRequestRouteTab = (typeof PRINT_REQUEST_LIST_TABS)[number];

export function isPrintRequestRouteTab(value: string | null): value is PrintRequestRouteTab {
  return PRINT_REQUEST_LIST_TABS.includes(value as PrintRequestRouteTab);
}

export function buildPrintRequestsSearchParams(options?: {
  requestId?: string;
  tab?: PrintRequestRouteTab;
}): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (options?.tab) {
    searchParams.set(PRINT_REQUEST_TAB_QUERY_PARAM, options.tab);
  }

  if (options?.requestId?.trim()) {
    searchParams.set(PRINT_REQUEST_ID_QUERY_PARAM, options.requestId.trim());
  }

  return searchParams;
}

export function getPrintRequestsPath(options?: {
  requestId?: string;
  tab?: PrintRequestRouteTab;
}): string {
  const searchParams = buildPrintRequestsSearchParams(options);

  if ([...searchParams.keys()].length === 0) {
    return "/print-requests";
  }

  return `/print-requests?${searchParams.toString()}`;
}
