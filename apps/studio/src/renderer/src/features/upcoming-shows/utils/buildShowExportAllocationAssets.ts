import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { GangSheetExportImageGrouping } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import { computeExportTargetPixelSize } from "@fresh-prints/shared/utils/showExportFilename";
import { resolveQueuedPrintInches } from "@fresh-prints/shared/utils/printRequestQueuedInches";
import {
  resolveShowExportProductionAsset,
  toCatalogDesignAssetInput,
  toCustomerUploadAssetInput,
  toStaffArtworkAssetInput,
  toShowExportPrintRequestItemFields,
} from "@fresh-prints/shared/utils/resolveShowExportProductionAsset";

import type { User } from "../../users/types/user.types";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import { designService } from "../../designs/services/designService";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import { printRequestService } from "../../print-requests/services/printRequestService";
import {
  customerUploadReadService,
  type StudioCustomerUploadSummary,
} from "../../customer-uploads/services/customerUploadReadService";
import type { Design } from "../../designs/types/design.types";
import type { StaffArtwork } from "@fresh-prints/shared/types/staffArtwork/staffArtwork.types";
import { staffArtworkService } from "../../staff-artwork/services/staffArtworkService";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import {
  filterShowExportAllocations,
  shouldUseHistoricalShowExportAllocations,
} from "../../upcoming-shows/utils/showExportEligibility";

export interface ResolvedShowExportAllocationAsset {
  allocationId: string;
  productionStoragePath: string;
  downloadUrl: string;
  targetWidthPx: number;
  targetHeightPx: number;
  printWidthInches: number;
  printHeightInches: number;
  fileName: string;
  quantity: number;
  grouping?: GangSheetExportImageGrouping;
}

