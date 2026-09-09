import { composeContinuousCustomerGroupedGangSheetSheets } from "./composeContinuousCustomerGroupedGangSheetSheets";
import { composeGroupedGangSheetSheets } from "./composeGroupedGangSheetSheets";
import { downloadAndResizeExportImage } from "./downloadAndResizeExportImage";
import {
  clearAllGangSheetCaches,
  clearGangSheetCacheForShow,
  downloadCachedGangSheetFile,
  exportCachedGangSheetsToDirectory,
  fingerprintForRequest,
  getGangSheetCacheStatus,
  writeGangSheetCache,
} from "./gangSheetCache";
import { loadSharpModule } from "../import/loadSharpModule";
import {
  interleaveGroups,
  nestBoxesIntoShelvesWithHeightCap,
  type NestableBox,
} from "@fresh-prints/shared/utils/gangSheetNesting";
import { buildGangSheetFilename, buildGangSheetSheetLabel } from "@fresh-prints/shared/utils/showExportFilename";
import {
  buildGroupedSectionHeadingSvg,
  computeGroupedSectionLabelBandHeightPx,
  resolveGroupedSectionLabelFontSizePx,
  buildGangSheetLabelSvg,
  computeGangSheetLabelBandHeightPx,
} from "@fresh-prints/shared/utils/gangSheetLabelRendering";
import { calculateGangSheetCustomerSectionSummary } from "@fresh-prints/shared/utils/gangSheetCustomerSectionSummary";
import type {
  ClearGangSheetCacheRequest,
  DownloadCachedGangSheetRequest,
  DownloadCachedGangSheetResult,
  ExportCachedGangSheetsRequest,
  ExportCachedGangSheetsResult,
  GenerateGangSheetPngRequest,
  GenerateGangSheetPngResult,
  GetGangSheetCacheStatusRequest,
  GetGangSheetCacheStatusResult,
  GangSheetExportProgressEvent,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";

export type GangSheetExportProgressCallback = (event: GangSheetExportProgressEvent) => void;

const EXPORT_DPI = 300;

export class AllGangSheetImagesFailedError extends Error {
  constructor() {
    super("Every image in this gang sheet export failed to download, resize, or fit the sheet. No PNG was created.");
    this.name = "AllGangSheetImagesFailedError";
  }
}

interface ResizedImage {
  id: string;
  fileName: string;
  pngBytes: Buffer;
  widthPx: number;
  heightPx: number;
  printWidthInches: number;
  printHeightInches: number;
}

/**
 * Downloads, resizes, nests, and composites gang sheet PNGs into the local Electron cache.
 * Does not open a save dialog — use export/download-from-cache afterward.
 */
export async function generateGangSheetPng(
  request: GenerateGangSheetPngRequest,
  onProgress: GangSheetExportProgressCallback = () => undefined,
): Promise<GenerateGangSheetPngResult> {
  const warnings: ShowExportImageWarning[] = [];
  const imageTotal = request.images.reduce((sum, image) => sum + image.quantity, 0);

  let imageIndex = 0;
  let placementId = 0;
  const resizedImageGroups: ResizedImage[][] = [];
  const resizedByAssetId = new Map<
    string,
    Array<ResizedImage & { allocationId: string; requestItemId?: string }>
  >();

  for (const image of request.images) {
    const assetId = image.requestItemId ?? image.allocationId;
    if (!assetId) {
      throw new Error("A gang sheet image is missing its source identity.");
    }
    const downloadResult = await downloadAndResizeExportImage(
      image.downloadUrl,
      image.targetWidthPx,
      image.targetHeightPx,
      image.fileName,
      (step) => {
        if (step === "downloading" || step === "resizing") {
          onProgress({ fileName: image.fileName, imageIndex: imageIndex + 1, imageTotal, step });
        }
      },
    );

    const group: ResizedImage[] = [];

    for (let copyNumber = 1; copyNumber <= image.quantity; copyNumber += 1) {
      imageIndex += 1;

      if (!downloadResult.success) {
        if (copyNumber === 1) {
          warnings.push(downloadResult.warning);
        }
        continue;
      }

      if (copyNumber === 1 && downloadResult.data.warning) {
        warnings.push(downloadResult.data.warning);
      }

      placementId += 1;
      group.push({
        id: String(placementId),
        fileName: downloadResult.data.fileName,
        pngBytes: downloadResult.data.pngBytes,
        widthPx: image.targetWidthPx,
        heightPx: image.targetHeightPx,
        printWidthInches: image.printWidthInches ?? image.targetWidthPx / EXPORT_DPI,
        printHeightInches: image.printHeightInches ?? image.targetHeightPx / EXPORT_DPI,
      });
    }

    if (group.length > 0) {
      resizedImageGroups.push(group);
      resizedByAssetId.set(
        assetId,
        group.map((entry) => ({
          ...entry,
          allocationId: image.allocationId,
          requestItemId: image.requestItemId,
          printWidthInches: image.printWidthInches ?? entry.printWidthInches,
          printHeightInches: image.printHeightInches ?? entry.printHeightInches,
        })),
      );
    }
  }

  const sheetWidthPx = Math.round(request.sheetWidthInches * EXPORT_DPI);
  const spacingPx = {
    sideMarginPx: Math.round(request.sideMarginInches * EXPORT_DPI),
    topBottomMarginPx: Math.round(request.topBottomMarginInches * EXPORT_DPI),
    gutterPx: Math.round(request.gutterInches * EXPORT_DPI),
  };
  const maxSheetHeightPx = Math.round(request.maxSheetLengthInches * EXPORT_DPI);

  if (request.layoutMode === "grouped_by_customer" || request.layoutMode === "customer_grouped_continuous") {
    onProgress({ fileName: request.baseFileName, imageIndex: imageTotal, imageTotal, step: "nesting" });

    const composeGroupedSheets =
      request.layoutMode === "grouped_by_customer"
        ? composeGroupedGangSheetSheets
        : composeContinuousCustomerGroupedGangSheetSheets;

    const composedSheets = await composeGroupedSheets({
      request,
      resizedByAllocationId: resizedByAssetId,
      sheetWidthPx,
      spacingPx,
      maxSheetHeightPx,
      warnings,
      onProgress: (sheetIndex, sheetTotal) => {
        onProgress({
          fileName: request.baseFileName,
          imageIndex: imageTotal,
          imageTotal,
          step: "compositing",
          sheetIndex,
          sheetTotal,
        });
      },
    });

    if (composedSheets.length === 0) {
      throw new AllGangSheetImagesFailedError();
    }

    const fingerprint = fingerprintForRequest(request);
    const placedImageCount = [...resizedByAssetId.values()].reduce(
      (sum, group) => sum + group.length,
      0,
    );

    return writeGangSheetCache({
      request,
      fingerprint,
      sheets: composedSheets,
      placedImageCount,
      skippedImageCount: warnings.filter((warning) => warning.reason !== "upscaled").length,
      warnings,
    });
  }

  const resizedImages: ResizedImage[] = interleaveGroups(resizedImageGroups);

  if (resizedImages.length === 0) {
    throw new AllGangSheetImagesFailedError();
  }

  const nestableBoxes: NestableBox[] = resizedImages.map((image) => ({
    id: image.id,
    widthPx: image.widthPx,
    heightPx: image.heightPx,
  }));

  onProgress({ fileName: request.baseFileName, imageIndex: imageTotal, imageTotal, step: "nesting" });

  const nestResult = nestBoxesIntoShelvesWithHeightCap(nestableBoxes, sheetWidthPx, spacingPx, maxSheetHeightPx);

  for (const skipped of nestResult.skipped) {
    const skippedImage = resizedImages.find((image) => image.id === skipped.id);
    warnings.push({
      fileName: skippedImage?.fileName ?? skipped.id,
      reason: "too_wide_for_sheet",
      message: `This design (${skippedImage?.widthPx ?? "?"}px wide) is wider than the gang sheet's usable width and was skipped.`,
    });
  }

  if (nestResult.sheets.length === 0) {
    throw new AllGangSheetImagesFailedError();
  }

  const imagesById = new Map(resizedImages.map((image) => [image.id, image]));
  const sharpApi = await loadSharpModule();
  const rotatedPngCache = new Map<string, Buffer>();

  async function getPlacementPngBytes(placementId: string, rotated: boolean): Promise<Buffer | undefined> {
    const image = imagesById.get(placementId);
    if (!image) {
      return undefined;
    }

    if (!rotated) {
      return image.pngBytes;
    }

    const cached = rotatedPngCache.get(placementId);
    if (cached) {
      return cached;
    }

    const rotatedBytes = await sharpApi(image.pngBytes, { limitInputPixels: false }).rotate(90).png().toBuffer();
    rotatedPngCache.set(placementId, rotatedBytes);
    return rotatedBytes;
  }

  const sheetTotal = nestResult.sheets.length;
  const requestSummary = request.cacheScope?.startsWith("print-request:") && request.sectionPricing
    ? calculateGangSheetCustomerSectionSummary(
        request.images.map((image) => ({
          printWidthInches: image.printWidthInches ?? image.targetWidthPx / EXPORT_DPI,
          printHeightInches: image.printHeightInches ?? image.targetHeightPx / EXPORT_DPI,
          quantity: image.quantity,
        })),
        request.sectionPricing,
      )
    : null;
  const summaryFontSizePx = resolveGroupedSectionLabelFontSizePx(request.labelFontSizePx);
  const labelBandHeightPx = requestSummary
    ? computeGroupedSectionLabelBandHeightPx(request.labelFontSizePx, summaryFontSizePx)
    : computeGangSheetLabelBandHeightPx(request.labelFontSizePx);
  const composedSheets: Array<{ fileName: string; lengthInches: number; heightPx: number; buffer: Buffer }> = [];

  for (const [sheetOffset, sheet] of nestResult.sheets.entries()) {
    const sheetIndex = sheetOffset + 1;
    onProgress({
      fileName: request.baseFileName,
      imageIndex: imageTotal,
      imageTotal,
      step: "compositing",
      sheetIndex,
      sheetTotal,
    });

    const sheetHeightPx = sheet.sheetHeightPx + labelBandHeightPx;
    const lengthInches = sheetHeightPx / EXPORT_DPI;
    const fileName = buildGangSheetFilename(request.baseFileName, sheetIndex, sheetTotal, lengthInches);
    const label = buildGangSheetSheetLabel(request.sheetLabel ?? request.baseFileName, sheetIndex, sheetTotal);
    const labelSvg = requestSummary
      ? buildGroupedSectionHeadingSvg({
          heading: label,
          summaryLines: [requestSummary.priceLine, requestSummary.weightLine],
          sheetWidthPx,
          bandHeightPx: labelBandHeightPx,
          headingFontSizePx: request.labelFontSizePx,
          summaryFontSizePx,
        })
      : buildGangSheetLabelSvg({
          label,
          sheetWidthPx,
          bandHeightPx: labelBandHeightPx,
          labelFontSizePx: request.labelFontSizePx,
        });

    const compositeInputs = await Promise.all(
      sheet.placements.map(async (placement) => ({
        input: await getPlacementPngBytes(placement.id, placement.rotated),
        left: placement.x,
        top: placement.y + labelBandHeightPx,
      })),
    );

    const composited = await sharpApi({
      create: {
        width: sheetWidthPx,
        height: sheetHeightPx,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
      limitInputPixels: false,
    })
      .composite([{ input: Buffer.from(labelSvg), left: 0, top: 0 }, ...compositeInputs])
      .withMetadata({ density: EXPORT_DPI })
      .png()
      .toBuffer();

    composedSheets.push({
      fileName,
      lengthInches,
      heightPx: sheetHeightPx,
      buffer: composited,
    });
  }

  const fingerprint = fingerprintForRequest(request);

  return writeGangSheetCache({
    request,
    fingerprint,
    sheets: composedSheets,
    placedImageCount: nestResult.sheets.reduce((sum, sheet) => sum + sheet.placements.length, 0),
    skippedImageCount: warnings.filter((warning) => warning.reason !== "upscaled").length,
    warnings,
  });
}

export async function exportCachedGangSheets(
  request: ExportCachedGangSheetsRequest,
): Promise<ExportCachedGangSheetsResult> {
  return exportCachedGangSheetsToDirectory(request.showId, request.fingerprint);
}

export async function downloadCachedGangSheet(
  request: DownloadCachedGangSheetRequest,
): Promise<DownloadCachedGangSheetResult> {
  return downloadCachedGangSheetFile(request.showId, request.fingerprint, request.sheetIndex);
}

export async function clearGangSheetCache(request: ClearGangSheetCacheRequest): Promise<void> {
  await clearGangSheetCacheForShow(request.showId);
}

export async function clearAllGangSheetCache(): Promise<void> {
  await clearAllGangSheetCaches();
}

export async function readGangSheetCacheStatus(
  request: GetGangSheetCacheStatusRequest,
): Promise<GetGangSheetCacheStatusResult> {
  return getGangSheetCacheStatus(request.showId, request.fingerprint ?? undefined);
}
