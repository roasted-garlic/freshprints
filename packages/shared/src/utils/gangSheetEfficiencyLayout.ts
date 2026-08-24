import {
  interleaveGroups,
  nestBoxesIntoShelvesWithHeightCap,
  type NestableBox,
  type NestingSpacingPx,
} from "./gangSheetNesting";

export interface GangSheetEfficiencyImageInput {
  allocationId: string;
  quantity: number;
  widthPx: number;
  heightPx: number;
}

export interface GangSheetEfficiencyLayoutPlan {
  interleavedPlacementIds: string[];
  sheetPlacementIds: string[][];
  sheetCount: number;
  skippedIds: string[];
}

/**
 * Pure efficiency-mode layout planner — mirrors the nesting order used by
 * `exportGangSheetPng` before compositing. Used for regression contracts and sheet-count previews.
 */
export function planEfficiencyGangSheetLayout(input: {
  images: readonly GangSheetEfficiencyImageInput[];
  sheetWidthPx: number;
  spacingPx: NestingSpacingPx;
  maxSheetHeightPx: number;
}): GangSheetEfficiencyLayoutPlan {
  let placementId = 0;
  const groups: NestableBox[][] = [];

  for (const image of input.images) {
    const group: NestableBox[] = [];
    for (let copy = 0; copy < image.quantity; copy += 1) {
      placementId += 1;
      group.push({
        id: String(placementId),
        widthPx: image.widthPx,
        heightPx: image.heightPx,
      });
    }
    groups.push(group);
  }

  const interleaved = interleaveGroups(groups);
  const nestResult = nestBoxesIntoShelvesWithHeightCap(
    interleaved,
    input.sheetWidthPx,
    input.spacingPx,
    input.maxSheetHeightPx,
  );

  return {
    interleavedPlacementIds: interleaved.map((box) => box.id),
    sheetPlacementIds: nestResult.sheets.map((sheet) => sheet.placements.map((placement) => placement.id)),
    sheetCount: nestResult.sheets.length,
    skippedIds: nestResult.skipped.map((entry) => entry.id),
  };
}
