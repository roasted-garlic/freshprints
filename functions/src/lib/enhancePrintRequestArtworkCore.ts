import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  getOriginalStoragePath,
  getPreviewStoragePath,
  getThumbnailStoragePath,
} from "../../../packages/shared/src/constants/design/designStoragePaths";
import type {
  EnhancePrintRequestArtworkRequest,
  EnhancePrintRequestArtworkResponse,
} from "../../../packages/shared/src/types/printRequest/enhancePrintRequestArtwork.types";
import {
  resolveManualArtworkEnhanceDecision,
  type ArtworkUpscalePassCount,
} from "../../../packages/shared/src/utils/manualArtworkEnhance";

import { adminDb, adminStorage } from "./admin";
import { assertStaffCaller, loadCallerProfile } from "./caller";
import { processArtworkEnhancePng } from "./artworkEnhanceProcessing";
import {
  failedPrecondition,
  invalidArgument,
} from "./errors";
import { withoutUndefinedFields } from "./firestoreDocument";
import { storageObjectPath } from "./storageObjectPath";

const ENHANCE_LOCK_MS = 10 * 60 * 1000;

function readUpscalePassCount(value: unknown): ArtworkUpscalePassCount {
  if (value === 0 || value === 1 || value === 2) {
    return value;
  }
  return 0;
}

