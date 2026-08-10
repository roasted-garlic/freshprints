import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

/**
 * Design ids already represented in the working Current Request, regardless of quantity, size,
 * or line item id. Used to suppress "matching designs" suggestions for designs the customer has
 * already added — no extra Firestore reads, this only inspects in-memory working items.
 */
export function collectWorkingItemDesignIds(workingItems: PrintRequestItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of workingItems) {
    if (typeof item.designId === 'string' && item.designId.trim()) {
      ids.add(item.designId.trim());
    }
  }
  return ids;
}

/**
 * Excludes designs already present in the working Current Request (by design id). Order of the
 * remaining designs is preserved.
 */
export function excludeDesignsInWorkingItems<T extends { id: string }>(
  designs: T[],
  workingItems: PrintRequestItem[],
): T[] {
  const workingDesignIds = collectWorkingItemDesignIds(workingItems);
  if (workingDesignIds.size === 0) {
    return designs;
  }
  return designs.filter((design) => !workingDesignIds.has(design.id));
}
