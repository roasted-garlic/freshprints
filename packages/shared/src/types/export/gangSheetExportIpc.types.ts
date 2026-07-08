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

