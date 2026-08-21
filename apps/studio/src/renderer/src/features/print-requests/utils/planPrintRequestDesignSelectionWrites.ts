import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { isCatalogDesignPrintRequestItem } from "@fresh-prints/shared/utils/printRequestItemSource";

export interface PrintRequestDesignSelectionWriteInput {
  designId: string;
  quantity: number;
  existingItemId?: string;
}

export interface PrintRequestDesignSelectionCurrentItem {
  id: string;
  quantity: number;
}

export type PlannedPrintRequestDesignSelectionWrite =
  | { kind: "update_quantity"; itemId: string; quantity: number }
  | { kind: "create"; designId: string; quantity: number };

export interface SelectedDesignSelection {
  quantity: number;
  existingItemId?: string;
  isExisting: boolean;
}

export type SelectionState = Record<string, SelectedDesignSelection>;

export function buildSelectionStateFromRequestItems(items: PrintRequestItem[]) {
  const nextState: SelectionState = {};

  for (const item of items) {
    if (!isCatalogDesignPrintRequestItem(item) || !item.designId) {
      continue;
    }

    nextState[item.designId] = {
      quantity: item.quantity,
      existingItemId: item.id,
      isExisting: true,
    };
  }

  return nextState;
}

export function buildDesignSelectionSavePayload(
  selectedDesigns: SelectionState | Record<string, { quantity: number; existingItemId?: string }>,
): PrintRequestDesignSelectionWriteInput[] {
  return Object.entries(selectedDesigns).map(([designId, selection]) => ({
    designId,
    quantity: selection.quantity,
    existingItemId: selection.existingItemId,
  }));
}

/**
 * Studio Add Designs save is a delta against existing request item IDs.
 * Existing rows are never reconstructed from catalog default size.
 * Missing existingItemId means a genuinely new catalog selection.
 * A stale existingItemId is skipped so removed items cannot resurrect.
 */
export function planPrintRequestDesignSelectionWrites(
  selections: PrintRequestDesignSelectionWriteInput[],
  currentItems: PrintRequestDesignSelectionCurrentItem[],
): PlannedPrintRequestDesignSelectionWrite[] {
  const currentById = new Map(currentItems.map((item) => [item.id, item]));
  const writes: PlannedPrintRequestDesignSelectionWrite[] = [];

  for (const selection of selections) {
    const designId = selection.designId.trim();
    const existingItemId = selection.existingItemId?.trim() || undefined;

    if (!designId) {
      continue;
    }

    if (existingItemId) {
      const existing = currentById.get(existingItemId);

      if (!existing) {
        continue;
      }

      if (existing.quantity !== selection.quantity) {
        writes.push({
          kind: "update_quantity",
          itemId: existingItemId,
          quantity: selection.quantity,
        });
      }

      continue;
    }

    writes.push({
      kind: "create",
      designId,
      quantity: selection.quantity,
    });
  }

  return writes;
}
