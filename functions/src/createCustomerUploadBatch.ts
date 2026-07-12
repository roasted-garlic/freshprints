import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  getCustomerUploadBatchZipStoragePath,
  getCustomerUploadSourceStoragePath,
} from "../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";

import { adminDb } from "./lib/admin";
import { chargeDailyQuota } from "./lib/customerUploadRateLimit";
import {
  sanitizeDisplayFilename,
  validateCreateCustomerUploadBatchRequest,
} from "./lib/customerUploadValidation";
import { invalidArgument, unauthenticated } from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { requirePortalCustomer } from "./lib/portalCustomer";

export interface CreateCustomerUploadBatchResponse {
  batchId: string;
  mode: "direct_images" | "zip";
  uploads?: Array<{
    uploadId: string;
    sourceStoragePath: string;
    originalFilename: string;
  }>;
  zipStoragePath?: string;
  reusedExisting: boolean;
}

export const createCustomerUploadBatch = onCall(
  async (request): Promise<CreateCustomerUploadBatchResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    let payload;
    try {
      payload = validateCreateCustomerUploadBatchRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const portalCustomer = await requirePortalCustomer(request.auth.uid);
    const customerUid = request.auth.uid;
    const idempotencyId = `${customerUid}_${payload.clientRequestId}`;
    const idempotencyRef = adminDb.collection("customerUploadIdempotency").doc(idempotencyId);

    const existingIdempotency = await idempotencyRef.get();
    if (existingIdempotency.exists) {
      const batchId = String(existingIdempotency.data()?.batchId ?? "");
      if (batchId) {
        const batchSnap = await adminDb
          .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches)
          .doc(batchId)
          .get();
        if (batchSnap.exists && batchSnap.data()?.customerUid === customerUid) {
          return buildCreateResponseFromExisting(customerUid, batchId, payload.mode);
        }
      }
    }

    await chargeDailyQuota(customerUid, "createBatch");

    const batchRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches).doc();
    const batchId = batchRef.id;
    const now = FieldValue.serverTimestamp();

    if (payload.mode === "zip") {
      const zipStoragePath = getCustomerUploadBatchZipStoragePath(customerUid, batchId);
      await adminDb.runTransaction(async (tx) => {
        tx.set(
          batchRef,
          withoutUndefinedFields({
            id: batchId,
            customerUid,
            customerId: portalCustomer.customerId,
            printRequestId: null,
            status: "open",
            mode: "zip",
            fileCount: 0,
            readyCount: 0,
            failedCount: 0,
            ownershipConfirmed: false,
            catalogUseAcknowledged: false,
            termsVersion: null,
            confirmedAt: null,
            zipStoragePath,
            zipExtractionStatus: "pending",
            quotaChargedCreate: true,
            createdBy: customerUid,
            createdAt: now,
            updatedAt: now,
          }),
        );
        tx.set(idempotencyRef, {
          customerUid,
          batchId,
          clientRequestId: payload.clientRequestId,
          createdAt: now,
        });
      });

      return {
        batchId,
        mode: "zip",
        zipStoragePath,
        reusedExisting: false,
      };
    }

    const files = payload.files ?? [];
    const uploads = files.map((file) => {
      const uploadRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc();
      const uploadId = uploadRef.id;
      const sourceStoragePath = getCustomerUploadSourceStoragePath(customerUid, uploadId);
      return {
        uploadRef,
        uploadId,
        sourceStoragePath,
        originalFilename: sanitizeDisplayFilename(file.originalFilename),
      };
    });

    await adminDb.runTransaction(async (tx) => {
      tx.set(
        batchRef,
        withoutUndefinedFields({
          id: batchId,
          customerUid,
          customerId: portalCustomer.customerId,
          printRequestId: null,
          status: "open",
          mode: "direct_images",
          fileCount: uploads.length,
          readyCount: 0,
          failedCount: 0,
          ownershipConfirmed: false,
          catalogUseAcknowledged: false,
          termsVersion: null,
          confirmedAt: null,
          quotaChargedCreate: true,
          createdBy: customerUid,
          createdAt: now,
          updatedAt: now,
        }),
      );

      for (const upload of uploads) {
        tx.set(
          upload.uploadRef,
          withoutUndefinedFields({
            id: upload.uploadId,
            batchId,
            customerUid,
            customerId: portalCustomer.customerId,
            printRequestId: null,
            originalFilename: upload.originalFilename,
            sourceFormat: null,
            sourceStoragePath: upload.sourceStoragePath,
            productionStoragePath: null,
            previewStoragePath: null,
            thumbnailStoragePath: null,
            widthPx: null,
            heightPx: null,
            printWidthInches: null,
            printHeightInches: null,
            effectiveDpi: null,
            transparencyPassed: null,
            technicalStatus: "awaiting_upload",
            technicalFailureCode: null,
            technicalFailureMessage: null,
            catalogReviewStatus: "not_eligible",
            promotedDesignId: null,
            ownershipConfirmed: false,
            catalogUseAcknowledged: false,
            termsVersion: null,
            confirmedAt: null,
            quotaChargedFinalize: false,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }

      tx.set(idempotencyRef, {
        customerUid,
        batchId,
        clientRequestId: payload.clientRequestId,
        createdAt: now,
      });
    });

    return {
      batchId,
      mode: "direct_images",
      uploads: uploads.map((upload) => ({
        uploadId: upload.uploadId,
        sourceStoragePath: upload.sourceStoragePath,
        originalFilename: upload.originalFilename,
      })),
      reusedExisting: false,
    };
  },
);

async function buildCreateResponseFromExisting(
  customerUid: string,
  batchId: string,
  mode: "direct_images" | "zip",
): Promise<CreateCustomerUploadBatchResponse> {
  if (mode === "zip") {
    const zipStoragePath = getCustomerUploadBatchZipStoragePath(customerUid, batchId);
    return { batchId, mode, zipStoragePath, reusedExisting: true };
  }

  const uploadsSnap = await adminDb
    .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
    .where("batchId", "==", batchId)
    .where("customerUid", "==", customerUid)
    .get();

  return {
    batchId,
    mode,
    reusedExisting: true,
    uploads: uploadsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        uploadId: doc.id,
        sourceStoragePath: String(data.sourceStoragePath ?? ""),
        originalFilename: String(data.originalFilename ?? "file"),
      };
    }),
  };
}
