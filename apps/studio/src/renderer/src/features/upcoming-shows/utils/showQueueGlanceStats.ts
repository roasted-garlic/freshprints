import { planContinuousCustomerGroupedGangSheetLayout } from "@fresh-prints/shared/utils/gangSheetContinuousCustomerGroupedLayout";
import { planEfficiencyGangSheetLayout } from "@fresh-prints/shared/utils/gangSheetEfficiencyLayout";
import { planSheetPerCustomerGangSheetLayout } from "@fresh-prints/shared/utils/gangSheetGroupedLayout";
import { computeExportTargetPixelSize } from "@fresh-prints/shared/utils/showExportFilename";
import { resolveQueuedPrintInches } from "@fresh-prints/shared/utils/printRequestQueuedInches";
import {
  resolvePrintRequestSizeClassCounts,
  type PrintRequestSizeClassCounts,
} from "@fresh-prints/shared/utils/printRequestPocketFullSizeCounts";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { GangSheetExportImageGrouping } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { GangSheetSectionPricingConfig } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import type { ShowWithScheduledStart } from "@fresh-prints/shared/utils/showScheduleGrouping";

import {
  filterShowExportAllocations,
  shouldUseHistoricalShowExportAllocations,
} from "./showExportEligibility";
import {
  calculateShowAllocationGroupPriceUsd,
  sumShowAllocationGroupPricesUsd,
} from "./showAllocationDollarTotals";

const GANG_SHEET_EXPORT_DPI = 300;

export interface GangSheetSheetCountPreview {
  efficiencySheets: number;
  /** Sheet per Customer (`grouped_by_customer`). */
  groupedSheets: number;
  /** Grouped by Customer continuous (`customer_grouped_continuous`). */
  continuousGroupedSheets: number;
}

export interface GangSheetLayoutGeometrySettings {
  sheetWidthInches: number;
  sideMarginInches: number;
  topBottomMarginInches: number;
  gutterInches: number;
  maxSheetLengthInches: number;
  labelFontSizePx: number;
}

export interface GangSheetCountLayoutImage {
  allocationId: string;
  quantity: number;
  widthPx: number;
  heightPx: number;
  grouping?: GangSheetExportImageGrouping;
}

/**
 * Sync sheet-count estimate from already-known placement sizes. Does not fetch artwork.
 * Matches the packing math used by the Generate Gang Sheet modal preview.
 */
export function estimateGangSheetSheetCounts(
  images: GangSheetCountLayoutImage[],
  layoutSettings: GangSheetLayoutGeometrySettings,
): GangSheetSheetCountPreview {
  const sheetWidthPx = Math.round(layoutSettings.sheetWidthInches * GANG_SHEET_EXPORT_DPI);
  const spacingPx = {
    sideMarginPx: Math.round(layoutSettings.sideMarginInches * GANG_SHEET_EXPORT_DPI),
    topBottomMarginPx: Math.round(layoutSettings.topBottomMarginInches * GANG_SHEET_EXPORT_DPI),
    gutterPx: Math.round(layoutSettings.gutterInches * GANG_SHEET_EXPORT_DPI),
  };
  const maxSheetHeightPx = Math.round(layoutSettings.maxSheetLengthInches * GANG_SHEET_EXPORT_DPI);

  const efficiency = planEfficiencyGangSheetLayout({
    images: images.map((image) => ({
      allocationId: image.allocationId,
      quantity: image.quantity,
      widthPx: image.widthPx,
      heightPx: image.heightPx,
    })),
    sheetWidthPx,
    spacingPx,
    maxSheetHeightPx,
  });

  const groupedImages = images
    .filter((image) => image.grouping)
    .map((image) => ({
      allocationId: image.allocationId,
      printRequestId: image.grouping!.printRequestId,
      requestName: image.grouping!.requestName,
      customerId: image.grouping!.customerId,
      customerUsernameSnapshot: image.grouping!.customerUsernameSnapshot,
      internalBaseName: image.grouping!.internalBaseName,
      isInternal: image.grouping!.isInternal,
      quantity: image.quantity,
      widthPx: image.widthPx,
      heightPx: image.heightPx,
    }));

  const grouped = planSheetPerCustomerGangSheetLayout({
    images: groupedImages,
    sheetWidthPx,
    spacingPx,
    maxSheetHeightPx,
    sheetLabelFontSizePx: layoutSettings.labelFontSizePx,
  });

  const continuousGrouped = planContinuousCustomerGroupedGangSheetLayout({
    images: groupedImages,
    sheetWidthPx,
    spacingPx,
    maxSheetHeightPx,
    sheetLabelFontSizePx: layoutSettings.labelFontSizePx,
  });

  return {
    efficiencySheets: efficiency.sheetCount,
    groupedSheets: grouped.sheetCount,
    continuousGroupedSheets: continuousGrouped.sheetCount,
  };
}

