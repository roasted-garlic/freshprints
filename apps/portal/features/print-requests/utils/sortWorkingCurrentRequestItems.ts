import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { sortPrintRequestItemsNewestFirst } from '@fresh-prints/shared/utils/printRequestItemDisplayOrder';

/**
 * Portal Current Request / detail item order: newest added first.
 * Delegates to shared newest-first helper (sortOrder desc, then createdAt, then id).
 * Durable across resize/qty edits; duplicates insert via fractional sortOrder
 * (insert-before in ascending space = visual right under newest-first).
 */
export function sortWorkingCurrentRequestItems(items: PrintRequestItem[]): PrintRequestItem[] {
  return sortPrintRequestItemsNewestFirst(items);
}
