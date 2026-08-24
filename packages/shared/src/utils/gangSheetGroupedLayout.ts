import {
  nestBoxesIntoShelvesWithHeightCap,
  type NestableBox,
  type NestingSpacingPx,
} from "./gangSheetNesting";
import { computeGangSheetLabelBandHeightPx } from "./gangSheetLabelRendering";
import {
  buildGroupedGangSheetSectionHeading,
  resolveGangSheetProductionGroupKey,
} from "./groupPrintRequestsByShow";

export interface GroupedGangSheetAllocationInput {
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

export interface GroupedGangSheetLayoutPlan {
  sheetCount: number;
  sectionHeadings: string[];
  groupOrder: string[];
  sheetPlacementIds: string[][];
}

interface ProductionGroup {
  groupKey: string;
  heading: string;
  boxes: NestableBox[];
}

function buildProductionGroups(images: readonly GroupedGangSheetAllocationInput[]): ProductionGroup[] {
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

/**
 * Plans grouped gang-sheet nesting by finishing one production group before starting the next.
 * Section label bands reserve vertical space using the same band-height formula as sheet labels.
 */
export function planGroupedGangSheetLayout(input: {
  images: readonly GroupedGangSheetAllocationInput[];
  sheetWidthPx: number;
  spacingPx: NestingSpacingPx;
  maxSheetHeightPx: number;
  sheetLabelFontSizePx: number;
}): GroupedGangSheetLayoutPlan {
  const sectionLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.sheetLabelFontSizePx);
  const productionGroups = buildProductionGroups(input.images);

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
