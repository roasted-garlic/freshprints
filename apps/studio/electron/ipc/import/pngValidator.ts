import { readFile, stat } from "node:fs/promises";

import {
  MAX_SINGLE_PNG_SIZE_BYTES,
} from "@fresh-prints/shared/constants/importValidation.constants";
import { ImportLimitExceededError } from "@fresh-prints/shared/errors/importLimitErrors";
import type {
  ImportPngWarning,
  ValidateSelectedPngFileResult,
} from "@fresh-prints/shared/types/import/importIpc.types";
import {
  assessPrintSizeCapability,
  getImportUpscaleScaleFactor,
  isImportUpscaleSoftQuality,
} from "@fresh-prints/shared/utils/printSizeMath";
import {
  formatImageTrimmedMessage,
  formatImageUpscaledMessage,
  formatImageUpscaledSoftQualityMessage,
  formatPrintSizeNormalizedMessage,
  formatPrintSizeRejectedMessage,
  formatPrintSizeSmallFormatMessage,
  formatPrintSizeStandardApparelMessage,
  formatPrintSizeTerribleMessage,
} from "@fresh-prints/shared/utils/importPrintSizeMessages";
import { formatPngSizeLimitExceededMessage } from "@fresh-prints/shared/utils/importLimitMessages";
import { evaluateImportPngMeaningfulTransparency } from "../../services/import/importMeaningfulTransparencyCheck";
import { trimImportImageIfNeeded } from "../../services/import/trimImportImage";
import { upscaleImportImageIfNeeded } from "../../services/import/upscaleImportImage";
import { getFileExtension, getFileName, hasAllowedExtension } from "./importPathUtils";
import { parsePngMetadata } from "./pngParser";
import { cacheCorrectedImportBytes } from "./correctedImportBytesCache";
import { buildImageQualitySizingMetadata } from "@fresh-prints/shared/utils/imageQualitySizingPolicy";
import type { ImportFileRejectionReasonCode } from "@fresh-prints/shared/types/import/batchImport.types";

export class PngValidationError extends Error {
  readonly reasonCode?: ImportFileRejectionReasonCode;

