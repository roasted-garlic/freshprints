import type {
  ClearGangSheetCacheRequest,
  DownloadCachedGangSheetRequest,
  ExportCachedGangSheetsRequest,
  ExportGangSheetPngRequest,
  GenerateGangSheetPngRequest,
  GetGangSheetCacheStatusRequest,
  GangSheetExportImageRequest,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ExportShowZipRequest, ShowExportImageRequest } from "@fresh-prints/shared/types/export/showExportIpc.types";
import {
  isValidGangSheetSectionPriceCutoffInches,
  isValidGangSheetTierPriceUsd,
  isValidGangSheetTierWeightOz,
  type GangSheetSectionPricingConfig,
} from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
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

function isValidGangSheetImageGrouping(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const grouping = value as Partial<GangSheetExportImageRequest["grouping"]>;
  if (!grouping) {
    return false;
  }

  return (
    isNonEmptyString(grouping.printRequestId) &&
    isNonEmptyString(grouping.requestName) &&
    typeof grouping.isInternal === "boolean" &&
    (grouping.customerId === undefined || isNonEmptyString(grouping.customerId)) &&
    (grouping.customerUsernameSnapshot === undefined || typeof grouping.customerUsernameSnapshot === "string") &&
    (grouping.internalBaseName === undefined || typeof grouping.internalBaseName === "string")
  );
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
    isPositiveInteger(image.quantity) &&
    isValidGangSheetImageGrouping(image.grouping)
  );
}

function isValidGangSheetLayoutMode(value: unknown): value is NonNullable<ExportGangSheetPngRequest["layoutMode"]> {
  return (
    value === undefined ||
    value === "efficiency" ||
    value === "grouped_by_customer" ||
    value === "customer_grouped_continuous"
  );
}

function isGroupedGangSheetLayoutMode(
  layoutMode: ExportGangSheetPngRequest["layoutMode"],
): boolean {
  return layoutMode === "grouped_by_customer" || layoutMode === "customer_grouped_continuous";
}

function isValidSectionPricing(value: unknown): value is GangSheetSectionPricingConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const pricing = value as Partial<GangSheetSectionPricingConfig>;
  return (
    typeof pricing.sizeCutoffInches === "number" &&
    isValidGangSheetSectionPriceCutoffInches(pricing.sizeCutoffInches) &&
    typeof pricing.smallTierPriceUsd === "number" &&
    isValidGangSheetTierPriceUsd(pricing.smallTierPriceUsd) &&
    typeof pricing.smallTierWeightOz === "number" &&
    isValidGangSheetTierWeightOz(pricing.smallTierWeightOz) &&
    typeof pricing.largeTierPriceUsd === "number" &&
    isValidGangSheetTierPriceUsd(pricing.largeTierPriceUsd) &&
    typeof pricing.largeTierWeightOz === "number" &&
    isValidGangSheetTierWeightOz(pricing.largeTierWeightOz)
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

  if (!isPositiveInteger(request.labelFontSizePx)) {
    return { error: importIpcFailure("INVALID_INPUT", "A positive label font size in pixels is required.") };
  }

  if (!isValidGangSheetLayoutMode(request.layoutMode)) {
    return {
      error: importIpcFailure(
        "INVALID_INPUT",
        'layoutMode must be omitted, "efficiency", "grouped_by_customer", or "customer_grouped_continuous".',
      ),
    };
  }

  if (!Array.isArray(request.images) || request.images.length === 0) {
    return { error: importIpcFailure("INVALID_INPUT", "At least one image is required to export.") };
  }

  if (!request.images.every(isValidGangSheetImageRequest)) {
    return { error: importIpcFailure("INVALID_INPUT", "One or more gang sheet image entries are invalid.") };
  }

  if (isGroupedGangSheetLayoutMode(request.layoutMode) && request.images.some((image) => !image.grouping)) {
    return {
      error: importIpcFailure(
        "INVALID_INPUT",
        "Grouped gang sheet generation requires grouping metadata on every image.",
      ),
    };
  }

  if (request.sectionPricing !== undefined && !isValidSectionPricing(request.sectionPricing)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "Gang sheet section pricing settings are invalid."),
    };
  }

  return { request: request as ExportGangSheetPngRequest };
}

