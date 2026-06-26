import { readFile, stat } from "node:fs/promises";

import {
  MAX_SINGLE_PNG_SIZE_BYTES,
} from "../../../shared/constants/importValidation.constants";
import { ImportLimitExceededError } from "../../../shared/errors/importLimitErrors";
import type {
  ImportPngWarning,
  ValidateSelectedPngFileResult,
} from "../../../shared/types/import/importIpc.types";
import { assessPrintSizeCapability } from "../../../shared/utils/printSizeMath";
import {
  formatPrintSizeNormalizedMessage,
  formatPrintSizeRejectedMessage,
  formatPrintSizeSmallFormatMessage,
  formatPrintSizeStandardApparelMessage,
  formatPrintSizeTerribleMessage,
} from "../../../shared/utils/importPrintSizeMessages";
import { formatPngSizeLimitExceededMessage } from "../../../shared/utils/importLimitMessages";
import { getFileExtension, getFileName, hasAllowedExtension } from "./importPathUtils";
import { parsePngMetadata } from "./pngParser";

export class PngValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PngValidationError";
  }
}

function roundDpi(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildDpiMetadataWarnings(dpiX: number | undefined, dpiY: number | undefined): ImportPngWarning[] {
  if (dpiX === undefined || dpiY === undefined) {
    return [
      {
        code: "DPI_METADATA_MISSING",
        message: "PNG does not contain DPI metadata.",
      },
    ];
  }

  return [];
}

function buildPrintSizeWarnings(
  assessment: ValidateSelectedPngFileResult["printSizeAssessment"],
): ImportPngWarning[] {
  const warnings: ImportPngWarning[] = [
    {
      code: "PRINT_SIZE_NORMALIZED",
      message: formatPrintSizeNormalizedMessage(
        assessment.suggestedPrintWidthInches,
        assessment.suggestedPrintHeightInches,
        assessment.targetDpi,
      ),
    },
  ];

  if (assessment.acceptanceLevel === "warn") {
    warnings.push({
      code: "PRINT_SIZE_BELOW_PREFERRED",
      message: formatPrintSizeStandardApparelMessage(),
    });
  }

  if (assessment.acceptanceLevel === "small_format") {
    warnings.push({
      code: "PRINT_SIZE_SMALL_FORMAT",
      message: formatPrintSizeSmallFormatMessage(),
    });
  }

  if (assessment.acceptanceLevel === "terrible") {
    warnings.push({
      code: "PRINT_SIZE_TERRIBLE",
      message: formatPrintSizeTerribleMessage(),
    });
  }

  return warnings;
}

export async function validatePngFile(filePath: string): Promise<ValidateSelectedPngFileResult> {
  if (!hasAllowedExtension(filePath)) {
    throw new PngValidationError("Only PNG files with a .png extension can be imported.");
  }

  const fileStats = await stat(filePath);

  if (!fileStats.isFile()) {
    throw new PngValidationError("The selected path is not a file.");
  }

  if (fileStats.size > MAX_SINGLE_PNG_SIZE_BYTES) {
    throw new ImportLimitExceededError(formatPngSizeLimitExceededMessage());
  }

  const fileBuffer = await readFile(filePath);
  const metadata = parsePngMetadata(fileBuffer);
  const assessmentResult = assessPrintSizeCapability(metadata.width, metadata.height);

  if (!assessmentResult.success) {
    throw new PngValidationError(assessmentResult.error);
  }

  if (assessmentResult.assessment.acceptanceLevel === "reject") {
    throw new PngValidationError(formatPrintSizeRejectedMessage());
  }

  const roundedDpiX = metadata.dpiX !== undefined ? roundDpi(metadata.dpiX) : undefined;
  const roundedDpiY = metadata.dpiY !== undefined ? roundDpi(metadata.dpiY) : undefined;
  const warnings = [
    ...buildDpiMetadataWarnings(roundedDpiX, roundedDpiY),
    ...buildPrintSizeWarnings(assessmentResult.assessment),
  ];

  return {
    valid: true,
    filePath,
    fileName: getFileName(filePath),
    fileSizeBytes: fileStats.size,
    width: metadata.width,
    height: metadata.height,
    dpiX: roundedDpiX,
    dpiY: roundedDpiY,
    hasDpiMetadata: metadata.hasDpiMetadata,
    dpiSource: metadata.dpiSource,
    printSizeAssessment: assessmentResult.assessment,
    warnings,
  };
}

export function getSelectedPngExtension(filePath: string): string {
  return getFileExtension(filePath) || ".png";
}