  constructor(message: string, reasonCode?: ImportFileRejectionReasonCode) {
    super(message);
    this.name = "PngValidationError";
    this.reasonCode = reasonCode;
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

function buildTrimWarning(
  originalWidth: number,
  originalHeight: number,
  trimmedWidth: number,
  trimmedHeight: number,
): ImportPngWarning {
  return {
    code: "IMAGE_TRIMMED",
    message: formatImageTrimmedMessage(originalWidth, originalHeight, trimmedWidth, trimmedHeight),
    details: {
      originalWidth,
      originalHeight,
      trimmedWidth,
      trimmedHeight,
    },
  };
}

function buildUpscaleWarning(
  originalWidth: number,
  originalHeight: number,
  upscaledWidth: number,
  upscaledHeight: number,
): ImportPngWarning {
  return {
    code: "IMAGE_UPSCALED",
    message: formatImageUpscaledMessage(originalWidth, originalHeight, upscaledWidth, upscaledHeight),
    details: {
      originalWidth,
      originalHeight,
      upscaledWidth,
      upscaledHeight,
    },
  };
}

function buildUpscaleSoftQualityWarning(
  originalWidth: number,
  originalHeight: number,
  upscaledWidth: number,
  upscaledHeight: number,
  scaleFactor: number,
): ImportPngWarning {
  return {
    code: "IMAGE_UPSCALED_SOFT_QUALITY",
    message: formatImageUpscaledSoftQualityMessage(scaleFactor),
    details: {
      originalWidth,
      originalHeight,
      upscaledWidth,
      upscaledHeight,
      upscaleScaleFactor: scaleFactor,
    },
  };
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

  // Meaningful transparency on source bytes — before trim/upscale/Storage/design/AI.
  const transparency = await evaluateImportPngMeaningfulTransparency(fileBuffer);
  if (!transparency.ok) {
    throw new PngValidationError(
      transparency.message,
      transparency.reasonCode === "TRANSPARENCY_CHECK_FAILED"
        ? "VALIDATION_ERROR"
        : "BACKGROUND_NOT_TRANSPARENT",
    );
  }

  const trimResult = await trimImportImageIfNeeded(fileBuffer);

  const rejectAssessment = assessPrintSizeCapability(trimResult.width, trimResult.height);

  if (!rejectAssessment.success) {
    throw new PngValidationError(rejectAssessment.error);
  }

  if (rejectAssessment.assessment.acceptanceLevel === "reject") {
    throw new PngValidationError(formatPrintSizeRejectedMessage());
  }

  const upscaleResult = await upscaleImportImageIfNeeded(
    trimResult.bytes,
    trimResult.width,
    trimResult.height,
  );

  const wasCorrected = trimResult.wasTrimmed || upscaleResult.wasUpscaled;

  if (wasCorrected) {
    cacheCorrectedImportBytes(filePath, {
      bytes: upscaleResult.bytes,
      width: upscaleResult.width,
      height: upscaleResult.height,
    });
  }

  const assessmentResult = assessPrintSizeCapability(upscaleResult.width, upscaleResult.height);

  if (!assessmentResult.success) {
    throw new PngValidationError(assessmentResult.error);
  }

  const sizingMeta = buildImageQualitySizingMetadata(upscaleResult.width, upscaleResult.height, {
    wasUpscaled: upscaleResult.wasUpscaled,
    upscalePassCount: upscaleResult.upscalePassCount,
    upscaleFactor: upscaleResult.upscaleFactor,
    sizingWarningCode: upscaleResult.sizingWarningCode,
  });

  const roundedDpiX = metadata.dpiX !== undefined ? roundDpi(metadata.dpiX) : undefined;
  const roundedDpiY = metadata.dpiY !== undefined ? roundDpi(metadata.dpiY) : undefined;
  const warnings = [
    ...buildDpiMetadataWarnings(roundedDpiX, roundedDpiY),
    ...(trimResult.wasTrimmed
      ? [
          buildTrimWarning(
            trimResult.originalWidth,
            trimResult.originalHeight,
            trimResult.width,
            trimResult.height,
          ),
        ]
      : []),
    ...(upscaleResult.wasUpscaled
      ? [
          buildUpscaleWarning(
            upscaleResult.originalWidth,
            upscaleResult.originalHeight,
            upscaleResult.width,
            upscaleResult.height,
          ),
          ...(isImportUpscaleSoftQuality(upscaleResult.originalWidth, upscaleResult.width)
            ? [
                buildUpscaleSoftQualityWarning(
                  upscaleResult.originalWidth,
                  upscaleResult.originalHeight,
                  upscaleResult.width,
                  upscaleResult.height,
                  getImportUpscaleScaleFactor(
                    upscaleResult.originalWidth,
                    upscaleResult.width,
                  ) ?? 0,
                ),
              ]
            : []),
        ]
      : []),
    ...buildPrintSizeWarnings(assessmentResult.assessment),
  ];

  return {
    valid: true,
    filePath,
    fileName: getFileName(filePath),
    fileSizeBytes: upscaleResult.bytes.length,
    width: upscaleResult.width,
    height: upscaleResult.height,
    dpiX: roundedDpiX,
    dpiY: roundedDpiY,
    hasDpiMetadata: metadata.hasDpiMetadata,
    dpiSource: metadata.dpiSource,
    wasTrimmed: trimResult.wasTrimmed,
    wasUpscaled: upscaleResult.wasUpscaled,
    ...(wasCorrected
      ? { originalWidth: metadata.width, originalHeight: metadata.height }
      : {}),
    printSizeAssessment: assessmentResult.assessment,
    approvedMaxPrintWidthInches: sizingMeta.approvedMaxPrintWidthInches,
    approvedMaxPrintHeightInches: sizingMeta.approvedMaxPrintHeightInches,
    sizingPolicyVersion: sizingMeta.sizingPolicyVersion,
    upscaleFactor: sizingMeta.upscaleFactor,
    upscalePassCount: sizingMeta.upscalePassCount,
    warnings,
  };
}

export function getSelectedPngExtension(filePath: string): string {
  return getFileExtension(filePath) || ".png";
}
