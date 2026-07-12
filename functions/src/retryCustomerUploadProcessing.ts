import { FieldValue } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES } from "../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  getCustomerUploadPreviewStoragePath,
  getCustomerUploadProductionStoragePath,
  getCustomerUploadSourceStoragePath,
  getCustomerUploadThumbnailStoragePath,
} from "../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";
import type { RetryCustomerUploadProcessingResponse } from "../../packages/shared/src/types/customerUpload/customerUploadStaffActions.types";
import { formatFileSize } from "../../packages/shared/src/utils/formatFileSize";

import { adminDb, adminStorage } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  processCustomerUploadImageBytes,
  saveCustomerUploadProcessedOutputs,
  storageObjectPath,
} from "./lib/customerUploadProcessing";
import {
  assertCanPromoteOrRetryCustomerUpload,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { failedPrecondition, invalidArgument, unauthenticated } from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";

const RETRYABLE_FAILURE_CODES = new Set([
  "could_not_decode",
  "transparency_check_failed",
  "processing_failed",
  "upload_missing",
  "path_mismatch",
  "background_not_transparent",
  "image_exceeds_limits",
  "animated_rejected",
  "unsupported_format",
]);

export const retryCustomerUploadProcessing = onCall(
  { timeoutSeconds: 540, memory: "2GiB" },
  async (request): Promise<RetryCustomerUploadProcessingResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertCanPromoteOrRetryCustomerUpload(caller);

    let uploadId: string;
    try {
      uploadId = parseUploadId(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const uploadRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(uploadId);
    const uploadSnap = await uploadRef.get();
    if (!uploadSnap.exists) {
      throw invalidArgument("Upload was not found.");
    }

    const upload = uploadSnap.data() ?? {};
    const batchId = typeof upload.batchId === "string" ? upload.batchId : "";
    if (!batchId) {
      throw invalidArgument("Upload is missing a batch ID.");
    }

    if (upload.technicalStatus === "ready") {
      return {
        uploadId,
        batchId,
        technicalStatus: "ready",
      };
    }

    if (upload.technicalStatus !== "failed") {
      throw failedPrecondition("Only failed uploads can be retried.");
    }

    const failureCode =
      typeof upload.technicalFailureCode === "string" ? upload.technicalFailureCode : "";
    if (failureCode && !RETRYABLE_FAILURE_CODES.has(failureCode)) {
      throw failedPrecondition("This technical failure is not eligible for retry.");
    }

    const customerUid = typeof upload.customerUid === "string" ? upload.customerUid : "";
    if (!customerUid) {
      throw invalidArgument("Upload is missing customer ownership.");
    }

    // Preserve catalog status — staff retry must not reset attached uploads to not_eligible.
    const preservedCatalogReviewStatus =
      typeof upload.catalogReviewStatus === "string" ? upload.catalogReviewStatus : "not_eligible";

    const expectedSourcePath = getCustomerUploadSourceStoragePath(customerUid, uploadId);
    const sourceStoragePath =
      typeof upload.sourceStoragePath === "string" ? upload.sourceStoragePath : "";
    if (sourceStoragePath !== expectedSourcePath) {
      return await markFailed(uploadRef, uploadId, batchId, "path_mismatch", "Upload path is invalid.");
    }

    await uploadRef.update({
      technicalStatus: "validating",
      technicalProgressStage: "reading_upload",
      technicalFailureCode: null,
      technicalFailureMessage: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const bucket = adminStorage.bucket();
    const file = bucket.file(storageObjectPath(expectedSourcePath));
    const [exists] = await file.exists();
    if (!exists) {
      return await markFailed(
        uploadRef,
        uploadId,
        batchId,
        "upload_missing",
        "Source file was not found.",
      );
    }

    const [sourceBytes] = await file.download();
    if (
      sourceBytes.byteLength <= 0 ||
      sourceBytes.byteLength > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES
    ) {
      return await markFailed(
        uploadRef,
        uploadId,
        batchId,
        "image_exceeds_limits",
        `Image is ${formatFileSize(sourceBytes.byteLength)} and exceeds the ${formatFileSize(CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES)} size limit.`,
      );
    }

    await uploadRef.update({
      technicalStatus: "processing",
      technicalProgressStage: "checking_format",
      updatedAt: FieldValue.serverTimestamp(),
    });

    const processed = await processCustomerUploadImageBytes(sourceBytes, {
      onStage: async (stage) => {
        await uploadRef.update({
          technicalStatus: "processing",
          technicalProgressStage: stage,
          updatedAt: FieldValue.serverTimestamp(),
        });
      },
    });
    if (!processed.ok) {
      return await markFailed(uploadRef, uploadId, batchId, processed.code, processed.message);
    }

    await uploadRef.update({
      technicalStatus: "processing",
      technicalProgressStage: "saving",
      updatedAt: FieldValue.serverTimestamp(),
    });

    const productionStoragePath = getCustomerUploadProductionStoragePath(customerUid, uploadId);
    const previewStoragePath = getCustomerUploadPreviewStoragePath(customerUid, uploadId);
    const thumbnailStoragePath = getCustomerUploadThumbnailStoragePath(customerUid, uploadId);

    await saveCustomerUploadProcessedOutputs({
      bucket,
      sourceObjectPath: storageObjectPath(expectedSourcePath),
      productionObjectPath: storageObjectPath(productionStoragePath),
      previewObjectPath: storageObjectPath(previewStoragePath),
      thumbnailObjectPath: storageObjectPath(thumbnailStoragePath),
      processed,
    });

    const batchRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches).doc(batchId);

    await adminDb.runTransaction(async (tx) => {
      const [freshUpload, batchSnap] = await Promise.all([tx.get(uploadRef), tx.get(batchRef)]);
      const previousStatus = freshUpload.data()?.technicalStatus;
      const wasFailed = previousStatus === "failed" || previousStatus === "processing" || previousStatus === "validating";

      tx.update(
        uploadRef,
        withoutUndefinedFields({
          technicalStatus: "ready",
          technicalProgressStage: null,
          technicalFailureCode: null,
          technicalFailureMessage: null,
          sourceFormat: processed.sourceFormat,
          sourceWidthPx: processed.sourceWidthPx,
          sourceHeightPx: processed.sourceHeightPx,
          widthPx: processed.widthPx,
          heightPx: processed.heightPx,
          wasUpscaled: processed.wasUpscaled,
          wasTrimmed: processed.wasTrimmed,
          transparencyPassed: true,
          transparentPixelRatio: processed.transparentPixelRatio,
          productionStoragePath,
          previewStoragePath,
          thumbnailStoragePath,
          printWidthInches: processed.printWidthInches,
          printHeightInches: processed.printHeightInches,
          effectiveDpi: processed.effectiveDpi,
          catalogReviewStatus: preservedCatalogReviewStatus,
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

      if (wasFailed && batchSnap.exists) {
        const readyCount = Number(batchSnap.data()?.readyCount ?? 0);
        const failedCount = Number(batchSnap.data()?.failedCount ?? 0);
        tx.update(batchRef, {
          readyCount: readyCount + 1,
          failedCount: Math.max(0, failedCount - 1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return {
      uploadId,
      batchId,
      technicalStatus: "ready",
    };
  },
);

async function markFailed(
  uploadRef: DocumentReference,
  uploadId: string,
  batchId: string,
  code: string,
  message: string,
): Promise<RetryCustomerUploadProcessingResponse> {
  await uploadRef.update({
    technicalStatus: "failed",
    technicalProgressStage: null,
    technicalFailureCode: code,
    technicalFailureMessage: message,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    uploadId,
    batchId,
    technicalStatus: "failed",
    technicalFailureCode: code,
    technicalFailureMessage: message,
  };
}
