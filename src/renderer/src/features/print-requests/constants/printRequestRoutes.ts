export const PRINT_REQUEST_ID_QUERY_PARAM = "requestId";

export function buildPrintRequestsSearchParams(options?: { requestId?: string }): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (options?.requestId?.trim()) {
    searchParams.set(PRINT_REQUEST_ID_QUERY_PARAM, options.requestId.trim());
  }

  return searchParams;
}

export function getPrintRequestsPath(options?: { requestId?: string }): string {
  const searchParams = buildPrintRequestsSearchParams(options);

  if ([...searchParams.keys()].length === 0) {
    return "/print-requests";
  }

  return `/print-requests?${searchParams.toString()}`;
}
