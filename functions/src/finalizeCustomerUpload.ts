import { FieldValue } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  getCustomerUploadPreviewStoragePath,
  getCustomerUploadProductionStoragePath,
  getCustomerUploadSourceStoragePath,
  getCustomerUploadThumbnailStoragePath,
} from "../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";
import type { CustomerUploadTechnicalProgressStage } from "../../packages/shared/src/types/customerUpload/customerUpload.enums";
import type { CustomerUploadTechnicalStatus } from "../../packages/shared/src/types/customerUpload/customerUpload.enums";

import { adminDb, adminStorage } from "./lib/admin";
import {
  processCustomerUploadImageBytes,
  storageObjectPath,
} from "./lib/customerUploadProcessing";
import {
  acquireFinalizeLease,
  chargeDailyQuota,
  releaseFinalizeLease,
} from "./lib/customerUploadRateLimit";
import { validateFinalizeCustomerUploadRequest } from "./lib/customerUploadValidation";
import {
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { requirePortalCustomer } from "./lib/portalCustomer";

export interface FinalizeCustomerUploadResponse {
  uploadId: string;
  batchId: string;
  technicalStatus: CustomerUploadTechnicalStatus;
  alreadyReady: boolean;
  technicalFailureCode?: string | null;
  technicalFailureMessage?: string | null;
  productionStoragePath?: string | null;
  previewStoragePath?: string | null;
  thumbnailStoragePath?: string | null;
}

export const finalizeCustomerUpload = onCall(
  { timeoutSeconds: 240, memory: "2GiB" },
  async (request): Promise<FinalizeCustomerUploadResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    let payload;
    try {
      payload = validateFinalizeCustomerUploadRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    await requirePortalCustomer(request.auth.uid);
    const customerUid = request.auth.uid;

    const uploadRef = adminDb
      .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
      .doc(payload.uploadId);
    const uploadSnap = await uploadRef.get();
    if (!uploadSnap.exists) {
      throw invalidArgument("Upload was not found.");
    }

    const upload = uploadSnap.data() ?? {};
    if (upload.customerUid !== customerUid) {
      throw permissionDenied("You do not own this upload.");
    }
    if (upload.batchId !== payload.batchId) {
      throw invalidArgument("Upload does not belong to this batch.");
    }

    if (upload.technicalStatus === "ready") {
      return {
        uploadId: payload.uploadId,
        batchId: payload.batchId,
        technicalStatus: "ready",
        alreadyReady: true,
        productionStoragePath: (upload.productionStoragePath as string) ?? null,
        previewStoragePath: (upload.previewStoragePath as string) ?? null,
        thumbnailStoragePath: (upload.thumbnailStoragePath as string) ?? null,
      };
    }

    let leaseId: string | null = null;
    try {
      leaseId = await acquireFinalizeLease({
        customerUid,
        kind: "image",
        targetId: payload.uploadId,
      });

      if (!upload.quotaChargedFinalize) {
        await chargeDailyQuota(customerUid, "finalizeImage");
        await uploadRef.update({
          quotaChargedFinalize: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const expectedSourcePath = getCustomerUploadSourceStoragePath(customerUid, payload.uploadId);
      const sourceStoragePath =
        typeof upload.sourceStoragePath === "string" ? upload.sourceStoragePath : "";
      if (sourceStoragePath !== expectedSourcePath) {
        return await markFailed(uploadRef, payload, "path_mismatch", "Upload path is invalid.");
      }

      await uploadRef.update({
        technicalStatus: "validating",
        technicalProgressStage: "reading_upload" satisfies CustomerUploadTechnicalProgressStage,
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
          payload,
          "upload_missing",
          "Source file was not found. Upload the image and try again.",
        );
      }

      const [sourceBytes] = await file.download();
      if (sourceBytes.byteLength <= 0 || sourceBytes.byteLength > 25 * 1024 * 1024) {
        return await markFailed(
          uploadRef,
          payload,
          "image_exceeds_limits",
          "Image exceeds the maximum allowed file size.",
        );
      }

      await uploadRef.update({
        technicalStatus: "processing",
        technicalProgressStage: "checking_format" satisfies CustomerUploadTechnicalProgressStage,
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
        return await markFailed(uploadRef, payload, processed.code, processed.message);
      }

      await uploadRef.update({
        technicalStatus: "processing",
        technicalProgressStage: "saving" satisfies CustomerUploadTechnicalProgressStage,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const productionStoragePath = getCustomerUploadProductionStoragePath(
        customerUid,
        payload.uploadId,
      );
      const previewStoragePath = getCustomerUploadPreviewStoragePath(
        customerUid,
        payload.uploadId,
      );
      const thumbnailStoragePath = getCustomerUploadThumbnailStoragePath(
        customerUid,
        payload.uploadId,
      );

      await Promise.all([
        bucket.file(storageObjectPath(productionStoragePath)).save(processed.productionPng, {
          resumable: false,
          contentType: "image/png",
          metadata: { cacheControl: "private, max-age=3600" },
        }),
        bucket.file(storageObjectPath(previewStoragePath)).save(processed.previewWebp, {
          resumable: false,
          contentType: "image/webp",
          metadata: { cacheControl: "private, max-age=3600" },
        }),
        bucket.file(storageObjectPath(thumbnailStoragePath)).save(processed.thumbnailWebp, {
          resumable: false,
          contentType: "image/webp",
          metadata: { cacheControl: "private, max-age=3600" },
        }),
      ]);

      const batchRef = adminDb
        .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches)
        .doc(payload.batchId);

      await adminDb.runTransaction(async (tx) => {
        const [freshUpload, batchSnap] = await Promise.all([tx.get(uploadRef), tx.get(batchRef)]);
        const wasReady = freshUpload.data()?.technicalStatus === "ready";
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
            catalogReviewStatus: "not_eligible",
            updatedAt: FieldValue.serverTimestamp(),
          }),
        );

        if (!wasReady && batchSnap.exists) {
          const readyCount = Number(batchSnap.data()?.readyCount ?? 0);
          tx.update(batchRef, {
            readyCount: readyCount + 1,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });

      return {
        uploadId: payload.uploadId,
        batchId: payload.batchId,
        technicalStatus: "ready",
        alreadyReady: false,
        productionStoragePath,
        previewStoragePath,
        thumbnailStoragePath,
      };
    } finally {
      await releaseFinalizeLease(leaseId);
    }
  },
);

async function markFailed(
  uploadRef: DocumentReference,
  payload: { uploadId: string; batchId: string },
  code: string,
  message: string,
): Promise<FinalizeCustomerUploadResponse> {
  const previous = await uploadRef.get();
  const previousStatus = previous.data()?.technicalStatus;
  const batchRef = adminDb
    .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches)
    .doc(payload.batchId);

  await adminDb.runTransaction(async (tx) => {
    const batchSnap = await tx.get(batchRef);
    tx.update(uploadRef, {
      technicalStatus: "failed",
      technicalProgressStage: null,
      technicalFailureCode: code,
      technicalFailureMessage: message,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (previousStatus !== "failed" && batchSnap.exists) {
      const failedCount = Number(batchSnap.data()?.failedCount ?? 0);
      tx.update(batchRef, {
        failedCount: failedCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  return {
    uploadId: payload.uploadId,
    batchId: payload.batchId,
    technicalStatus: "failed",
    alreadyReady: false,
    technicalFailureCode: code,
    technicalFailureMessage: message,
  };
}
