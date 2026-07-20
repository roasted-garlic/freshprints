import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { sortWorkingCurrentRequestItems } from './sortWorkingCurrentRequestItems';

function isCatalogOptimisticStubId(itemId: string): boolean {
  return itemId.startsWith('optimistic:');
}

/**
 * Reconcile a server item list with in-memory cart rows so silent reloads cannot
 * wipe optimistic first-adds (or real rows flushed locally but not yet listed).
 *
 * Server rows win on matching id. Optimistic catalog stubs (`optimistic:…`) are
 * dropped once the server has any catalog line for the same designId.
 */
export function mergeServerWorkingItemsWithLocal(
  serverItems: PrintRequestItem[],
  localItems: PrintRequestItem[],
): PrintRequestItem[] {
  const serverIds = new Set(serverItems.map((item) => item.id));
  const serverCatalogDesignIds = new Set<string>();

  for (const item of serverItems) {
    if (item.sourceType === 'customer_upload') {
      continue;
    }
    const designId = item.designId?.trim();
    if (designId) {
      serverCatalogDesignIds.add(designId);
    }
  }

  const preservedLocal = localItems.filter((item) => {
    if (serverIds.has(item.id)) {
      return false;
    }

    const designId = item.designId?.trim();
    if (
      designId &&
      isCatalogOptimisticStubId(item.id) &&
      serverCatalogDesignIds.has(designId)
    ) {
      return false;
    }

    // Keep optimistic stubs and real local rows not yet visible on the server list.
    return true;
  });

  return sortWorkingCurrentRequestItems([...preservedLocal, ...serverItems]);
}
