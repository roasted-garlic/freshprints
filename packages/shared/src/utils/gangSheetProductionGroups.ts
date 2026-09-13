import {
  nestBoxesIntoShelvesWithHeightCap,
  type NestableBox,
  type NestingSpacingPx,
} from "./gangSheetNesting";
import {
  buildGroupedGangSheetSectionHeading,
  resolveGangSheetProductionGroupKey,
} from "./groupPrintRequestsByShow";

export interface GangSheetProductionGroupInput {
  allocationId: string;
  printRequestId: string;
  requestName: string;
  customerId?: string;
  customerUsernameSnapshot?: string;
  internalBaseName?: string;
  isInternal: boolean;
  quantity: number;
  widthPx: number;
  heightPx: number;
}

export interface GangSheetProductionGroup {
  groupKey: string;
  heading: string;
  boxes: NestableBox[];
}

export function buildGangSheetProductionGroups(
  images: readonly GangSheetProductionGroupInput[],
): GangSheetProductionGroup[] {
  const groups = new Map<string, { requestNames: Set<string>; boxes: NestableBox[] }>();
  let placementId = 0;

  for (const image of images) {
    const groupKey = resolveGangSheetProductionGroupKey(image);
    const existing = groups.get(groupKey) ?? { requestNames: new Set<string>(), boxes: [] };
    existing.requestNames.add(image.requestName);

    for (let copy = 0; copy < image.quantity; copy += 1) {
      placementId += 1;
      existing.boxes.push({
        id: `${image.allocationId}:${copy + 1}:${placementId}`,
        widthPx: image.widthPx,
        heightPx: image.heightPx,
      });
    }

    groups.set(groupKey, existing);
  }

  return [...groups.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([groupKey, value]) => ({
      groupKey,
      heading: buildGroupedGangSheetSectionHeading([...value.requestNames]),
      boxes: value.boxes,
    }));
}

/** Sheet-per-customer pending sheet count — matches `composeGroupedGangSheetSheets` segment count. */
export function countSheetPerCustomerPhysicalSheets(input: {
  images: readonly GangSheetProductionGroupInput[];
  sheetWidthPx: number;
  spacingPx: NestingSpacingPx;
  maxSheetHeightPx: number;
}): number {
  const productionGroups = buildGangSheetProductionGroups(input.images);
  let sheetCount = 0;

  for (const group of productionGroups) {
    const nestResult = nestBoxesIntoShelvesWithHeightCap(
      group.boxes,
      input.sheetWidthPx,
      input.spacingPx,
      input.maxSheetHeightPx,
    );
    sheetCount += nestResult.sheets.length;
  }

  return Math.max(1, sheetCount);
}
