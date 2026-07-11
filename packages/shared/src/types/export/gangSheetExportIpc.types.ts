import type { ShowExportImageWarning } from "./showExportIpc.types";

/** One design to place on the gang sheet, repeated `quantity` times during nesting. */
export interface GangSheetExportImageRequest {
  allocationId: string;
  downloadUrl: string;
  targetWidthPx: number;
  targetHeightPx: number;
  fileName: string;
  quantity: number;
}

export interface ExportGangSheetPngRequest {
  baseFileName: string;
  sheetWidthInches: number;
  /** Sheet edge to nearest image, left/right only. */
  sideMarginInches: number;
  /** Sheet edge to nearest image, top/bottom only. */
  topBottomMarginInches: number;
  /** Image-to-image spacing, both within a row and between rows. */
  gutterInches: number;
  /** Height cap before starting a new sheet. */
  maxSheetLengthInches: number;
  /** Sheet label text font size in pixels. */
  labelFontSizePx: number;
  images: GangSheetExportImageRequest[];
}

/** Generate composited sheets into the local Electron cache (no save dialog). */
export interface GenerateGangSheetPngRequest extends ExportGangSheetPngRequest {
  showId: string;
}

export interface CachedGangSheetSheetMeta {
  sheetIndex: number;
  sheetTotal: number;
  fileName: string;
  lengthInches: number;
  heightPx: number;
  byteSize: number;
}

export interface GenerateGangSheetPngResult {
  showId: string;
  fingerprint: string;
  sheets: CachedGangSheetSheetMeta[];
  placedImageCount: number;
  skippedImageCount: number;
  totalByteSize: number;
  warnings: ShowExportImageWarning[];
}

export interface ExportCachedGangSheetsRequest {
  showId: string;
  fingerprint: string;
}

export interface ExportCachedGangSheetsResult {
  canceled: boolean;
  savedFilePaths: string[];
}

export interface DownloadCachedGangSheetRequest {
  showId: string;
  fingerprint: string;
  /** 1-based sheet index. */
  sheetIndex: number;
}

export interface DownloadCachedGangSheetResult {
  canceled: boolean;
  savedFilePath: string | null;
}

export interface ClearGangSheetCacheRequest {
  showId: string;
}

export interface GetGangSheetCacheStatusRequest {
  showId: string;
  fingerprint: string;
}

export interface GetGangSheetCacheStatusResult {
  ready: boolean;
  sheets: CachedGangSheetSheetMeta[];
  totalByteSize: number;
  placedImageCount: number;
  skippedImageCount: number;
  warnings: ShowExportImageWarning[];
}

/** @deprecated Prefer generate + export-from-cache; kept for type compatibility during transition. */
export interface ExportGangSheetPngResult {
  canceled: boolean;
  savedFilePaths: string[];
  placedImageCount: number;
  skippedImageCount: number;
  warnings: ShowExportImageWarning[];
}

/** One step within processing a single gang sheet image, in the order they occur. */
export type GangSheetExportImageStep = "downloading" | "resizing" | "nesting" | "compositing";

/** Emitted from main to the renderer as each image moves through each processing step. */
export interface GangSheetExportProgressEvent {
  fileName: string;
  imageIndex: number;
  imageTotal: number;
  step: GangSheetExportImageStep;
}
