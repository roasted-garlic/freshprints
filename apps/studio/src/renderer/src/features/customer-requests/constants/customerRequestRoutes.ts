export const CUSTOMER_REQUEST_TAB_QUERY_PARAM = "tab";
export const CUSTOMER_REQUEST_ID_QUERY_PARAM = "requestId";
export const CUSTOMER_REQUEST_DETAIL_TAB_QUERY_PARAM = "detailTab";

export const CUSTOMER_REQUEST_PAGE_TABS = ["assisted", "ai", "etsy_search", "suggestions"] as const;
export const ASSISTED_DETAIL_TABS = ["overview", "proofs", "messages"] as const;

export type CustomerRequestPageTab = (typeof CUSTOMER_REQUEST_PAGE_TABS)[number];
export type AssistedDetailRouteTab = (typeof ASSISTED_DETAIL_TABS)[number];

export function isCustomerRequestPageTab(value: string | null): value is CustomerRequestPageTab {
  return CUSTOMER_REQUEST_PAGE_TABS.includes(value as CustomerRequestPageTab);
}

export function isAssistedDetailRouteTab(value: string | null): value is AssistedDetailRouteTab {
  return ASSISTED_DETAIL_TABS.includes(value as AssistedDetailRouteTab);
}

export function buildCustomerRequestsSearchParams(options?: {
  tab?: CustomerRequestPageTab;
  requestId?: string;
  detailTab?: AssistedDetailRouteTab;
}): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (options?.tab) {
    searchParams.set(CUSTOMER_REQUEST_TAB_QUERY_PARAM, options.tab);
  }
  if (options?.requestId?.trim()) {
    searchParams.set(CUSTOMER_REQUEST_ID_QUERY_PARAM, options.requestId.trim());
  }
  if (options?.detailTab) {
    searchParams.set(CUSTOMER_REQUEST_DETAIL_TAB_QUERY_PARAM, options.detailTab);
  }
  return searchParams;
}

export function getCustomerRequestsPath(options?: {
  tab?: CustomerRequestPageTab;
  requestId?: string;
  detailTab?: AssistedDetailRouteTab;
}): string {
  const searchParams = buildCustomerRequestsSearchParams(options);
  if ([...searchParams.keys()].length === 0) {
    return "/customer-requests";
  }
  return `/customer-requests?${searchParams.toString()}`;
}
