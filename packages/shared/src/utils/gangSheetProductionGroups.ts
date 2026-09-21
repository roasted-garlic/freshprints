import {
  nestBoxesIntoShelvesWithHeightCap,
  type NestableBox,
  type NestingSpacingPx,
} from "./gangSheetNesting";
import {
  buildGroupedGangSheetSectionHeading,
  resolveGangSheetProductionGroupKey,
} from "./groupPrintRequestsByShow";
import {
  buildGangSheetCustomerSectionSummaryLines,
  calculateGangSheetCustomerSectionSummary,
} from "./gangSheetCustomerSectionSummary";
import type { GangSheetSectionPricingConfig } from "../constants/gangSheetSectionPricingSettings.constants";

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
  printWidthInches?: number;
  printHeightInches?: number;
}

export interface GangSheetProductionGroup {
  groupKey: string;
  heading: string;
  boxes: NestableBox[];
  summaryLines: string[];
}

export function buildGangSheetProductionGroups(
  images: readonly GangSheetProductionGroupInput[],
  sectionPricing?: GangSheetSectionPricingConfig,
): GangSheetProductionGroup[] {
  const groups = new Map<
    string,
    {
      requestNames: Set<string>;
      boxes: NestableBox[];
      summaryUnits: Array<{ printWidthInches: number; printHeightInches: number; quantity: number }>;
    }
  >();
  let placementId = 0;

  for (const image of images) {
    const groupKey = resolveGangSheetProductionGroupKey(image);
    const existing = groups.get(groupKey) ?? {
      requestNames: new Set<string>(),
      boxes: [],
      summaryUnits: [],
    };
    existing.requestNames.add(image.requestName);
    if (
      sectionPricing &&
      typeof image.printWidthInches === "number" &&
      typeof image.printHeightInches === "number" &&
      image.printWidthInches > 0 &&
      image.printHeightInches > 0
    ) {
      existing.summaryUnits.push({
        printWidthInches: image.printWidthInches,
        printHeightInches: image.printHeightInches,
        quantity: image.quantity,
      });
    }

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
    .map(([groupKey, value]) => {
      const summaryLines = sectionPricing && value.summaryUnits.length > 0
        ? buildGangSheetCustomerSectionSummaryLines(
            calculateGangSheetCustomerSectionSummary(value.summaryUnits, sectionPricing),
          )
        : ["", ""];
      return {
        groupKey,
        heading: buildGroupedGangSheetSectionHeading([...value.requestNames]),
        boxes: value.boxes,
        summaryLines,
      };
    });
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
