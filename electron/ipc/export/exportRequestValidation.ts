import type {
  ExportGangSheetPngRequest,
  GangSheetExportImageRequest,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ExportShowZipRequest, ShowExportImageRequest } from "@fresh-prints/shared/types/export/showExportIpc.types";
import { importIpcFailure } from "../import/importIpcResponse";

const ALLOWED_DOWNLOAD_URL_HOSTS = new Set(["firebasestorage.googleapis.com"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Main must never fetch an arbitrary renderer-supplied URL. Only Firebase Storage download URLs
 * (the only kind the renderer's `designDerivativeUrlService` ever produces) are allowed through.
 */
function isAllowedDownloadUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && ALLOWED_DOWNLOAD_URL_HOSTS.has(parsed.host);
  } catch {
    return false;
  }
}

function isValidImageRequest(value: unknown): value is ShowExportImageRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const image = value as Partial<ShowExportImageRequest>;

  return (
    isNonEmptyString(image.allocationId) &&
    isAllowedDownloadUrl(image.downloadUrl) &&
    isPositiveInteger(image.targetWidthPx) &&
    isPositiveInteger(image.targetHeightPx) &&
    isNonEmptyString(image.fileName) &&
    isPositiveInteger(image.quantity)
  );
}

export function validateExportShowZipRequest(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { error: importIpcFailure("INVALID_INPUT", "An export request object is required.") };
  }

  const request = payload as Partial<ExportShowZipRequest>;

  if (!isNonEmptyString(request.zipFileName)) {
    return { error: importIpcFailure("INVALID_INPUT", "A zip file name is required.") };
  }

  if (!Array.isArray(request.images) || request.images.length === 0) {
    return { error: importIpcFailure("INVALID_INPUT", "At least one image is required to export.") };
  }

  if (!request.images.every(isValidImageRequest)) {
    return { error: importIpcFailure("INVALID_INPUT", "One or more export image entries are invalid.") };
  }

  if (typeof request.multiplyByQuantity !== "boolean") {
    return { error: importIpcFailure("INVALID_INPUT", "multiplyByQuantity must be a boolean.") };
  }

  return { request: request as ExportShowZipRequest };
}

function isValidGangSheetImageRequest(value: unknown): value is GangSheetExportImageRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const image = value as Partial<GangSheetExportImageRequest>;

  return (
    isNonEmptyString(image.allocationId) &&
    isAllowedDownloadUrl(image.downloadUrl) &&
    isPositiveInteger(image.targetWidthPx) &&
    isPositiveInteger(image.targetHeightPx) &&
    isNonEmptyString(image.fileName) &&
    isPositiveInteger(image.quantity)
  );
}

export function validateExportGangSheetPngRequest(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { error: importIpcFailure("INVALID_INPUT", "A gang sheet export request object is required.") };
  }

  const request = payload as Partial<ExportGangSheetPngRequest>;

  if (!isNonEmptyString(request.baseFileName)) {
    return { error: importIpcFailure("INVALID_INPUT", "A base file name is required.") };
  }

  if (!isPositiveNumber(request.sheetWidthInches)) {
    return { error: importIpcFailure("INVALID_INPUT", "A positive sheet width in inches is required.") };
  }

  if (
    !isNonNegativeNumber(request.sideMarginInches) ||
    !isNonNegativeNumber(request.topBottomMarginInches) ||
    !isNonNegativeNumber(request.gutterInches)
  ) {
    return { error: importIpcFailure("INVALID_INPUT", "Gang sheet spacing values must be non-negative numbers.") };
  }

  if (!isPositiveNumber(request.maxSheetLengthInches)) {
    return { error: importIpcFailure("INVALID_INPUT", "A positive max sheet length in inches is required.") };
  }

  if (!Array.isArray(request.images) || request.images.length === 0) {
    return { error: importIpcFailure("INVALID_INPUT", "At least one image is required to export.") };
  }

  if (!request.images.every(isValidGangSheetImageRequest)) {
    return { error: importIpcFailure("INVALID_INPUT", "One or more gang sheet image entries are invalid.") };
  }

  return { request: request as ExportGangSheetPngRequest };
}
