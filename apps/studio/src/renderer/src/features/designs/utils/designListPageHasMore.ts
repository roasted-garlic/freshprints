/**
 * Pure hasMore inference for the Design Library pageSize+1 contract.
 * `designService.buildDesignListPage` uses the same rule: hasMore = returnedCount > pageSize.
 */
export function buildDesignListPageHasMore(returnedCount: number, pageSize: number): boolean {
  return returnedCount > pageSize;
}
