import { FieldValue, Timestamp, type DocumentReference } from "firebase-admin/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import { getCustomerUploadInteractiveProductionStoragePath } from "../../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";
import {
  getInteractiveOriginalStoragePath,
  getOriginalStoragePath,
} from "../../../packages/shared/src/constants/design/designStoragePaths";
import type {
  SetPrintRequestItemArtworkEnhanceModeRequest,
  SetPrintRequestItemArtworkEnhanceModeResponse,
} from "../../../packages/shared/src/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types";
import {
  hasInteractiveArtworkDerivative,
  resolveArtworkEnhanceMode,
  resolveInteractiveEnhanceTargetPixels,
  resolveInteractiveUpscaleToggleEligibility,
  type ArtworkEnhanceMode,
} from "../../../packages/shared/src/utils/interactiveArtworkEnhance";
import {
  resolveNativeProductionSourcePixels,
  type ArtworkUpscalePassCount,
} from "../../../packages/shared/src/utils/manualArtworkEnhance";
import { isPortalEditablePrintRequest } from "../../../packages/shared/src/utils/portalPrintRequestEditability";
import { assessPrintRequestItemSize } from "../../../packages/shared/src/utils/printRequestItemSizing";

import { adminDb, adminStorage } from "./admin";
import { processArtworkEnhancePng } from "./artworkEnhanceProcessing";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
} from "./errors";
import { withoutUndefinedFields } from "./firestoreDocument";
import { storageObjectPath } from "./storageObjectPath";

const ENHANCE_LOCK_MS = 10 * 60 * 1000;

export type ArtworkEnhanceModeCallerContext =
  | { kind: "staff"; callerId: string }
  | { kind: "portal"; callerId: string; customerId: string };

export function parseSetPrintRequestItemArtworkEnhanceModeRequest(
  data: unknown,
): SetPrintRequestItemArtworkEnhanceModeRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data is required.");
  }

  const printRequestId =
    "printRequestId" in data && typeof data.printRequestId === "string"
      ? data.printRequestId.trim()
      : "";
  const itemId = "itemId" in data && typeof data.itemId === "string" ? data.itemId.trim() : "";
  const modeRaw = "mode" in data && typeof data.mode === "string" ? data.mode.trim() : "";

  if (!printRequestId || !itemId) {
    throw new Error("Print request item is required.");
  }

  if (modeRaw !== "baseline" && modeRaw !== "enhanced") {
    throw new Error("mode must be baseline or enhanced.");
  }

  return {
    printRequestId,
    itemId,
    mode: modeRaw,
    confirmFirstEnhance: "confirmFirstEnhance" in data && data.confirmFirstEnhance === true,
  };
}

export function isStaffOnlyAuthError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /only staff accounts can perform this action/i.test(error.message)
  );
}

function readUpscalePassCount(value: unknown): ArtworkUpscalePassCount {
  if (value === 0 || value === 1 || value === 2) {
    return value;
  }
  return 0;
}

function readPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function readLockUntilMillis(lockUntil: unknown): number | null {
  if (
    lockUntil &&
    typeof lockUntil === "object" &&
    "toMillis" in lockUntil &&
    typeof (lockUntil as { toMillis: () => number }).toMillis === "function"
  ) {
    return (lockUntil as { toMillis: () => number }).toMillis();
  }
  return null;
}

export function resolveBaselineRestorePrintSize(input: {
  currentPrintWidthInches?: number;
  currentPrintHeightInches?: number;
  preEnhancePrintWidthInches?: number;
  preEnhancePrintHeightInches?: number;
  baselineWidthPx: number;
  baselineHeightPx: number;
}): { printWidthInches?: number; printHeightInches?: number } {
  const restoreWidth = readPositiveNumber(input.preEnhancePrintWidthInches);
  const restoreHeight = readPositiveNumber(input.preEnhancePrintHeightInches);

  if (restoreWidth === undefined || restoreHeight === undefined) {
    return {
      printWidthInches: readPositiveNumber(input.currentPrintWidthInches),
      printHeightInches: readPositiveNumber(input.currentPrintHeightInches),
    };
  }

  const assessment = assessPrintRequestItemSize({
    pixelWidth: input.baselineWidthPx,
    pixelHeight: input.baselineHeightPx,
    printWidthInches: restoreWidth,
    printHeightInches: restoreHeight,
  });

  if (!assessment.canSave) {
    throw failedPrecondition(
      assessment.errorMessage ?? "Cannot restore the pre-enhancement print size for this item.",
    );
  }

  return {
    printWidthInches: restoreWidth,
    printHeightInches: restoreHeight,
  };
}

