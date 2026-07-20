import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

function formatInchesForCart(value: number): string {
  return Number.parseFloat(value.toFixed(2)).toString();
}

/**
 * Cart meta size segment, e.g. "3.5 x 3.89" (no "in" suffix).
 */
export function formatCurrentRequestDrawerItemSize(
  item: Pick<PrintRequestItem, 'printWidthInches' | 'printHeightInches' | 'sizeLabel'>,
): string {
  if (
    typeof item.printWidthInches === 'number' &&
    Number.isFinite(item.printWidthInches) &&
    typeof item.printHeightInches === 'number' &&
    Number.isFinite(item.printHeightInches)
  ) {
    return `${formatInchesForCart(item.printWidthInches)} x ${formatInchesForCart(item.printHeightInches)}`;
  }

  const label = item.sizeLabel?.trim();
  if (label) {
    return label.replace(/\s+in$/i, '');
  }

  return 'Size TBD';
}

/** Cart meta line: "3.5 x 3.89 · Qty 2" */
export function formatCurrentRequestDrawerItemMeta(
  item: Pick<PrintRequestItem, 'printWidthInches' | 'printHeightInches' | 'sizeLabel' | 'quantity'>,
): string {
  return `${formatCurrentRequestDrawerItemSize(item)} · Qty ${item.quantity}`;
}
