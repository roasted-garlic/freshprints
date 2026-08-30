import type { NestedPlacement } from "./gangSheetNesting";
import { nestBoxesIntoShelvesWithHeightCap, type NestingSpacingPx } from "./gangSheetNesting";
import { computeGangSheetLabelBandHeightPx } from "./gangSheetLabelRendering";
import { buildGroupedGangSheetSectionContinuedHeading } from "./groupPrintRequestsByShow";
import {
  buildGangSheetProductionGroups,
  type GangSheetProductionGroupInput,
} from "./gangSheetProductionGroups";

export interface ContinuousGroupedSectionPlan {
  heading: string;
  placementIds: string[];
  artworkHeightPx: number;
  placements: NestedPlacement[];
}

export interface ContinuousGroupedPhysicalSheetPlan {
  sections: ContinuousGroupedSectionPlan[];
}

export interface ContinuousCustomerGroupedLayoutPlan {
  sheetCount: number;
  physicalSheets: ContinuousGroupedPhysicalSheetPlan[];
  sectionHeadings: string[];
  groupOrder: string[];
}

/**
 * Plans continuous customer-grouped gang sheets: multiple customers may share one physical sheet.
 * Sheet breaks occur only when max height would be exceeded (after the show label band).
 */
export function planContinuousCustomerGroupedGangSheetLayout(input: {
  images: readonly GangSheetProductionGroupInput[];
  sheetWidthPx: number;
  spacingPx: NestingSpacingPx;
  maxSheetHeightPx: number;
  sheetLabelFontSizePx: number;
}): ContinuousCustomerGroupedLayoutPlan {
  const showLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.sheetLabelFontSizePx);
  const sectionLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.sheetLabelFontSizePx);
  const productionGroups = buildGangSheetProductionGroups(input.images);

  const physicalSheets: ContinuousGroupedPhysicalSheetPlan[] = [];
  let currentSections: ContinuousGroupedSectionPlan[] = [];
  let currentSheetUsedHeightPx = showLabelBandHeightPx;

  const commitCurrentSheetIfNeeded = (force = false) => {
    if (currentSections.length === 0) {
      return;
    }

    if (force) {
      physicalSheets.push({ sections: currentSections });
      currentSections = [];
      currentSheetUsedHeightPx = showLabelBandHeightPx;
    }
  };

  for (const group of productionGroups) {
    const nestResult = nestBoxesIntoShelvesWithHeightCap(
      group.boxes,
      input.sheetWidthPx,
      input.spacingPx,
      input.maxSheetHeightPx,
    );

    for (const [groupSheetOffset, nestSheet] of nestResult.sheets.entries()) {
      const sectionHeading =
        nestResult.sheets.length > 1 && groupSheetOffset > 0
          ? buildGroupedGangSheetSectionContinuedHeading(group.heading)
          : group.heading;
      const sectionHeightPx = sectionLabelBandHeightPx + nestSheet.sheetHeightPx;

      if (
        currentSections.length > 0 &&
        currentSheetUsedHeightPx + sectionHeightPx > input.maxSheetHeightPx
      ) {
        commitCurrentSheetIfNeeded(true);
      }

      currentSections.push({
        heading: sectionHeading,
        placementIds: nestSheet.placements.map((placement) => placement.id),
        artworkHeightPx: nestSheet.sheetHeightPx,
        placements: nestSheet.placements,
      });
      currentSheetUsedHeightPx += sectionHeightPx;
    }
  }

  commitCurrentSheetIfNeeded(true);

  return {
    sheetCount: Math.max(1, physicalSheets.length),
    physicalSheets,
    sectionHeadings: productionGroups.map((group) => group.heading),
    groupOrder: productionGroups.map((group) => group.groupKey),
  };
}