function assertPortalOwnership(
  printRequest: Record<string, unknown>,
  portalCustomerId: string,
): void {
  if (printRequest.customerId !== portalCustomerId) {
    throw permissionDenied("You do not own this print request.");
  }

  if (!isPortalEditablePrintRequest(printRequest as Parameters<typeof isPortalEditablePrintRequest>[0])) {
    throw failedPrecondition("This print request can no longer be edited.");
  }
}

function deriveInteractiveNextPassCount(
  baselinePassCount: ArtworkUpscalePassCount,
): ArtworkUpscalePassCount {
  if (baselinePassCount >= 2) {
    return 2;
  }
  return (baselinePassCount + 1) as ArtworkUpscalePassCount;
}

interface CatalogAssetContext {
  sourceType: "catalog_design";
  designId: string;
  designRef: DocumentReference;
  design: Record<string, unknown>;
  baselineWidthPx: number;
  baselineHeightPx: number;
  baselineProductionPath: string;
  interactivePath: string;
  enhancedWidthPx?: number;
  enhancedHeightPx?: number;
  hasDerivative: boolean;
  nativeWidthPx: number;
  nativeHeightPx: number;
  upscalePassCount: ArtworkUpscalePassCount;
}

interface UploadAssetContext {
  sourceType: "customer_upload";
  customerUploadId: string;
  uploadRef: DocumentReference;
  upload: Record<string, unknown>;
  customerUid: string;
  baselineWidthPx: number;
  baselineHeightPx: number;
  baselineProductionPath: string;
  interactivePath: string;
  enhancedWidthPx?: number;
  enhancedHeightPx?: number;
  hasDerivative: boolean;
  nativeWidthPx: number;
  nativeHeightPx: number;
  upscalePassCount: ArtworkUpscalePassCount;
}

type AssetContext = CatalogAssetContext | UploadAssetContext;

async function loadCatalogAssetContext(
  designId: string,
): Promise<CatalogAssetContext> {
  const designRef = adminDb.collection("designs").doc(designId);
  const designSnap = await designRef.get();
  if (!designSnap.exists) {
    throw invalidArgument("Design was not found.");
  }

  const design = designSnap.data() ?? {};
  const baselineWidthPx = typeof design.width === "number" ? design.width : 0;
  const baselineHeightPx = typeof design.height === "number" ? design.height : 0;
  if (baselineWidthPx <= 0 || baselineHeightPx <= 0) {
    throw failedPrecondition("Design pixel dimensions are required before enhancement.");
  }

  const native = resolveNativeProductionSourcePixels({
    currentWidthPx: baselineWidthPx,
    currentHeightPx: baselineHeightPx,
    upscalePassCount: readUpscalePassCount(design.upscalePassCount),
    upscaleFactor: typeof design.upscaleFactor === "number" ? design.upscaleFactor : 1,
    nativeSourceWidthPx:
      typeof design.nativeProductionWidthPx === "number" ? design.nativeProductionWidthPx : undefined,
    nativeSourceHeightPx:
      typeof design.nativeProductionHeightPx === "number"
        ? design.nativeProductionHeightPx
        : undefined,
  });

  const interactivePath =
    typeof design.interactiveEnhancedOriginalPath === "string" &&
    design.interactiveEnhancedOriginalPath.trim()
      ? design.interactiveEnhancedOriginalPath.trim()
      : getInteractiveOriginalStoragePath(designId);

  const baselineProductionPath =
    typeof design.originalPath === "string" && design.originalPath.trim()
      ? design.originalPath.trim()
      : getOriginalStoragePath(designId);

  return {
    sourceType: "catalog_design",
    designId,
    designRef,
    design,
    baselineWidthPx,
    baselineHeightPx,
    baselineProductionPath,
    interactivePath,
    enhancedWidthPx: readPositiveNumber(design.interactiveEnhancedWidthPx),
    enhancedHeightPx: readPositiveNumber(design.interactiveEnhancedHeightPx),
    hasDerivative: hasInteractiveArtworkDerivative({
      currentWidthPx: baselineWidthPx,
      currentHeightPx: baselineHeightPx,
      interactiveEnhanceGeneratedAt: design.interactiveEnhanceGeneratedAt,
    }),
    nativeWidthPx: native.widthPx,
    nativeHeightPx: native.heightPx,
    upscalePassCount: readUpscalePassCount(design.upscalePassCount),
  };
}

