const EXPORT_DPI = 300;

/**
 * Formats a Date into the filename-safe `MM-DD-YYYY` form used for the exported zip's name
 * (`whatnot_<this>.zip`) and the gang sheet's base name/on-image label. Uses local date
 * components directly (not `toISOString`, which is UTC) so the filename matches the show's
 * displayed local schedule. Time of day is intentionally omitted.
 */
export function formatExportZipDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${month}-${day}-${year}`;
}

/** Builds the full export zip filename from the show's scheduled date/time. */
export function buildExportZipFilename(scheduledStartAt: Date): string {
  return `whatnot_${formatExportZipDateTime(scheduledStartAt)}.zip`;
}

/**
 * Builds the gang sheet's base name (no extension, no sheet numbering) from the show's scheduled
 * date/time. Sheet count isn't known until after nesting completes, so callers append numbering
 * (via `buildGangSheetFilename`/`buildGangSheetSheetLabel`) once the real count is known.
 */
export function buildGangSheetBaseFileName(scheduledStartAt: Date): string {
  return `whatnot_${formatExportZipDateTime(scheduledStartAt)}_gang-sheet`;
}

/**
 * Builds one sheet's PNG filename from the gang sheet's base name. Every sheet gets a
 * filename-safe "N of M" suffix, even a single sheet (`_1-of-1`), so every saved file's sheet
 * position is unambiguous regardless of how many sheets a show's content produced.
 */
export function buildGangSheetFilename(
  baseFileName: string,
  sheetIndex: number,
  sheetTotal: number,
): string {
  return `${baseFileName}_${sheetIndex}-of-${sheetTotal}.png`;
}

/**
 * Builds the human-readable label rendered onto the gang sheet image itself: the base filename
 * (no extension) plus "N of M", e.g. `whatnot_2026-07-06_18-00_gang-sheet — 1 of 3`.
 */
export function buildGangSheetSheetLabel(
  baseFileNameWithoutExtension: string,
  sheetIndex: number,
  sheetTotal: number,
): string {
  return `${baseFileNameWithoutExtension} — ${sheetIndex} of ${sheetTotal}`;
}

/**
 * Sanitizes a design title for use inside a filename: lowercase, spaces/underscores collapsed to
 * single hyphens, anything outside `[a-z0-9-]` stripped, repeated hyphens collapsed, and
 * leading/trailing hyphens trimmed. Falls back to `"design"` if nothing usable remains.
 */
export function sanitizeFilenameSegment(value: string): string {
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "design";
}

/** Formats an inches value trimmed of unnecessary trailing zeros, e.g. `10` not `10.00`. */
export function formatInchesForFilename(inches: number): string {
  return Number(inches.toFixed(2)).toString();
}

export interface ExportImageFilenameInput {
  sequenceNumber: number;
  allocatedQuantity: number;
  printWidthInches: number;
  printHeightInches: number;
  designTitle: string;
  allocationId: string;
}

/**
 * Builds the per-image export filename:
 * `{seq}_QTY-{allocatedQuantity}_{width}x{height}_{sanitized-title}_alloc-{shortId}.png`
 * e.g. `001_QTY-2_10x8.33_design-title_alloc-abc123.png`.
 */
export function buildExportImageFilename(input: ExportImageFilenameInput): string {
  const sequence = String(input.sequenceNumber).padStart(3, "0");
  const size = `${formatInchesForFilename(input.printWidthInches)}x${formatInchesForFilename(input.printHeightInches)}`;
  const title = sanitizeFilenameSegment(input.designTitle);
  const shortAllocationId = input.allocationId.slice(0, 6);

  return `${sequence}_QTY-${input.allocatedQuantity}_${size}_${title}_alloc-${shortAllocationId}.png`;
}

/**
 * Rewrites a `buildExportImageFilename` result for the "multiply by quantity" export mode: the
 * `QTY-{n}` segment (which only makes sense for the single-file-per-design standard export) is
 * replaced with `{copyNumber}of{copyCount}`, e.g. `001_QTY-2_...` -> `001_1of2_...`. Used when
 * writing one file per allocated unit instead of one file per design.
 */
export function withMultiplyByQuantitySuffix(
  fileName: string,
  copyNumber: number,
  copyCount: number,
): string {
  return fileName.replace(/_QTY-\d+_/, `_${copyNumber}of${copyCount}_`);
}

export interface ExportTargetPixelSize {
  targetWidthPx: number;
  targetHeightPx: number;
  needsUpscale: boolean;
}

/**
 * Computes the fixed-300-DPI target pixel dimensions for an export image, and whether the source
 * image has fewer pixels than that target in either dimension (meaning the resize will need to
 * upscale to hit the requested print size).
 */
export function computeExportTargetPixelSize(
  printWidthInches: number,
  printHeightInches: number,
  sourceWidthPx: number,
  sourceHeightPx: number,
): ExportTargetPixelSize {
  const targetWidthPx = Math.round(printWidthInches * EXPORT_DPI);
  const targetHeightPx = Math.round(printHeightInches * EXPORT_DPI);

  return {
    targetWidthPx,
    targetHeightPx,
    needsUpscale: sourceWidthPx < targetWidthPx || sourceHeightPx < targetHeightPx,
  };
}