export function validateGenerateGangSheetPngRequest(
  payload: unknown,
): { request: GenerateGangSheetPngRequest } | { error: ReturnType<typeof importIpcFailure> } {
  const base = validateExportGangSheetPngRequest(payload);
  if (!("request" in base) || !base.request) {
    return {
      error:
        "error" in base && base.error
          ? base.error
          : importIpcFailure("INVALID_INPUT", "A gang sheet export request object is required."),
    };
  }

  const exportRequest = base.request;
  const request = payload as Partial<GenerateGangSheetPngRequest>;
  if (!isNonEmptyString(request.showId)) {
    return { error: importIpcFailure("INVALID_INPUT", "A show id is required to generate gang sheets.") };
  }

  return {
    request: {
      baseFileName: exportRequest.baseFileName,
      sheetWidthInches: exportRequest.sheetWidthInches,
      sideMarginInches: exportRequest.sideMarginInches,
      topBottomMarginInches: exportRequest.topBottomMarginInches,
      gutterInches: exportRequest.gutterInches,
      maxSheetLengthInches: exportRequest.maxSheetLengthInches,
      labelFontSizePx: exportRequest.labelFontSizePx,
      ...(exportRequest.layoutMode && exportRequest.layoutMode !== "efficiency"
        ? {
            layoutMode: exportRequest.layoutMode,
            ...(exportRequest.sectionPricing
              ? { sectionPricing: exportRequest.sectionPricing }
              : {}),
          }
        : {}),
      images: exportRequest.images,
      showId: request.showId.trim(),
    },
  };
}

function isValidCacheLookup(payload: unknown): payload is { showId: string; fingerprint: string } {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const request = payload as Partial<ExportCachedGangSheetsRequest>;
  return isNonEmptyString(request.showId) && isNonEmptyString(request.fingerprint);
}

export function validateExportCachedGangSheetsRequest(payload: unknown) {
  if (!isValidCacheLookup(payload)) {
    return { error: importIpcFailure("INVALID_INPUT", "Show id and cache fingerprint are required.") };
  }

  return { request: payload as ExportCachedGangSheetsRequest };
}

export function validateDownloadCachedGangSheetRequest(payload: unknown) {
  if (!isValidCacheLookup(payload)) {
    return { error: importIpcFailure("INVALID_INPUT", "Show id and cache fingerprint are required.") };
  }

  const request = payload as Partial<DownloadCachedGangSheetRequest>;
  if (!isPositiveInteger(request.sheetIndex)) {
    return { error: importIpcFailure("INVALID_INPUT", "A positive sheet index is required.") };
  }

  return { request: payload as DownloadCachedGangSheetRequest };
}

export function validateClearGangSheetCacheRequest(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { error: importIpcFailure("INVALID_INPUT", "A show id is required to clear the gang sheet cache.") };
  }

  const request = payload as Partial<ClearGangSheetCacheRequest>;
  if (!isNonEmptyString(request.showId)) {
    return { error: importIpcFailure("INVALID_INPUT", "A show id is required to clear the gang sheet cache.") };
  }

  return { request: payload as ClearGangSheetCacheRequest };
}

export function validateGetGangSheetCacheStatusRequest(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { error: importIpcFailure("INVALID_INPUT", "A show id is required to read the gang sheet cache.") };
  }

  const request = payload as Partial<GetGangSheetCacheStatusRequest>;
  if (!isNonEmptyString(request.showId)) {
    return { error: importIpcFailure("INVALID_INPUT", "A show id is required to read the gang sheet cache.") };
  }

  if (request.fingerprint !== undefined && !isNonEmptyString(request.fingerprint)) {
    return { error: importIpcFailure("INVALID_INPUT", "Cache fingerprint must be a non-empty string when provided.") };
  }

  return { request: payload as GetGangSheetCacheStatusRequest };
}