async function loadUploadAssetContext(customerUploadId: string): Promise<UploadAssetContext> {
  const uploadRef = adminDb
    .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
    .doc(customerUploadId);
  const uploadSnap = await uploadRef.get();
  if (!uploadSnap.exists) {
    throw invalidArgument("Customer upload was not found.");
  }

  const upload = uploadSnap.data() ?? {};
  const customerUid =
    typeof upload.customerUid === "string" && upload.customerUid.trim()
      ? upload.customerUid.trim()
      : "";
  if (!customerUid) {
    throw failedPrecondition("Customer upload is missing owner metadata.");
  }

  const baselineWidthPx = readPositiveNumber(upload.widthPx) ?? 0;
  const baselineHeightPx = readPositiveNumber(upload.heightPx) ?? 0;
  if (baselineWidthPx <= 0 || baselineHeightPx <= 0) {
    throw failedPrecondition("Upload pixel dimensions are required before enhancement.");
  }

  const baselineProductionPath =
    typeof upload.productionStoragePath === "string" && upload.productionStoragePath.trim()
      ? upload.productionStoragePath.trim()
      : "";

  if (!baselineProductionPath) {
    throw failedPrecondition("Upload production asset is missing.");
  }

  const native = resolveNativeProductionSourcePixels({
    currentWidthPx: baselineWidthPx,
    currentHeightPx: baselineHeightPx,
    upscalePassCount: readUpscalePassCount(upload.upscalePassCount),
    upscaleFactor: typeof upload.upscaleFactor === "number" ? upload.upscaleFactor : 1,
    nativeSourceWidthPx:
      typeof upload.sourceWidthPx === "number" ? upload.sourceWidthPx : undefined,
    nativeSourceHeightPx:
      typeof upload.sourceHeightPx === "number" ? upload.sourceHeightPx : undefined,
  });

  const interactivePath =
    typeof upload.interactiveEnhancedProductionStoragePath === "string" &&
    upload.interactiveEnhancedProductionStoragePath.trim()
      ? upload.interactiveEnhancedProductionStoragePath.trim()
      : getCustomerUploadInteractiveProductionStoragePath(customerUid, customerUploadId);

  return {
    sourceType: "customer_upload",
    customerUploadId,
    uploadRef,
    upload,
    customerUid,
    baselineWidthPx,
    baselineHeightPx,
    baselineProductionPath,
    interactivePath,
    enhancedWidthPx: readPositiveNumber(upload.interactiveEnhancedWidthPx),
    enhancedHeightPx: readPositiveNumber(upload.interactiveEnhancedHeightPx),
    hasDerivative: hasInteractiveArtworkDerivative({
      currentWidthPx: baselineWidthPx,
      currentHeightPx: baselineHeightPx,
      interactiveEnhanceGeneratedAt: upload.interactiveEnhanceGeneratedAt,
    }),
    nativeWidthPx: native.widthPx,
    nativeHeightPx: native.heightPx,
    upscalePassCount: readUpscalePassCount(upload.upscalePassCount),
  };
}

