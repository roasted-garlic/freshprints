export function deriveManagedCatalogHasMore(args: {
  algoliaTotal: number | null;
  enabled: boolean;
  hasError: boolean;
  isConfigured: boolean;
  lastPageHitCount: number;
  nextOffset: number;
  pageSize: number;
}): boolean {
  if (!args.enabled || !args.isConfigured || args.hasError || args.algoliaTotal === null) {
    return false;
  }
  if (args.pageSize <= 0 || args.lastPageHitCount < args.pageSize) {
    return false;
  }
  return args.nextOffset < args.algoliaTotal;
}
