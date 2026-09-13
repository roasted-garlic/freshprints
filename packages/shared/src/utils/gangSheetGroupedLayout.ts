import {
  nestBoxesIntoShelvesWithHeightCap,
  type NestingSpacingPx,
} from "./gangSheetNesting";
import { computeGangSheetLabelBandHeightPx } from "./gangSheetLabelRendering";
import {
  buildGangSheetProductionGroups,
  countSheetPerCustomerPhysicalSheets,
  type GangSheetProductionGroupInput,
} from "./gangSheetProductionGroups";

export type GroupedGangSheetAllocationInput = GangSheetProductionGroupInput;

export interface GroupedGangSheetLayoutPlan {
  sheetCount: number;
  sectionHeadings: string[];
  groupOrder: string[];
  sheetPlacementIds: string[][];
}

/**
 * Plans sheet-per-customer grouped layout (one physical sheet per customer nest segment).
 * Matches `composeGroupedGangSheetSheets` pending-sheet semantics.
 */
export function planSheetPerCustomerGangSheetLayout(input: {
  images: readonly GroupedGangSheetAllocationInput[];
  sheetWidthPx: number;
  spacingPx: NestingSpacingPx;
  maxSheetHeightPx: number;
  sheetLabelFontSizePx: number;
}): GroupedGangSheetLayoutPlan {
  const sectionLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.sheetLabelFontSizePx);
  const productionGroups = buildGangSheetProductionGroups(input.images);

  const sheetPlacementIds: string[][] = [];
  let currentSheetPlacements: string[] = [];
  let currentSheetUsedHeightPx = 0;

  const commitSheetIfNeeded = (force = false) => {
    if (currentSheetPlacements.length === 0) {
      return;
    }

    if (force || currentSheetUsedHeightPx >= input.maxSheetHeightPx) {
      sheetPlacementIds.push(currentSheetPlacements);
      currentSheetPlacements = [];
      currentSheetUsedHeightPx = 0;
    }
  };

  for (const group of productionGroups) {
    const nestResult = nestBoxesIntoShelvesWithHeightCap(
      group.boxes,
      input.sheetWidthPx,
      input.spacingPx,
      input.maxSheetHeightPx,
    );

    for (const [sheetOffset, sheet] of nestResult.sheets.entries()) {
      commitSheetIfNeeded(true);
      currentSheetUsedHeightPx += sectionLabelBandHeightPx + sheet.sheetHeightPx;
      currentSheetPlacements.push(...sheet.placements.map((placement) => placement.id));

      if (currentSheetUsedHeightPx >= input.maxSheetHeightPx) {
        commitSheetIfNeeded(true);
      }

      if (sheetOffset < nestResult.sheets.length - 1) {
        commitSheetIfNeeded(true);
      }
    }
  }

  commitSheetIfNeeded(true);

  return {
    sheetCount: Math.max(1, sheetPlacementIds.length),
    sectionHeadings: productionGroups.map((group) => group.heading),
    groupOrder: productionGroups.map((group) => group.groupKey),
    sheetPlacementIds,
  };
}

/** @deprecated Use `planSheetPerCustomerGangSheetLayout` — alias for sheet-per-customer preview. */
export function planGroupedGangSheetLayout(
  input: Parameters<typeof planSheetPerCustomerGangSheetLayout>[0],
): GroupedGangSheetLayoutPlan {
  return planSheetPerCustomerGangSheetLayout(input);
}

export { countSheetPerCustomerPhysicalSheets };