function readActivePixelDimensions(
  mode: ArtworkEnhanceMode,
  asset: AssetContext,
): { widthPx: number; heightPx: number } {
  if (
    mode === "enhanced" &&
    asset.enhancedWidthPx &&
    asset.enhancedHeightPx &&
    asset.hasDerivative
  ) {
    return {
      widthPx: asset.enhancedWidthPx,
      heightPx: asset.enhancedHeightPx,
    };
  }

  return {
    widthPx: asset.baselineWidthPx,
    heightPx: asset.baselineHeightPx,
  };
}

function readArtworkEnhanceMode(value: unknown): ArtworkEnhanceMode | undefined {
  if (value === "baseline" || value === "enhanced") {
    return value;
  }
  return undefined;
}

function buildResponse(
  request: SetPrintRequestItemArtworkEnhanceModeRequest,
  item: Record<string, unknown>,
  asset: AssetContext,
  resultCode: SetPrintRequestItemArtworkEnhanceModeResponse["resultCode"],
  message?: string,
): SetPrintRequestItemArtworkEnhanceModeResponse {
  const mode = resolveArtworkEnhanceMode(
    readArtworkEnhanceMode(item.artworkEnhanceMode) ?? request.mode,
  );
  const pixels = readActivePixelDimensions(mode, asset);

  return {
    resultCode,
    printRequestId: request.printRequestId,
    itemId: request.itemId,
    sourceType: asset.sourceType,
    designId: asset.sourceType === "catalog_design" ? asset.designId : undefined,
    customerUploadId: asset.sourceType === "customer_upload" ? asset.customerUploadId : undefined,
    artworkEnhanceMode: mode,
    widthPx: pixels.widthPx,
    heightPx: pixels.heightPx,
    printWidthInches: readPositiveNumber(item.printWidthInches),
    printHeightInches: readPositiveNumber(item.printHeightInches),
    message,
  };
}

