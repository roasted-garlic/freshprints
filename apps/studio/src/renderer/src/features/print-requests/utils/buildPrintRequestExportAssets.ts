import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { GangSheetExportImageGrouping } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import { computeExportTargetPixelSize } from "@fresh-prints/shared/utils/showExportFilename";
import {
  resolveShowExportProductionAsset,
  toCatalogDesignAssetInput,
  toCustomerUploadAssetInput,
  toShowExportPrintRequestItemFields,
} from "@fresh-prints/shared/utils/resolveShowExportProductionAsset";

import type { User } from "../../users/types/user.types";
import type { Design } from "../../designs/types/design.types";
import { designService } from "../../designs/services/designService";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import {
  customerUploadReadService,
  type StudioCustomerUploadSummary,
} from "../../customer-uploads/services/customerUploadReadService";

export interface ResolvedPrintRequestExportAsset {
  requestItemId: string;
  productionStoragePath: string;
  downloadUrl: string;
  targetWidthPx: number;
  targetHeightPx: number;
  printWidthInches: number;
  printHeightInches: number;
  fileName: string;
  quantity: number;
  grouping: GangSheetExportImageGrouping;
}

function requirePositiveNumber(value: number | undefined, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Print request item is missing a valid ${label}.`);
  }
  return value;
}

function buildGroupingMetadata(printRequest: PrintRequest): GangSheetExportImageGrouping {
  return {
    printRequestId: printRequest.id,
    requestName: printRequest.name,
    customerId: printRequest.customerId,
    customerUsernameSnapshot: printRequest.customerUsernameSnapshot,
    internalBaseName: printRequest.internalBaseName,
    isInternal: printRequest.isInternal,
  };
}

export async function resolvePrintRequestExportAsset(input: {
  user: User;
  printRequest: PrintRequest;
  item: PrintRequestItem;
  design: Design | null;
  upload: StudioCustomerUploadSummary | null;
}): Promise<ResolvedPrintRequestExportAsset> {
  const { printRequest, item, design, upload } = input;
  const printWidthInches = requirePositiveNumber(item.printWidthInches, "print width");
  const printHeightInches = requirePositiveNumber(item.printHeightInches, "print height");
  const quantity = requirePositiveNumber(item.quantity, "quantity");
  if (!Number.isInteger(quantity)) {
    throw new Error("Print request item quantity must be a whole number.");
  }

  const isUpload = item.sourceType === "customer_upload" || Boolean(item.customerUploadId);
  const resolvedAsset = resolveShowExportProductionAsset({
    item: toShowExportPrintRequestItemFields(item),
    catalogDesign: !isUpload && design ? toCatalogDesignAssetInput(design) : null,
    customerUpload: isUpload && upload ? toCustomerUploadAssetInput(upload) : null,
  });
  const downloadUrl = await designDerivativeUrlService.getDownloadUrlForCatalogPath(
    resolvedAsset.productionStoragePath,
  );
  if (!downloadUrl) {
    throw new Error(
      `Unable to download production artwork for request item ${item.id} (${resolvedAsset.productionStoragePath}). Verify the Storage object exists and Studio has read access to this path.`,
    );
  }

  const { targetWidthPx, targetHeightPx } = computeExportTargetPixelSize(
    printWidthInches,
    printHeightInches,
    resolvedAsset.sourceWidthPx,
    resolvedAsset.sourceHeightPx,
  );

  return {
    requestItemId: item.id,
    productionStoragePath: resolvedAsset.productionStoragePath,
    downloadUrl,
    targetWidthPx,
    targetHeightPx,
    printWidthInches,
    printHeightInches,
    fileName:
      resolvedAsset.titleSnapshot?.trim() ||
      item.titleSnapshot?.trim() ||
      design?.title?.trim() ||
      upload?.originalFilename?.trim() ||
      (isUpload ? "upload" : "design"),
    quantity,
    grouping: buildGroupingMetadata(printRequest),
  };
}

export async function buildPrintRequestExportAssets(
  user: User,
  printRequest: PrintRequest,
  items: PrintRequestItem[],
): Promise<{ assets: ResolvedPrintRequestExportAsset[]; error: string | null }> {
  if (items.length === 0) {
    return { assets: [], error: "Add at least one item to this print request first." };
  }

  const assets: ResolvedPrintRequestExportAsset[] = [];
  for (const item of items) {
    let design: Design | null = null;
    let upload: StudioCustomerUploadSummary | null = null;
    const isUpload = item.sourceType === "customer_upload" || Boolean(item.customerUploadId);

    try {
      if (isUpload) {
        if (!item.customerUploadId) throw new Error(`Request item ${item.id} is missing its customer upload.`);
        upload = await customerUploadReadService.getUploadById(user, item.customerUploadId);
      } else {
        if (!item.designId) throw new Error(`Request item ${item.id} is missing its catalog design.`);
        design = await designService.getDesignById(user, item.designId);
      }

      assets.push(await resolvePrintRequestExportAsset({ user, printRequest, item, design, upload }));
    } catch (error) {
      return {
        assets: [],
        error: error instanceof Error ? error.message : `Unable to resolve request item ${item.id}.`,
      };
    }
  }

  return { assets, error: null };
}
