import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { sortPrintRequestItemsNewestFirst } from '@fresh-prints/shared/utils/printRequestItemDisplayOrder';

/**
 * Reconcile the server-owned projection with the transition-only canonical fallback.
 * Projection rows are authoritative for IDs present in both sources; canonical rows only
 * fill gaps. The result is always ID-unique and uses the existing deterministic display order.
 */
export function mergeProjectionPreferredPrintRequestItems(
  projectionItems: PrintRequestItem[],
  canonicalItems: PrintRequestItem[],
): PrintRequestItem[] {
  const byId = new Map<string, PrintRequestItem>();
  for (const item of canonicalItems) {
    if (item.id.trim()) byId.set(item.id, item);
  }
  for (const item of projectionItems) {
    if (item.id.trim()) byId.set(item.id, item);
  }
  return sortPrintRequestItemsNewestFirst([...byId.values()]);
}