async function switchToBaseline(
  caller: ArtworkEnhanceModeCallerContext,
  request: SetPrintRequestItemArtworkEnhanceModeRequest,
  itemRef: DocumentReference,
  item: Record<string, unknown>,
  asset: AssetContext,
): Promise<SetPrintRequestItemArtworkEnhanceModeResponse> {
  await itemRef.update(
    withoutUndefinedFields({
      artworkEnhanceMode: "baseline",
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const updatedItem = {
    ...item,
    artworkEnhanceMode: "baseline",
  };

  return buildResponse(
    request,
    updatedItem,
    asset,
    "switched_baseline",
    "Switched to standard artwork at the current print size.",
  );
}

async function switchToEnhancedReuse(
  caller: ArtworkEnhanceModeCallerContext,
  request: SetPrintRequestItemArtworkEnhanceModeRequest,
  itemRef: DocumentReference,
  item: Record<string, unknown>,
  asset: AssetContext,
): Promise<SetPrintRequestItemArtworkEnhanceModeResponse> {
  if (!asset.enhancedWidthPx || !asset.enhancedHeightPx) {
    throw failedPrecondition("Interactive enhanced artwork metadata is incomplete.");
  }

  await itemRef.update({
    artworkEnhanceMode: "enhanced",
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedItem = {
    ...item,
    artworkEnhanceMode: "enhanced",
  };

  return buildResponse(
    request,
    updatedItem,
    asset,
    "reused_derivative",
    "Reused the existing enhanced artwork.",
  );
}

async function generateInteractiveDerivative(
  caller: ArtworkEnhanceModeCallerContext,
  request: SetPrintRequestItemArtworkEnhanceModeRequest,
  itemRef: DocumentReference,
  item: Record<string, unknown>,
  asset: AssetContext,
): Promise<SetPrintRequestItemArtworkEnhanceModeResponse> {
  if (asset.hasDerivative) {
    throw failedPrecondition("Interactive enhanced artwork already exists for this asset.");
  }

  const printWidthInches = readPositiveNumber(item.printWidthInches);
  const printHeightInches = readPositiveNumber(item.printHeightInches);
  if (printWidthInches === undefined || printHeightInches === undefined) {
    throw failedPrecondition("Print size is required before enhancing artwork.");
  }

  const eligibility = resolveInteractiveUpscaleToggleEligibility({
    asset: {
      currentWidthPx: asset.baselineWidthPx,
      currentHeightPx: asset.baselineHeightPx,
      upscalePassCount: asset.upscalePassCount,
    },
    printWidthInches,
    printHeightInches,
    artworkEnhanceMode: "enhanced",
  });

  if (!eligibility.toggleEnabled || eligibility.state !== "available") {
    throw failedPrecondition(
      eligibility.helperText ?? "This artwork cannot be enhanced for the selected print size.",
    );
  }

  const enhanceTarget = resolveInteractiveEnhanceTargetPixels({
    baselineWidthPx: asset.baselineWidthPx,
    baselineHeightPx: asset.baselineHeightPx,
    nativeWidthPx: asset.nativeWidthPx,
    nativeHeightPx: asset.nativeHeightPx,
    printWidthInches,
    printHeightInches,
  });

  if (!enhanceTarget) {
    throw failedPrecondition(
      "Resolution is already optimal for this print size. Increase the print dimensions if you need more upscale headroom.",
    );
  }

  if (
    asset.sourceType === "catalog_design" &&
    caller.kind === "staff" &&
    !request.confirmFirstEnhance &&
    !asset.hasDerivative
  ) {
    throw failedPrecondition(
      "Confirm interactive enhancement before generating the enhanced artwork.",
    );
  }

  const lockField =
    asset.sourceType === "catalog_design" ? asset.design.artworkEnhanceLockUntil : asset.upload.artworkEnhanceLockUntil;
  const lockUntilMs = readLockUntilMillis(lockField);
  if (lockUntilMs !== null && lockUntilMs > Date.now()) {
    return buildResponse(
      request,
      item,
      asset,
      "in_progress",
      "Enhancement is already in progress for this artwork.",
    );
  }

  const assetRef = asset.sourceType === "catalog_design" ? asset.designRef : asset.uploadRef;

  await assetRef.update({
    artworkEnhanceLockUntil: Timestamp.fromMillis(Date.now() + ENHANCE_LOCK_MS),
    artworkEnhanceLockBy: caller.callerId,
  });

  try {
    const bucket = adminStorage.bucket();
    const [sourceBuffer] = await bucket
      .file(storageObjectPath(asset.baselineProductionPath))
      .download();

    const processed = await processArtworkEnhancePng({
      sourcePng: sourceBuffer,
      sourceWidthPx: asset.baselineWidthPx,
      sourceHeightPx: asset.baselineHeightPx,
      targetWidthPx: enhanceTarget.targetWidthPx,
      targetHeightPx: enhanceTarget.targetHeightPx,
      nextUpscalePassCount: deriveInteractiveNextPassCount(asset.upscalePassCount),
      cumulativeUpscaleFactor: enhanceTarget.cumulativeFactor,
    });

    await bucket.file(storageObjectPath(asset.interactivePath)).save(processed.productionPng, {
      contentType: "image/png",
      resumable: false,
    });

    const assetUpdate =
      asset.sourceType === "catalog_design"
        ? {
            interactiveEnhancedOriginalPath: asset.interactivePath,
            interactiveEnhancedWidthPx: processed.widthPx,
            interactiveEnhancedHeightPx: processed.heightPx,
            interactiveEnhanceGeneratedAt: FieldValue.serverTimestamp(),
            interactiveEnhanceGeneratedBy: caller.callerId,
          }
        : {
            interactiveEnhancedProductionStoragePath: asset.interactivePath,
            interactiveEnhancedWidthPx: processed.widthPx,
            interactiveEnhancedHeightPx: processed.heightPx,
            interactiveEnhanceGeneratedAt: FieldValue.serverTimestamp(),
            interactiveEnhanceGeneratedBy: caller.callerId,
          };

    await assetRef.update(
      withoutUndefinedFields({
        ...assetUpdate,
        artworkEnhanceLockUntil: FieldValue.delete(),
        artworkEnhanceLockBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    const itemUpdate = withoutUndefinedFields({
      artworkEnhanceMode: "enhanced" as const,
      preEnhancePrintWidthInches:
        readPositiveNumber(item.preEnhancePrintWidthInches) ?? printWidthInches,
      preEnhancePrintHeightInches:
        readPositiveNumber(item.preEnhancePrintHeightInches) ?? printHeightInches,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await itemRef.update(itemUpdate);

    const updatedAsset: AssetContext =
      asset.sourceType === "catalog_design"
        ? {
            ...asset,
            hasDerivative: true,
            enhancedWidthPx: processed.widthPx,
            enhancedHeightPx: processed.heightPx,
          }
        : {
            ...asset,
            hasDerivative: true,
            enhancedWidthPx: processed.widthPx,
            enhancedHeightPx: processed.heightPx,
          };

    const updatedItem = {
      ...item,
      ...itemUpdate,
    };

    return buildResponse(
      request,
      updatedItem,
      updatedAsset,
      "generated_enhanced",
      "Generated enhanced artwork for this item.",
    );
  } catch (error) {
    await assetRef.update({
      artworkEnhanceLockUntil: FieldValue.delete(),
      artworkEnhanceLockBy: FieldValue.delete(),
    });
    throw error;
  }
}

export async function executeSetPrintRequestItemArtworkEnhanceMode(
  caller: ArtworkEnhanceModeCallerContext,
  request: SetPrintRequestItemArtworkEnhanceModeRequest,
): Promise<SetPrintRequestItemArtworkEnhanceModeResponse> {
  const printRequestRef = adminDb.collection("printRequests").doc(request.printRequestId);
  const itemRef = adminDb.collection("printRequestItems").doc(request.itemId);

  const [printRequestSnap, itemSnap] = await Promise.all([
    printRequestRef.get(),
    itemRef.get(),
  ]);

  if (!printRequestSnap.exists) {
    throw invalidArgument("Print request was not found.");
  }
  if (!itemSnap.exists) {
    throw invalidArgument("Print request item was not found.");
  }

  const printRequest = printRequestSnap.data() ?? {};
  const item = itemSnap.data() ?? {};

  if (item.printRequestId !== request.printRequestId) {
    throw invalidArgument("Print request item does not belong to this request.");
  }

  if (caller.kind === "portal") {
    assertPortalOwnership(printRequest, caller.customerId);
  }

  const sourceType =
    typeof item.sourceType === "string" ? item.sourceType : "catalog_design";

  let asset: AssetContext;
  if (sourceType === "customer_upload") {
    const customerUploadId =
      typeof item.customerUploadId === "string" && item.customerUploadId.trim()
        ? item.customerUploadId.trim()
        : "";
    if (!customerUploadId) {
      throw invalidArgument("This item is not linked to a customer upload.");
    }
    asset = await loadUploadAssetContext(customerUploadId);
  } else {
    const designId =
      typeof item.designId === "string" && item.designId.trim() ? item.designId.trim() : "";
    if (!designId) {
      throw invalidArgument("This item is not linked to a catalog design.");
    }
    asset = await loadCatalogAssetContext(designId);
  }

  const currentMode = resolveArtworkEnhanceMode(readArtworkEnhanceMode(item.artworkEnhanceMode));

  if (request.mode === "baseline") {
    if (currentMode === "baseline") {
      return buildResponse(request, item, asset, "switched_baseline", "Item is already on baseline artwork.");
    }
    return switchToBaseline(caller, request, itemRef, item, asset);
  }

  if (asset.hasDerivative) {
    if (currentMode === "enhanced") {
      return buildResponse(request, item, asset, "reused_derivative", "Item is already using enhanced artwork.");
    }
    return switchToEnhancedReuse(caller, request, itemRef, item, asset);
  }

  return generateInteractiveDerivative(caller, request, itemRef, item, asset);
}
