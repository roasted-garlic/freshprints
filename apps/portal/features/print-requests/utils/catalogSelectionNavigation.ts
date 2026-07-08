export function buildCatalogSelectionHref(printRequestId: string): string {
  return `/catalog?mode=request-selection&requestId=${encodeURIComponent(printRequestId)}`;
}
