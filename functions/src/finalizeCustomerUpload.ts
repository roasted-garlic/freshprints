import { FieldValue } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES } from "../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  getCustomerUploadPreviewStoragePath,
  getCustomerUploadProductionStoragePath,
  getCustomerUploadSourceStoragePath,
  getCustomerUploadThumbnailStoragePath,
} from "../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";
import type { CustomerUploadTechnicalProgressStage } from "../../packages/shared/src/types/customerUpload/customerUpload.enums";
import type { CustomerUploadTechnicalStatus } from "../../packages/shared/src/types/customerUpload/customerUpload.enums";
import type { CustomerUploadTechnicalFailureCode } from "../../packages/shared/src/types/customerUpload/customerUpload.enums";
import { formatFileSize } from "../../packages/shared/src/utils/formatFileSize";

import { resolveCustomerUploadPurpose } from "../../packages/shared/src/utils/customerUploadPurpose";
import { withCustomerUploadFinalizeWatchdog } from "../../packages/shared/src/utils/customerUploadFinalizeWatchdog";

import { adminDb, adminStorage } from "./lib/admin";
import {
  processCustomerUploadImageBytes,
  saveCustomerUploadProcessedOutputs,
} from "./lib/customerUploadProcessing";
import { storageObjectPath } from "./lib/storageObjectPath";
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
import { isAnonymousAuthToken } from "./lib/catalogDonationUploader";
import { requirePortalCustomer } from "./lib/portalCustomer";

/**
 * Stage watchdog duration for the trim/normalize/preview-generation region of finalize. Set to
 * 480s, 60s under the 540s `onCall` platform timeout — enough headroom that this watchdog's
 * explicit `technicalStatus: "failed"` write always has time to complete and commit before the
 * platform silently terminates the invocation (which otherwise leaves the document stuck at
 * `"processing"` forever, with no failure ever recorded — the exact "stuck at Trimming" symptom
 * this ADR-FP-125 fix addresses). Not derived from a specific worst-case measurement of this
 * pipeline (a synthetic local benchmark cannot reproduce Cloud Functions cold-start/memory-
 * pressure conditions); chosen as a fixed, generous safety margin under the platform ceiling
 * instead. If evidence in production shows legitimate large uploads routinely approach 480s,
 * that is a Function-config/product conversation for a future goal, not a reason to silently
 * raise this value.
 */
const FINALIZE_CUSTOMER_UPLOAD_STAGE_WATCHDOG_MS = 480_000;

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
  approvedMaxPrintWidthInches?: number | null;
  approvedMaxPrintHeightInches?: number | null;
}