export async function executeEnhancePrintRequestArtwork(
  callerUid: string,
  request: EnhancePrintRequestArtworkRequest,
): Promise<EnhancePrintRequestArtworkResponse> {
  const caller = await loadCallerProfile(callerUid);
  assertStaffCaller(caller);

  const printRequestRef = adminDb.collection("printRequests").doc(request.printRequestId);
  const printRequestSnap = await printRequestRef.get();
  if (!printRequestSnap.exists) {
    throw invalidArgument("Print request was not found.");
  }

  const itemRef = adminDb.collection("printRequestItems").doc(request.itemId);
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) {
    throw invalidArgument("Print request item was not found.");
  }

  const item = itemSnap.data() ?? {};
  if (item.printRequestId !== request.printRequestId) {
    throw invalidArgument("Print request item does not belong to this request.");
  }

  const sourceType =
    typeof item.sourceType === "string" ? item.sourceType : "catalog_design";
  if (sourceType === "customer_upload") {
    throw failedPrecondition(
      "Customer upload enhancement is not available in this release. Use catalog designs only.",
    );
  }

  const designId =
    typeof item.designId === "string" && item.designId.trim() ? item.designId.trim() : "";
  if (!designId) {
    throw invalidArgument("This item is not linked to a catalog design.");
  }

  if (!request.confirmCatalogEnhance) {
    throw failedPrecondition(
      "Confirm that enhancing this artwork updates the catalog design for all future uses.",
    );
  }

  const designRef = adminDb.collection("designs").doc(designId);
  const designSnap = await designRef.get();
  if (!designSnap.exists) {
    throw invalidArgument("Design was not found.");
  }

  const design = designSnap.data() ?? {};
  const currentWidthPx = typeof design.width === "number" ? design.width : 0;
  const currentHeightPx = typeof design.height === "number" ? design.height : 0;
  if (currentWidthPx <= 0 || currentHeightPx <= 0) {
    throw failedPrecondition("Design pixel dimensions are required before enhancement.");
  }

  const lockUntil = design.artworkEnhanceLockUntil;
  if (
    lockUntil &&
    typeof lockUntil === "object" &&
    "toMillis" in lockUntil &&
    typeof (lockUntil as { toMillis: () => number }).toMillis === "function" &&
    (lockUntil as { toMillis: () => number }).toMillis() > Date.now()
  ) {
    return {
      resultCode: "in_progress",
      designId,
      widthPx: currentWidthPx,
      heightPx: currentHeightPx,
      upscalePassCount: readUpscalePassCount(design.upscalePassCount),
      approvedMaxPrintWidthInches:
        typeof design.approvedMaxPrintWidthInches === "number"
          ? design.approvedMaxPrintWidthInches
          : 0,
      approvedMaxPrintHeightInches:
        typeof design.approvedMaxPrintHeightInches === "number"
          ? design.approvedMaxPrintHeightInches
          : 0,
      message: "Enhancement is already in progress for this artwork.",
    };
  }

  const decision = resolveManualArtworkEnhanceDecision({
    currentWidthPx,
    currentHeightPx,
    upscalePassCount: readUpscalePassCount(design.upscalePassCount),
    upscaleFactor: typeof design.upscaleFactor === "number" ? design.upscaleFactor : 1,
    nativeSourceWidthPx:
      typeof design.nativeProductionWidthPx === "number"
        ? design.nativeProductionWidthPx
        : undefined,
    nativeSourceHeightPx:
      typeof design.nativeProductionHeightPx === "number"
        ? design.nativeProductionHeightPx
        : undefined,
  });

  if (decision.status === "already_sufficient") {
    return {
      resultCode: "already_sufficient",
      designId,
      widthPx: currentWidthPx,
      heightPx: currentHeightPx,
      upscalePassCount: readUpscalePassCount(design.upscalePassCount),
      approvedMaxPrintWidthInches:
        typeof design.approvedMaxPrintWidthInches === "number"
          ? design.approvedMaxPrintWidthInches
          : 0,
      approvedMaxPrintHeightInches:
        typeof design.approvedMaxPrintHeightInches === "number"
          ? design.approvedMaxPrintHeightInches
          : 0,
      message: "Artwork already meets the enhancement target.",
    };
  }

  if (decision.status === "not_eligible") {
    throw failedPrecondition(decision.reason ?? "This artwork cannot be enhanced further.");
  }

  if (
    decision.targetWidthPx === undefined ||
    decision.targetHeightPx === undefined ||
    decision.nextUpscalePassCount === undefined ||
    decision.cumulativeFactor === undefined
  ) {
    throw failedPrecondition("Unable to determine enhancement target for this artwork.");
  }

  await designRef.update({
    artworkEnhanceLockUntil: Timestamp.fromMillis(Date.now() + ENHANCE_LOCK_MS),
    artworkEnhanceLockBy: caller.id,
  });

  try {
    const bucket = adminStorage.bucket();
    const originalPath =
      typeof design.originalPath === "string" && design.originalPath.trim()
        ? design.originalPath.trim()
        : getOriginalStoragePath(designId);
    const previewPath =
      typeof design.previewPath === "string" && design.previewPath.trim()
        ? design.previewPath.trim()
        : getPreviewStoragePath(designId);
    const thumbnailPath =
      typeof design.thumbnailPath === "string" && design.thumbnailPath.trim()
        ? design.thumbnailPath.trim()
        : getThumbnailStoragePath(designId);

    const [sourceBuffer] = await bucket.file(storageObjectPath(originalPath)).download();

    const processed = await processArtworkEnhancePng({
      sourcePng: sourceBuffer,
      sourceWidthPx: currentWidthPx,
      sourceHeightPx: currentHeightPx,
      targetWidthPx: decision.targetWidthPx,
      targetHeightPx: decision.targetHeightPx,
      nextUpscalePassCount: decision.nextUpscalePassCount,
      cumulativeUpscaleFactor: decision.cumulativeFactor,
      sizingWarningCode: decision.sizingWarningCode,
    });

    await Promise.all([
      bucket.file(storageObjectPath(originalPath)).save(processed.productionPng, {
        contentType: "image/png",
        resumable: false,
      }),
      bucket.file(storageObjectPath(previewPath)).save(processed.previewWebp, {
        contentType: "image/webp",
        resumable: false,
      }),
      bucket.file(storageObjectPath(thumbnailPath)).save(processed.thumbnailWebp, {
        contentType: "image/webp",
        resumable: false,
      }),
    ]);

    const nativeWidthPx = decision.nativeSourceWidthPx ?? currentWidthPx;
    const nativeHeightPx = decision.nativeSourceHeightPx ?? currentHeightPx;

    await designRef.update(
      withoutUndefinedFields({
        width: processed.widthPx,
        height: processed.heightPx,
        wasUpscaled: true,
        upscaleFactor: processed.upscaleFactor,
        upscalePassCount: processed.upscalePassCount,
        approvedMaxPrintWidthInches: processed.approvedMaxPrintWidthInches,
        approvedMaxPrintHeightInches: processed.approvedMaxPrintHeightInches,
        sizingPolicyVersion: processed.sizingPolicyVersion,
        sizingWarningCode: processed.sizingWarningCode,
        nativeProductionWidthPx: nativeWidthPx,
        nativeProductionHeightPx: nativeHeightPx,
        preManualEnhanceWidthPx: processed.preEnhanceWidthPx,
        preManualEnhanceHeightPx: processed.preEnhanceHeightPx,
        manualEnhanceAt: FieldValue.serverTimestamp(),
        manualEnhanceBy: caller.id,
        artworkEnhanceLockUntil: FieldValue.delete(),
        artworkEnhanceLockBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: caller.id,
      }),
    );

    return {
      resultCode: "enhanced",
      designId,
      widthPx: processed.widthPx,
      heightPx: processed.heightPx,
      upscalePassCount: processed.upscalePassCount,
      approvedMaxPrintWidthInches: processed.approvedMaxPrintWidthInches,
      approvedMaxPrintHeightInches: processed.approvedMaxPrintHeightInches,
      message: "Artwork enhanced successfully.",
    };
  } catch (error) {
    await designRef.update({
      artworkEnhanceLockUntil: FieldValue.delete(),
      artworkEnhanceLockBy: FieldValue.delete(),
    });
    throw error;
  }
}