function buildGroupingMetadata(
  allocation: { printRequestId: string; requestNameSnapshot?: string },
  printRequest: PrintRequest | null,
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

async function loadPrintRequestItemsById(
  user: User,
  printRequestIds: string[],
): Promise<Map<string, PrintRequestItem>> {
  const itemsById = new Map<string, PrintRequestItem>();

  await Promise.all(
    printRequestIds.map(async (printRequestId) => {
      const items = await printRequestService.listPrintRequestItems(user, printRequestId);
      for (const item of items) {
        itemsById.set(item.id, item);
      }
    }),
  );

  return itemsById;
}

async function resolveAllocationExportAsset(input: {
  user: User;
  allocation: ShowAllocation;
  printRequestItem: PrintRequestItem | null;
  design: Design | null;
  upload: StudioCustomerUploadSummary | null;
  staffArtwork: StaffArtwork | null;
  printRequest: PrintRequest | null;
}): Promise<ResolvedShowExportAllocationAsset> {
  const { allocation, printRequestItem, design, upload, staffArtwork, printRequest } = input;

  if (!printRequestItem) {
    throw new Error(
      `Print request item ${allocation.printRequestItemId} is missing for allocation ${allocation.id}.`,
    );
  }

  const isUpload =
    allocation.sourceType === "customer_upload" || Boolean(allocation.customerUploadId);
  const isStaffArtwork = allocation.sourceType === "staff_artwork" || Boolean(allocation.staffArtworkId);

  const resolvedAsset = resolveShowExportProductionAsset({
    item: toShowExportPrintRequestItemFields(printRequestItem),
    catalogDesign: !isUpload && !isStaffArtwork && design ? toCatalogDesignAssetInput(design) : null,
    customerUpload: isUpload && upload ? toCustomerUploadAssetInput(upload) : null,
    staffArtwork: isStaffArtwork && staffArtwork ? toStaffArtworkAssetInput({
      id: staffArtwork.id,
      productionStoragePath: staffArtwork.productionStoragePath,
      interactiveEnhancedProductionStoragePath: staffArtwork.interactiveEnhancedProductionStoragePath,
      widthPx: staffArtwork.processing?.widthPx,
      heightPx: staffArtwork.processing?.heightPx,
      interactiveEnhancedWidthPx: staffArtwork.interactiveEnhancedWidthPx,
      interactiveEnhancedHeightPx: staffArtwork.interactiveEnhancedHeightPx,
      title: staffArtwork.title,
    }) : null,
  });

  const downloadUrl = await designDerivativeUrlService.getDownloadUrlForCatalogPath(
    resolvedAsset.productionStoragePath,
  );
  if (!downloadUrl) {
    throw new Error(
      `Unable to download production artwork for allocation ${allocation.id} (${resolvedAsset.productionStoragePath}). Verify the Storage object exists and Studio has read access to this path.`,
    );
  }

  const { printWidthInches, printHeightInches } = resolveQueuedPrintInches({
    allocationWidthInches: allocation.printWidthInches,
    allocationHeightInches: allocation.printHeightInches,
  });

  const { targetWidthPx, targetHeightPx } = computeExportTargetPixelSize(
    printWidthInches,
    printHeightInches,
    resolvedAsset.sourceWidthPx,
    resolvedAsset.sourceHeightPx,
  );

  const fileName =
    resolvedAsset.titleSnapshot ??
    design?.title ??
    upload?.originalFilename ??
    allocation.designTitleSnapshot ??
    (isStaffArtwork ? "staff-artwork" : isUpload ? "upload" : "design");

  return {
    allocationId: allocation.id,
    productionStoragePath: resolvedAsset.productionStoragePath,
    downloadUrl,
    targetWidthPx,
    targetHeightPx,
    printWidthInches,
    printHeightInches,
    fileName,
    quantity: allocation.allocatedQuantity,
    grouping: buildGroupingMetadata(allocation, printRequest),
  };
}

export async function buildShowExportAllocationAssets(
  user: User,
  show: UpcomingShow,
): Promise<{ assets: ResolvedShowExportAllocationAsset[]; error: string | null }> {
  const allocations = await upcomingShowService.listShowAllocations(user, show.id);
  const useHistoricalPastExport = shouldUseHistoricalShowExportAllocations(show);
  const activeAllocations = filterShowExportAllocations(allocations, {
    useHistoricalPastExport,
  });

  if (activeAllocations.length === 0) {
    return {
      assets: [],
      error: useHistoricalPastExport
        ? "This show has no attached print requests to export."
        : "This show has no active allocations to export.",
    };
  }

  const uniqueRequestIds = [...new Set(activeAllocations.map((allocation) => allocation.printRequestId))];
  const printRequestEntries = await Promise.all(
    uniqueRequestIds.map(async (printRequestId) => {
      try {
        const printRequest = await printRequestService.getPrintRequestById(user, printRequestId);
        return [printRequestId, printRequest] as const;
      } catch {
        return [printRequestId, null] as const;
      }
    }),
  );
  const printRequestsById = new Map(
    printRequestEntries.filter((entry): entry is readonly [string, PrintRequest] => entry[1] !== null),
  );

  const printRequestItemsById = await loadPrintRequestItemsById(user, uniqueRequestIds);
  const assets: ResolvedShowExportAllocationAsset[] = [];

  for (const allocation of activeAllocations) {
    const printRequestItem = printRequestItemsById.get(allocation.printRequestItemId) ?? null;
    const isUpload =
      allocation.sourceType === "customer_upload" || Boolean(allocation.customerUploadId);

    let design: Design | null = null;
    let upload: StudioCustomerUploadSummary | null = null;
    let staffArtwork: StaffArtwork | null = null;
    const isStaffArtwork = allocation.sourceType === "staff_artwork" || Boolean(allocation.staffArtworkId);

    if (isUpload && allocation.customerUploadId) {
      try {
        upload = await customerUploadReadService.getUploadById(user, allocation.customerUploadId);
      } catch {
        upload = null;
      }
    } else if (isStaffArtwork && allocation.staffArtworkId) {
      try {
        staffArtwork = await staffArtworkService.getById(user, allocation.staffArtworkId);
      } catch {
        staffArtwork = null;
      }
    } else if (allocation.designId) {
      try {
        design = await designService.getDesignById(user, allocation.designId);
      } catch {
        design = null;
      }
    }

    try {
      const resolved = await resolveAllocationExportAsset({
        user,
        allocation,
        printRequestItem,
        design,
        upload,
        staffArtwork,
        printRequest: printRequestsById.get(allocation.printRequestId) ?? null,
      });
      assets.push(resolved);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resolve production artwork.";
      return { assets: [], error: message };
    }
  }

  if (assets.length === 0) {
    return { assets: [], error: "No exportable images were found for this show's allocations." };
  }

  return { assets, error: null };
}