export const finalizeCustomerUpload = onCall(
  { timeoutSeconds: 540, memory: "2GiB" },
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

    const isGuest = isAnonymousAuthToken(request.auth.token);
    if (!isGuest) {
      await requirePortalCustomer(request.auth.uid);
    }
    const customerUid = request.auth.uid;
    const uploaderType = isGuest ? ("guest" as const) : ("customer" as const);

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

    const uploadPurpose = resolveCustomerUploadPurpose(upload.purpose);
    if (isGuest && uploadPurpose !== "catalog_donation") {
      throw permissionDenied("Sign in to upload artwork for print requests.");
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
      if (
        sourceBytes.byteLength <= 0 ||
        sourceBytes.byteLength > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES
      ) {
        return await markFailed(
          uploadRef,
          payload,
          "image_exceeds_limits",
          `Image is ${formatFileSize(sourceBytes.byteLength)} and exceeds the ${formatFileSize(CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES)} size limit.`,
        );
      }

      await uploadRef.update({
        technicalStatus: "processing",
        technicalProgressStage: "checking_format" satisfies CustomerUploadTechnicalProgressStage,
        updatedAt: FieldValue.serverTimestamp(),
      });

      let watchdogTripped = false;
      let processed: Awaited<ReturnType<typeof processCustomerUploadImageBytes>>;
      try {
        processed = await withCustomerUploadFinalizeWatchdog(
          processCustomerUploadImageBytes(sourceBytes, {
            onStage: async (stage) => {
              await uploadRef.update({
                technicalStatus: "processing",
                technicalProgressStage: stage,
                updatedAt: FieldValue.serverTimestamp(),
              });
            },
          }),
          FINALIZE_CUSTOMER_UPLOAD_STAGE_WATCHDOG_MS,
          async () => {
            watchdogTripped = true;
            await uploadRef.update({
              technicalStatus: "failed",
              technicalProgressStage: null,
              technicalFailureCode: "processing_timed_out" satisfies CustomerUploadTechnicalFailureCode,
              technicalFailureMessage:
                "Processing took too long and was stopped. Please retry.",
              updatedAt: FieldValue.serverTimestamp(),
            });
          },
          "processing_timed_out",
        );
      } catch (error) {
        if (watchdogTripped) {
          return {
            uploadId: payload.uploadId,
            batchId: payload.batchId,
            technicalStatus: "failed",
            alreadyReady: false,
            technicalFailureCode: "processing_timed_out",
            technicalFailureMessage: "Processing took too long and was stopped. Please retry.",
          };
        }
        throw error;
      }
      if (!processed.ok) {
        return await markFailed(uploadRef, payload, processed.code, processed.message);
      }

      logger.info("finalizeCustomerUpload.stageTimings", {
        uploadId: payload.uploadId,
        stageTimingsMs: processed.stageTimingsMs,
        sourceWidthPx: processed.sourceWidthPx,
        sourceHeightPx: processed.sourceHeightPx,
        widthPx: processed.widthPx,
        heightPx: processed.heightPx,
        sourceBytes: sourceBytes.byteLength,
        wasTrimmed: processed.wasTrimmed,
        wasNormalizedForDimensions: processed.wasNormalizedForDimensions,
        wasUpscaled: processed.wasUpscaled,
      });

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

      await saveCustomerUploadProcessedOutputs({
        bucket,
        sourceObjectPath: storageObjectPath(expectedSourcePath),
        productionObjectPath: storageObjectPath(productionStoragePath),
        previewObjectPath: storageObjectPath(previewStoragePath),
        thumbnailObjectPath: storageObjectPath(thumbnailStoragePath),
        processed,
      });

      // Charge donation day quota only after processing succeeds so failed finalizes never consume
      // a slot. Persist the flag immediately after charge so retries cannot double-charge if the
      // ready write fails; abandon/hard-delete still refunds when `quotaChargedFinalize` is true.
      const freshBeforeCharge = await uploadRef.get();
      if (!freshBeforeCharge.data()?.quotaChargedFinalize) {
        await chargeDailyQuota(customerUid, "finalizeImage", uploadPurpose, uploaderType);
        await uploadRef.update({
          quotaChargedFinalize: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

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
            quotaChargedFinalize: true,
            sourceFormat: processed.sourceFormat,
            sourceWidthPx: processed.sourceWidthPx,
            sourceHeightPx: processed.sourceHeightPx,
            widthPx: processed.widthPx,
            heightPx: processed.heightPx,
            wasUpscaled: processed.wasUpscaled,
            wasTrimmed: processed.wasTrimmed,
            wasNormalizedForDimensions: processed.wasNormalizedForDimensions,
            preNormalizationWidthPx: processed.preNormalizationWidthPx,
            preNormalizationHeightPx: processed.preNormalizationHeightPx,
            upscaleFactor: processed.upscaleFactor,
            upscalePassCount: processed.upscalePassCount,
            approvedMaxPrintWidthInches: processed.approvedMaxPrintWidthInches,
            approvedMaxPrintHeightInches: processed.approvedMaxPrintHeightInches,
            sizingPolicyVersion: processed.sizingPolicyVersion,
            sizingWarningCode: processed.sizingWarningCode ?? null,
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
        approvedMaxPrintWidthInches: processed.approvedMaxPrintWidthInches,
        approvedMaxPrintHeightInches: processed.approvedMaxPrintHeightInches,
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