function buildGroupingMetadata(
  allocation: ShowAllocation,
  printRequest: PrintRequest | null | undefined,
): GangSheetExportImageGrouping {
  if (!printRequest) {
    return {
      printRequestId: allocation.printRequestId,
      requestName: allocation.requestNameSnapshot ?? allocation.printRequestId,
      isInternal: false,
    };
  }

  return {
    printRequestId: printRequest.id,
    requestName: printRequest.name,
    customerId: printRequest.customerId,
    customerUsernameSnapshot: printRequest.customerUsernameSnapshot,
    internalBaseName: printRequest.internalBaseName,
    isInternal: printRequest.isInternal,
  };
}

export interface ShowQueueGlanceStats {
  totalPriceUsd: number;
  printRequestCount: number;
  printQuantity: number;
  designCount: number;
  sizeClassCounts: PrintRequestSizeClassCounts;
  sheetCounts: GangSheetSheetCountPreview | null;
}

/**
 * At-a-glance production stats for the selected show/sheet.
 * Sheet counts are sync packing estimates from allocation print sizes (no Storage/network).
 */
export function buildShowQueueGlanceStats(input: {
  allocations: ShowAllocation[];
  requestsById: Map<string, PrintRequest>;
  sectionPricing: GangSheetSectionPricingConfig;
  layoutSettings: GangSheetLayoutGeometrySettings;
  show: ShowWithScheduledStart | null;
  now?: Date;
}): ShowQueueGlanceStats {
  const useHistoricalPastExport = input.show
    ? shouldUseHistoricalShowExportAllocations(input.show, input.now ?? new Date())
    : false;
  const exportableAllocations = filterShowExportAllocations(input.allocations, {
    useHistoricalPastExport,
  });

  const activeForMoney = input.allocations.filter((allocation) => allocation.status !== "canceled");
  const priceByRequest = new Map<string, ReturnType<typeof calculateShowAllocationGroupPriceUsd>>();
  for (const allocation of activeForMoney) {
    if (!priceByRequest.has(allocation.printRequestId)) {
      priceByRequest.set(
        allocation.printRequestId,
        calculateShowAllocationGroupPriceUsd(
          activeForMoney.filter((row) => row.printRequestId === allocation.printRequestId),
          input.sectionPricing,
        ),
      );
    }
  }

  const printRequestIds = new Set(exportableAllocations.map((allocation) => allocation.printRequestId));
  const designKeys = new Set(
    exportableAllocations.map(
      (allocation) =>
        allocation.printRequestItemId ||
        allocation.designId ||
        allocation.customerUploadId ||
        allocation.id,
    ),
  );
  const printQuantity = exportableAllocations.reduce(
    (sum, allocation) => sum + allocation.allocatedQuantity,
    0,
  );

  const sizeClassCounts = resolvePrintRequestSizeClassCounts(
    exportableAllocations.map((allocation) => ({
      printWidthInches: allocation.printWidthInches,
      printHeightInches: allocation.printHeightInches,
      quantity: allocation.allocatedQuantity,
      status: useHistoricalPastExport ? null : allocation.status,
    })),
  );

  let sheetCounts: GangSheetSheetCountPreview | null = null;
  if (exportableAllocations.length > 0) {
    const images: GangSheetCountLayoutImage[] = [];
    for (const allocation of exportableAllocations) {
      try {
        const { printWidthInches, printHeightInches } = resolveQueuedPrintInches({
          allocationWidthInches: allocation.printWidthInches,
          allocationHeightInches: allocation.printHeightInches,
        });
        const { targetWidthPx, targetHeightPx } = computeExportTargetPixelSize(
          printWidthInches,
          printHeightInches,
          Math.round(printWidthInches * GANG_SHEET_EXPORT_DPI),
          Math.round(printHeightInches * GANG_SHEET_EXPORT_DPI),
        );
        images.push({
          allocationId: allocation.id,
          quantity: allocation.allocatedQuantity,
          widthPx: targetWidthPx,
          heightPx: targetHeightPx,
          grouping: buildGroupingMetadata(
            allocation,
            input.requestsById.get(allocation.printRequestId),
          ),
        });
      } catch {
        // Skip allocations missing print size; remaining rows still estimate.
      }
    }
    sheetCounts = images.length > 0 ? estimateGangSheetSheetCounts(images, input.layoutSettings) : null;
  }

  return {
    totalPriceUsd: sumShowAllocationGroupPricesUsd([...priceByRequest.values()]),
    printRequestCount: printRequestIds.size,
    printQuantity,
    designCount: designKeys.size,
    sizeClassCounts,
    sheetCounts,
  };
}
