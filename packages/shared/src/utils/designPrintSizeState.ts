import { TARGET_PRINT_DPI } from "../constants/printSize.constants";
import type { PrintSizeSource } from "../types/printSize/printSize.enums";
import { calculateEffectiveDpi } from "./printSizeMath";

export interface DesignPrintSizeSourceFields {
  width?: number;
  height?: number;
  printWidthInches?: number;
  printHeightInches?: number;
  printAspectRatioLocked?: boolean;
  effectiveDpi?: number;
  printSizeSource?: PrintSizeSource;
}

export interface ResolvedDesignPrintSize {
  pixelWidth: number;
  pixelHeight: number;
  printWidthInches: number;
  printHeightInches: number;
  printAspectRatioLocked: boolean;
  effectiveDpi: number;
  printSizeSource?: PrintSizeSource;
  usesLegacyFallback: boolean;
}

function hasPixelDimensions(
  design: DesignPrintSizeSourceFields,
): design is DesignPrintSizeSourceFields & { width: number; height: number } {
  return (
    typeof design.width === "number" &&
    design.width > 0 &&
    typeof design.height === "number" &&
    design.height > 0
  );
}

function resolveLegacyFallbackPrintSize(
  pixelWidth: number,
  pixelHeight: number,
): Omit<ResolvedDesignPrintSize, "printSizeSource"> {
  const printWidthInches = Math.round((pixelWidth / TARGET_PRINT_DPI) * 100) / 100;
  const printHeightInches = Math.round((pixelHeight / TARGET_PRINT_DPI) * 100) / 100;

  return {
    pixelWidth,
    pixelHeight,
    printWidthInches,
    printHeightInches,
    printAspectRatioLocked: true,
    effectiveDpi: TARGET_PRINT_DPI,
    usesLegacyFallback: true,
  };
}

/**
 * Resolves display and edit starting values for print settings.
 * Legacy designs without print fields use pixelWidth/300 normalization without persisting.
 */
export function resolveDesignPrintSizeForDisplay(
  design: DesignPrintSizeSourceFields,
): ResolvedDesignPrintSize | null {
  if (!hasPixelDimensions(design)) {
    return null;
  }

  const { width: pixelWidth, height: pixelHeight } = design;

  if (
    typeof design.printWidthInches === "number" &&
    typeof design.printHeightInches === "number"
  ) {
    const printAspectRatioLocked = design.printAspectRatioLocked ?? true;
    const effectiveDpiResult = calculateEffectiveDpi(
      pixelWidth,
      pixelHeight,
      design.printWidthInches,
      design.printHeightInches,
      printAspectRatioLocked,
    );

    return {
      pixelWidth,
      pixelHeight,
      printWidthInches: design.printWidthInches,
      printHeightInches: design.printHeightInches,
      printAspectRatioLocked,
      effectiveDpi:
        design.effectiveDpi ??
        (effectiveDpiResult.success ? effectiveDpiResult.effectiveDpi : TARGET_PRINT_DPI),
      printSizeSource: design.printSizeSource,
      usesLegacyFallback: false,
    };
  }

  return {
    ...resolveLegacyFallbackPrintSize(pixelWidth, pixelHeight),
    printSizeSource: design.printSizeSource,
  };
}

export function formatPrintSizeSourceLabel(source: PrintSizeSource | undefined): string {
  switch (source) {
    case "import_normalized":
      return "Import normalized";
    case "staff_edited":
      return "Staff edited";
    case "metadata_inferred":
      return "Metadata inferred";
    default:
      return "—";
  }
}
