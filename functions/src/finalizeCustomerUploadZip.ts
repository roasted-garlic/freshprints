import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import { CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES } from "../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import {
  getCustomerUploadBatchZipStoragePath,
  getCustomerUploadPreviewStoragePath,
  getCustomerUploadProductionStoragePath,
  getCustomerUploadSourceStoragePath,
  getCustomerUploadThumbnailStoragePath,
} from "../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";

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
import { sanitizeDisplayFilename, validateFinalizeCustomerUploadZipRequest } from "./lib/customerUploadValidation";
import {
  deterministicZipUploadId,
  extractSafeCustomerUploadImagesFromZip,
  zipFailureCode,
} from "./lib/customerUploadZip";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { requirePortalCustomer } from "./lib/portalCustomer";

export interface FinalizeCustomerUploadZipFileResult {
  uploadId: string;
  entryName: string;
  technicalStatus: "ready" | "failed";
  technicalFailureCode?: string | null;
  technicalFailureMessage?: string | null;
}

export interface FinalizeCustomerUploadZipResponse {
  batchId: string;
  zipExtractionStatus: "complete" | "failed";
  alreadyComplete: boolean;
  files: FinalizeCustomerUploadZipFileResult[];
  readyCount: number;
  failedCount: number;
}

export const finalizeCustomerUploadZip = onCall(
  { timeoutSeconds: 240, memory: "2GiB" },
  async (request): Promise<FinalizeCustomerUploadZipResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    let payload;
    try {
      payload = validateFinalizeCustomerUploadZipRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const portalCustomer = await requirePortalCustomer(request.auth.uid);
    const customerUid = request.auth.uid;
    const batchRef = adminDb
      .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches)
      .doc(payload.batchId);
    const batchSnap = await batchRef.get();
    if (!batchSnap.exists) {
      throw invalidArgument("Batch was not found.");
    }

    const batch = batchSnap.data() ?? {};
    if (batch.customerUid !== customerUid) {
      throw permissionDenied("You do not own this upload batch.");
    }
    if (batch.mode !== "zip") {
      throw failedPrecondition("This batch is not a ZIP upload.");
    }

    if (batch.zipExtractionStatus === "complete") {
      const existing = await listBatchUploadResults(payload.batchId, customerUid);
      return {
        batchId: payload.batchId,
        zipExtractionStatus: "complete",
        alreadyComplete: true,
        files: existing,
        readyCount: Number(batch.readyCount ?? 0),
        failedCount: Number(batch.failedCount ?? 0),
      };
    }

    let leaseId: string | null = null;
    try {
      leaseId = await acquireFinalizeLease({
        customerUid,
        kind: "zip",
        targetId: payload.batchId,
      });

      if (!batch.quotaChargedFinalizeZip) {
        await chargeDailyQuota(customerUid, "finalizeZip");
        await batchRef.update({
          quotaChargedFinalizeZip: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const expectedZipPath = getCustomerUploadBatchZipStoragePath(customerUid, payload.batchId);
      const zipStoragePath =
        typeof batch.zipStoragePath === "string" ? batch.zipStoragePath : expectedZipPath;
      if (zipStoragePath !== expectedZipPath) {
        await batchRef.update({
          zipExtractionStatus: "failed",
          status: "failed",
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw failedPrecondition("ZIP path is invalid.");
      }

      const bucket = adminStorage.bucket();
      const zipFile = bucket.file(storageObjectPath(expectedZipPath));
      const [exists] = await zipFile.exists();
      if (!exists) {
        throw failedPrecondition("ZIP file was not found. Upload the archive and try again.");
      }

      const [zipBytes] = await zipFile.download();
      if (zipBytes.byteLength > CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES) {
        await batchRef.update({
          zipExtractionStatus: "failed",
          status: "failed",
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw failedPrecondition("ZIP exceeds the maximum compressed size.");
      }

      let extracted;
      try {
        extracted = await extractSafeCustomerUploadImagesFromZip(zipBytes);
      } catch (error) {
        const code = zipFailureCode(error);
        await batchRef.update({
          zipExtractionStatus: "failed",
          status: "failed",
          technicalFailureCode: code,
          technicalFailureMessage:
            error instanceof Error ? error.message : "ZIP processing failed.",
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw failedPrecondition(
          error instanceof Error ? error.message : "ZIP processing failed.",
        );
      }

      const manifest: Array<{ entryName: string; uploadId: string }> = [];
      const fileResults: FinalizeCustomerUploadZipFileResult[] = [];
      let readyCount = 0;
      let failedCount = 0;

      for (const image of extracted.images) {
        const uploadId = deterministicZipUploadId(payload.batchId, image.entryName);
        manifest.push({ entryName: image.entryName, uploadId });

        const uploadRef = adminDb
          .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
          .doc(uploadId);
        const sourceStoragePath = getCustomerUploadSourceStoragePath(customerUid, uploadId);
        const existingUpload = await uploadRef.get();

        if (existingUpload.exists && existingUpload.data()?.technicalStatus === "ready") {
          readyCount += 1;
          fileResults.push({
            uploadId,
            entryName: image.entryName,
            technicalStatus: "ready",
          });
          continue;
        }

        const now = FieldValue.serverTimestamp();
        await uploadRef.set(
          withoutUndefinedFields({
            id: uploadId,
            batchId: payload.batchId,
            customerUid,
            customerId: portalCustomer.customerId,
            printRequestId: null,
            originalFilename: sanitizeDisplayFilename(image.displayFilename),
            sourceFormat: null,
            sourceStoragePath,
            productionStoragePath: null,
            previewStoragePath: null,
            thumbnailStoragePath: null,
            widthPx: null,
            heightPx: null,
            printWidthInches: null,
            printHeightInches: null,
            effectiveDpi: null,
            transparencyPassed: null,
            technicalStatus: "validating",
            technicalProgressStage: "checking_format",
            technicalFailureCode: null,
            technicalFailureMessage: null,
            catalogReviewStatus: "not_eligible",
            promotedDesignId: null,
            ownershipConfirmed: false,
            catalogUseAcknowledged: false,
            termsVersion: null,
            confirmedAt: null,
            zipEntryName: image.entryName,
            createdAt: existingUpload.exists ? existingUpload.data()?.createdAt ?? now : now,
            updatedAt: now,
          }),
          { merge: true },
        );

        await bucket.file(storageObjectPath(sourceStoragePath)).save(image.bytes, {
          resumable: false,
          contentType: image.displayFilename.toLowerCase().endsWith(".webp")
            ? "image/webp"
            : "image/png",
          metadata: { cacheControl: "private, max-age=3600" },
        });

        const processed = await processCustomerUploadImageBytes(image.bytes, {
          onStage: async (stage) => {
            await uploadRef.update({
              technicalStatus: "processing",
              technicalProgressStage: stage,
              updatedAt: FieldValue.serverTimestamp(),
            });
          },
        });
        if (!processed.ok) {
          failedCount += 1;
          await uploadRef.update({
            technicalStatus: "failed",
            technicalProgressStage: null,
            technicalFailureCode: processed.code,
            technicalFailureMessage: processed.message,
            updatedAt: FieldValue.serverTimestamp(),
          });
          fileResults.push({
            uploadId,
            entryName: image.entryName,
            technicalStatus: "failed",
            technicalFailureCode: processed.code,
            technicalFailureMessage: processed.message,
          });
          continue;
        }

        await uploadRef.update({
          technicalStatus: "processing",
          technicalProgressStage: "saving",
          updatedAt: FieldValue.serverTimestamp(),
        });

        const productionStoragePath = getCustomerUploadProductionStoragePath(
          customerUid,
          uploadId,
        );
        const previewStoragePath = getCustomerUploadPreviewStoragePath(customerUid, uploadId);
        const thumbnailStoragePath = getCustomerUploadThumbnailStoragePath(
          customerUid,
          uploadId,
        );

        await Promise.all([
          bucket.file(storageObjectPath(productionStoragePath)).save(processed.productionPng, {
            resumable: false,
            contentType: "image/png",
          }),
          bucket.file(storageObjectPath(previewStoragePath)).save(processed.previewWebp, {
            resumable: false,
            contentType: "image/webp",
          }),
          bucket.file(storageObjectPath(thumbnailStoragePath)).save(processed.thumbnailWebp, {
            resumable: false,
            contentType: "image/webp",
          }),
        ]);

        await uploadRef.update(
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

        readyCount += 1;
        fileResults.push({
          uploadId,
          entryName: image.entryName,
          technicalStatus: "ready",
        });
      }

      const manifestHash = createHash("sha256")
        .update(JSON.stringify(manifest))
        .digest("hex");

      await batchRef.update({
        zipExtractionStatus: "complete",
        status: "open",
        fileCount: fileResults.length,
        readyCount,
        failedCount,
        zipManifest: manifest,
        zipManifestHash: manifestHash,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        batchId: payload.batchId,
        zipExtractionStatus: "complete",
        alreadyComplete: false,
        files: fileResults,
        readyCount,
        failedCount,
      };
    } finally {
      await releaseFinalizeLease(leaseId);
    }
  },
);

async function listBatchUploadResults(
  batchId: string,
  customerUid: string,
): Promise<FinalizeCustomerUploadZipFileResult[]> {
  const snap = await adminDb
    .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
    .where("batchId", "==", batchId)
    .where("customerUid", "==", customerUid)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    const status = data.technicalStatus === "ready" ? "ready" : "failed";
    return {
      uploadId: doc.id,
      entryName: String(data.zipEntryName ?? data.originalFilename ?? doc.id),
      technicalStatus: status,
      technicalFailureCode: (data.technicalFailureCode as string) ?? null,
      technicalFailureMessage: (data.technicalFailureMessage as string) ?? null,
    };
  });
}
