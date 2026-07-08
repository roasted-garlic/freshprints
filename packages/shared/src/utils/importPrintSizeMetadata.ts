import type { PrintSizeSource } from "../types/printSize/printSize.enums";
import type { PrintSizeAssessment } from "../types/printSize/printSize.types";
import { TARGET_PRINT_DPI } from "../constants/printSize.constants";
import { calculateEffectiveDpi, calculatePrintSizeAtTargetDpi } from "./printSizeMath";

export interface ImportPrintSizeCreateFields {
  printWidthInches: number;
  printHeightInches: number;
  printAspectRatioLocked: true;
  metadataDpiX?: number;
  metadataDpiY?: number;
  effectiveDpi: number;
  printSizeSource: Extract<PrintSizeSource, "import_normalized">;
}

export interface BuildImportPrintSizeCreateFieldsInput {
  pixelWidth: number;
  pixelHeight: number;
  assessment: PrintSizeAssessment;
  metadataDpiX?: number;
  metadataDpiY?: number;
}

/**
 * Builds service-owned print-size fields for import createDesign calls.
 * Requires a prior successful print-size assessment from validation.
 */
export function buildImportPrintSizeCreateFields(
  input: BuildImportPrintSizeCreateFieldsInput,
): ImportPrintSizeCreateFields | { error: string } {
  const { assessment, pixelWidth, pixelHeight, metadataDpiX, metadataDpiY } = input;

  if (assessment.acceptanceLevel === "reject") {
    return { error: "Print size assessment rejected this image." };
  }

  const printSizeResult = calculatePrintSizeAtTargetDpi(
    pixelWidth,
    pixelHeight,
    assessment.targetDpi ?? TARGET_PRINT_DPI,
  );

  if (!printSizeResult.success) {
    return { error: printSizeResult.error };
  }

  const effectiveDpiResult = calculateEffectiveDpi(
    pixelWidth,
    pixelHeight,
    printSizeResult.printWidthInches,
    printSizeResult.printHeightInches,
    true,
  );

  if (!effectiveDpiResult.success) {
    return { error: effectiveDpiResult.error };
  }

  return {
    printWidthInches: printSizeResult.printWidthInches,
    printHeightInches: printSizeResult.printHeightInches,
    printAspectRatioLocked: true,
    metadataDpiX,
    metadataDpiY,
    effectiveDpi: effectiveDpiResult.effectiveDpi,
    printSizeSource: "import_normalized",
  };
}
