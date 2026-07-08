import type { ImportIpcResult } from "../import/importIpc.types";
import type {
  ExportGangSheetPngRequest,
  ExportGangSheetPngResult,
  GangSheetExportProgressEvent,
} from "./gangSheetExportIpc.types";

/** One image to download, resize to a fixed 300 DPI print size, and add to the export zip. */
export interface ShowExportImageRequest {
  allocationId: string;
  downloadUrl: string;
  targetWidthPx: number;
  targetHeightPx: number;
  fileName: string;
  /** Allocation quantity; used to write multiple copies when `multiplyByQuantity` is set. */
  quantity: number;
}

export interface ExportShowZipRequest {
  zipFileName: string;
  images: ShowExportImageRequest[];
  /** When true, writes `quantity` copies of each image into the zip instead of one. */
  multiplyByQuantity: boolean;
}

export interface ShowExportImageWarning {
  fileName: string;
  reason: "download_failed" | "resize_failed" | "upscaled" | "too_wide_for_sheet";
  message: string;
}

export interface ExportShowZipResult {
  canceled: boolean;
  savedFilePath?: string;
  exportedImageCount: number;
  skippedImageCount: number;
  warnings: ShowExportImageWarning[];
}

/** One step within processing a single export image, in the order they occur. */
export type ShowExportImageStep = "downloading" | "resizing" | "adding_to_zip";

/** Emitted from main to the renderer as each image moves through each processing step. */
export interface ShowExportProgressEvent {
  fileName: string;
  imageIndex: number;
  imageTotal: number;
  step: ShowExportImageStep;
}

export interface FreshPrintsExportApi {
  exportShowZip(request: ExportShowZipRequest): Promise<ImportIpcResult<ExportShowZipResult>>;
  onExportProgress(callback: (event: ShowExportProgressEvent) => void): () => void;
  exportGangSheetPng(
    request: ExportGangSheetPngRequest,
  ): Promise<ImportIpcResult<ExportGangSheetPngResult>>;
  onGangSheetExportProgress(callback: (event: GangSheetExportProgressEvent) => void): () => void;
}
