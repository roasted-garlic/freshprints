import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  getPreviewStoragePath,
  getOriginalStoragePath,
  getThumbnailStoragePath,
} from "../../packages/shared/src/constants/design/designStoragePaths";
import type { PromoteCustomerUploadToAiReviewResponse } from "../../packages/shared/src/types/customerUpload/customerUploadStaffActions.types";

import { adminDb, adminStorage } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  assertCanPromoteOrRetryCustomerUpload,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { storageObjectPath } from "./lib/storageObjectPath";
import {
  failedPrecondition,
  invalidArgument,
  unauthenticated,
} from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";

function titleFromFilename(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "Customer upload";
  }
  const extensionIndex = trimmed.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return trimmed;
  }
  return trimmed.slice(0, extensionIndex);
}

async function copyUploadAssetsToDesign(params: {
  productionStoragePath: string;
  previewStoragePath: string | null;
  thumbnailStoragePath: string | null;
  originalPath: string;
  previewPath: string;
  thumbnailPath: string;
}): Promise<void> {
  const bucket = adminStorage.bucket();

  await bucket
    .file(storageObjectPath(params.productionStoragePath))
    .copy(bucket.file(storageObjectPath(params.originalPath)));

  if (params.previewStoragePath) {
    await bucket
      .file(storageObjectPath(params.previewStoragePath))
      .copy(bucket.file(storageObjectPath(params.previewPath)));
  }

  if (params.thumbnailStoragePath) {
    await bucket
      .file(storageObjectPath(params.thumbnailStoragePath))
      .copy(bucket.file(storageObjectPath(params.thumbnailPath)));
  }
}

/**
 * Promote creates the design + copies assets, then returns.
 * Studio hands off AI via the same background enqueue queue as import
 * (`enqueueImportedDesignsForBackgroundAi`) so the UI is not blocked on Gemini.
 */
