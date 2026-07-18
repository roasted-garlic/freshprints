/**
 * Portal duplicate inserts an optimistic row before the Admin callable returns.
 * These ids are not Firestore document ids — client updates against them fail rules
 * as permission-denied ("Missing or insufficient permissions.").
 */
export const OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX = 'pending_dup_';

export function isOptimisticPrintRequestItemId(itemId: string): boolean {
  return itemId.startsWith(OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX);
}
