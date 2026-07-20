export interface SplitAllocationLineItem {
  printRequestItemId: string;
  designTitle: string;
  /** Total quantity on the source item still unassigned to any show in this session. */
  remainingQuantity: number;
}

export interface SplitAllocationSelection {
  printRequestItemId: string;
  quantity: number;
}

/**
 * Reduces each line item's remaining quantity by whatever was just assigned to a show, so the
 * next split step only offers what's left. Selections for unknown item ids or non-positive
 * quantities are ignored rather than throwing, since the UI should never be able to produce those,
 * but this keeps the reducer safe to call defensively.
 */
export function applySplitSelectionToLineItems(
  lineItems: SplitAllocationLineItem[],
  selections: SplitAllocationSelection[],
): SplitAllocationLineItem[] {
  const quantityByItemId = new Map(selections.filter((s) => s.quantity > 0).map((s) => [s.printRequestItemId, s.quantity]));

  return lineItems.map((lineItem) => {
    const assigned = quantityByItemId.get(lineItem.printRequestItemId);

    if (!assigned) {
      return lineItem;
    }

    return {
      ...lineItem,
      remainingQuantity: Math.max(0, lineItem.remainingQuantity - assigned),
    };
  });
}

export function getTotalRemainingQuantity(lineItems: SplitAllocationLineItem[]): number {
  return lineItems.reduce((sum, lineItem) => sum + lineItem.remainingQuantity, 0);
}

export function isSplitAllocationComplete(lineItems: SplitAllocationLineItem[]): boolean {
  return getTotalRemainingQuantity(lineItems) === 0;
}

/**
 * "Remaining"/"still need a show" wording is only accurate once a split is actually underway —
 * i.e. staff have already committed at least one show leg for this request in the current Add to
 * Show session. Before that, the whole request is still just the whole request, and showing
 * "N prints still need a show" or "Add all N remaining prints" is confusing when nothing has been
 * split or partially added yet (see the third Show Queue QA correction).
 */
export function shouldShowRemainingWording(committedLegCount: number): boolean {
  return committedLegCount > 0;
}

export interface SplitPickerQuantities {
  [printRequestItemId: string]: number;
}

/**
 * Total of everything staff have currently entered in the visual split picker, regardless of
 * whether it fits the selected show — used to drive the live running-total display.
 */
export function calculateSplitSelectionTotal(quantities: SplitPickerQuantities): number {
  return Object.values(quantities).reduce((sum, quantity) => sum + Math.max(0, quantity), 0);
}

/**
 * Clamps a staff-entered quantity for one design in the split picker so it can never go negative
 * or exceed that design's own remaining (unassigned) quantity — independent of show capacity,
 * which is validated separately so staff can still see an over-capacity warning and choose to
 * override rather than being silently capped at the show's limit.
 */
export function clampSplitItemQuantity(rawQuantity: number, itemRemainingQuantity: number): number {
  if (!Number.isFinite(rawQuantity)) {
    return 0;
  }

  return Math.max(0, Math.min(itemRemainingQuantity, Math.floor(rawQuantity)));
}

/**
 * Greedy fill for Cap B / capacity split pickers: walk remaining lines in order and assign as
 * much as possible until the budget is spent. Later lines get 0 when the budget is exhausted.
 */
export function buildFillUpSplitQuantities(
  entries: ReadonlyArray<{ itemId: string; remainingQuantity: number }>,
  budget: number,
): SplitPickerQuantities {
  let left = Math.max(0, Math.floor(budget));
  const quantities: SplitPickerQuantities = {};
  for (const entry of entries) {
    if (left <= 0) {
      quantities[entry.itemId] = 0;
      continue;
    }
    const take = Math.min(Math.max(0, Math.floor(entry.remainingQuantity)), left);
    quantities[entry.itemId] = take;
    left -= take;
  }
  return quantities;
}

/**
 * Positive quantity rows for Studio staff split allocation and Portal Cap B choose-prints.
 */
export function toPositiveSplitSelections(
  quantities: SplitPickerQuantities,
): SplitAllocationSelection[] {
  return Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([printRequestItemId, quantity]) => ({
      printRequestItemId,
      quantity: Math.floor(quantity),
    }));
}

export interface SplitPickerWarningCopyInput {
  fittingQuantity: number;
  totalQuantity: number;
}

/**
 * Copy for the split-needed warning shown before staff open the visual picker. Deliberately says
 * nothing about the staff override, since the override checkbox right below it already explains
 * that option — repeating it here was confusing (see the fourth Show Queue QA correction). Also
 * spells out both available paths (split here, or pick a different show for the full request) since
 * staff otherwise only saw the split option (see the ninth Show Queue QA correction).
 */
export function formatSplitNeededWarning(input: SplitPickerWarningCopyInput): string {
  const printWord = input.totalQuantity === 1 ? "print" : "prints";

  return `Only ${input.fittingQuantity} of ${input.totalQuantity} ${printWord} can be added to this show. You can choose which prints to add here and place the rest on another show, or select a different show for the full request.`;
}