export const promoteCustomerUploadToAiReview = onCall(
  { timeoutSeconds: 120, memory: "1GiB" },
  async (request): Promise<PromoteCustomerUploadToAiReviewResponse> => {
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
    const designRef = adminDb.collection("designs").doc();

    const promoteResult = await adminDb.runTransaction(async (tx) => {
      const uploadSnap = await tx.get(uploadRef);
      if (!uploadSnap.exists) {
        throw invalidArgument("Upload was not found.");
      }

      const upload = uploadSnap.data() ?? {};
      const existingDesignId =
        typeof upload.promotedDesignId === "string" && upload.promotedDesignId.trim()
          ? upload.promotedDesignId.trim()
          : null;

      if (existingDesignId) {
        if (upload.catalogReviewStatus !== "sent_to_ai_review") {
          throw failedPrecondition(
            "Upload is already linked to a design but is not in sent_to_ai_review status.",
          );
        }
        return {
          designId: existingDesignId,
          alreadyPromoted: true as const,
          originalPath: getOriginalStoragePath(existingDesignId),
          previewPath: getPreviewStoragePath(existingDesignId),
          thumbnailPath: getThumbnailStoragePath(existingDesignId),
          productionStoragePath:
            typeof upload.productionStoragePath === "string" ? upload.productionStoragePath : null,
          previewStoragePath:
            typeof upload.previewStoragePath === "string" ? upload.previewStoragePath : null,
          thumbnailStoragePath:
            typeof upload.thumbnailStoragePath === "string" ? upload.thumbnailStoragePath : null,
          copyAssets: false,
        };
      }

      if (upload.technicalStatus !== "ready") {
        throw failedPrecondition("Only technically ready uploads can be sent to AI Review.");
      }
      if (upload.ownershipConfirmed !== true) {
        throw failedPrecondition("Customer ownership confirmation is required before promotion.");
      }
      if (upload.catalogReviewStatus !== "pending_staff_review") {
        throw failedPrecondition("Only uploads pending staff review can be promoted.");
      }
      if (
        typeof upload.productionStoragePath !== "string" ||
        !upload.productionStoragePath.trim()
      ) {
        throw failedPrecondition("Upload is missing a production asset path.");
      }

      const designId = designRef.id;
      const originalPath = getOriginalStoragePath(designId);
      const thumbnailPath = getThumbnailStoragePath(designId);
      const previewPath = getPreviewStoragePath(designId);
      const title = titleFromFilename(
        typeof upload.originalFilename === "string" ? upload.originalFilename : "",
      );

      tx.set(
        designRef,
        withoutUndefinedFields({
          id: designId,
          title,
          tags: [],
          status: "imported",
          originalPath,
          thumbnailPath,
          previewPath,
          width: typeof upload.widthPx === "number" ? upload.widthPx : undefined,
          height: typeof upload.heightPx === "number" ? upload.heightPx : undefined,
          printWidthInches:
            typeof upload.printWidthInches === "number" ? upload.printWidthInches : undefined,
          printHeightInches:
            typeof upload.printHeightInches === "number" ? upload.printHeightInches : undefined,
          effectiveDpi: typeof upload.effectiveDpi === "number" ? upload.effectiveDpi : undefined,
          printSizeSource: "import_normalized",
          uploadedBy: caller.id,
          requestedByCustomerId:
            typeof upload.customerId === "string" ? upload.customerId : undefined,
          sourceCustomerUploadId: uploadId,
          wasUpscaled: typeof upload.wasUpscaled === "boolean" ? upload.wasUpscaled : undefined,
          upscaleFactor: typeof upload.upscaleFactor === "number" ? upload.upscaleFactor : undefined,
          upscalePassCount:
            upload.upscalePassCount === 0 || upload.upscalePassCount === 1
              ? upload.upscalePassCount
              : undefined,
          approvedMaxPrintWidthInches:
            typeof upload.approvedMaxPrintWidthInches === "number"
              ? upload.approvedMaxPrintWidthInches
              : undefined,
          approvedMaxPrintHeightInches:
            typeof upload.approvedMaxPrintHeightInches === "number"
              ? upload.approvedMaxPrintHeightInches
              : undefined,
          sizingPolicyVersion:
            typeof upload.sizingPolicyVersion === "string" ? upload.sizingPolicyVersion : undefined,
          sizingWarningCode:
            typeof upload.sizingWarningCode === "string" ? upload.sizingWarningCode : undefined,
          halftoneDetection: upload.halftoneDetection ?? undefined,
          halftoneSubmitterResponse: upload.halftoneSubmitterResponse ?? undefined,
          halftoneStaffDecision: upload.halftoneStaffDecision ?? undefined,
          queueCount: 0,
          aiProcessed: false,
          aiReviewed: false,
          aiReviewStatus: "pending",
          createdBy: caller.id,
          updatedBy: caller.id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

      tx.update(uploadRef, {
        promotedDesignId: designId,
        catalogReviewStatus: "sent_to_ai_review",
        promotedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        designId,
        alreadyPromoted: false as const,
        originalPath,
        previewPath,
        thumbnailPath,
        productionStoragePath: upload.productionStoragePath as string,
        previewStoragePath:
          typeof upload.previewStoragePath === "string" ? upload.previewStoragePath : null,
        thumbnailStoragePath:
          typeof upload.thumbnailStoragePath === "string" ? upload.thumbnailStoragePath : null,
        copyAssets: true,
      };
    });

    if (promoteResult.productionStoragePath) {
      const bucket = adminStorage.bucket();
      const [originalExists] = await bucket
        .file(storageObjectPath(promoteResult.originalPath))
        .exists();
      if (promoteResult.copyAssets || !originalExists) {
        await copyUploadAssetsToDesign({
          productionStoragePath: promoteResult.productionStoragePath,
          previewStoragePath: promoteResult.previewStoragePath,
          thumbnailStoragePath: promoteResult.thumbnailStoragePath,
          originalPath: promoteResult.originalPath,
          previewPath: promoteResult.previewPath,
          thumbnailPath: promoteResult.thumbnailPath,
        });
      }
    }

    return {
      uploadId,
      designId: promoteResult.designId,
      alreadyPromoted: promoteResult.alreadyPromoted,
      catalogReviewStatus: "sent_to_ai_review",
      originalPath: promoteResult.originalPath,
      // Client starts AI via background enqueue queue (same as import).
      enqueueAttempted: false,
      enqueueQueued: false,
      enqueueReason: "deferred_to_client",
    };
  },
);
