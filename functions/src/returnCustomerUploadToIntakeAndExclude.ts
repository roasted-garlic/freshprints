import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type {
  ReturnCustomerUploadToIntakeAndExcludeResponse,
} from "../../packages/shared/src/types/customerUpload/customerUploadStaffActions.types";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  collectDesignReferenceBlockersInTransaction,
  deleteDesignStorageAssets,
} from "./lib/designLifecycle";
import { failedPrecondition, internal, invalidArgument, unauthenticated } from "./lib/errors";
import {
  assertCanManageCustomerUploadIntake,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";

const REVERSIBLE_DESIGN_STATUSES = new Set(["imported", "processing", "rejected"]);
const APPROVED_AI_REVIEW_STATUS = "approved";

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getDesignId(upload: Record<string, unknown>): string | null {
  return asTrimmedString(upload.promotedDesignId);
}

function isStaffReversalRetryState(upload: Record<string, unknown>, designId: string): boolean {
  return (
    upload.catalogReviewStatus === "excluded_from_catalog" &&
    upload.catalogExclusionReason === "staff_review" &&
    upload.catalogRetentionStartedAt != null &&
    upload.promotedDesignId === designId
  );
}

function assertReversalUploadEligible(
  upload: Record<string, unknown>,
  designId: string,
): void {
  const status = upload.catalogReviewStatus;
  const retryState = isStaffReversalRetryState(upload, designId);
  if (status !== "sent_to_ai_review" && !retryState) {
    throw failedPrecondition(
      "Only Customer Uploads currently in AI Review can be returned to Excluded.",
    );
  }

  if (upload.technicalStatus !== "ready") {
    throw failedPrecondition("Only technically ready Customer Uploads can be returned to Excluded.");
  }

  if (upload.ownershipConfirmed !== true) {
    throw failedPrecondition("Customer ownership confirmation is required for this reversal.");
  }
}

function assertReversalDesignEligible(
  design: Record<string, unknown>,
  uploadId: string,
  designId: string,
): void {
  if (design.sourceCustomerUploadId !== uploadId) {
    throw failedPrecondition("Design provenance does not match the Customer Upload.");
  }

  if (!REVERSIBLE_DESIGN_STATUSES.has(String(design.status))) {
    throw failedPrecondition(
      "Only pre-ready AI Review designs can be returned to Customer Upload intake.",
    );
  }

  if (design.aiReviewStatus === APPROVED_AI_REVIEW_STATUS) {
    throw failedPrecondition("Approved catalog designs cannot be returned to Customer Upload intake.");
  }

  const companionDesignIds = design.companionDesignIds;
  if (Array.isArray(companionDesignIds) && companionDesignIds.length > 0) {
    throw failedPrecondition("Design has companionDesignIds denormalized links.");
  }

  if (asTrimmedString(design.companionSetId)) {
    throw failedPrecondition("Design is linked to a companion set.");
  }

  if (design.id && design.id !== designId) {
    throw failedPrecondition("Design identity does not match the requested reversal.");
  }
}

function buildExcludedUploadPatch(): Record<string, unknown> {
  return {
    catalogReviewStatus: "excluded_from_catalog",
    catalogExclusionReason: "staff_review",
    catalogRetentionStartedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export const returnCustomerUploadToIntakeAndExclude = onCall(
  { timeoutSeconds: 120, memory: "512MiB" },
  async (
    request,
  ): Promise<ReturnCustomerUploadToIntakeAndExcludeResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertCanManageCustomerUploadIntake(caller);

    let uploadId: string;
    try {
      uploadId = parseUploadId(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const uploadRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(uploadId);
    const initialUploadSnap = await uploadRef.get();
    if (!initialUploadSnap.exists) {
      throw invalidArgument("Upload was not found.");
    }

    const initialUpload = (initialUploadSnap.data() ?? {}) as Record<string, unknown>;
    const designId = getDesignId(initialUpload);
    if (!designId) {
      if (initialUpload.catalogReviewStatus === "excluded_from_catalog") {
        return {
          uploadId,
          designId: "",
          catalogReviewStatus: "excluded_from_catalog",
          alreadyReversed: true,
          storageFilesDeleted: 0,
        };
      }
      throw failedPrecondition("Customer Upload is not linked to a promoted AI Review design.");
    }

    const designRef = adminDb.collection("designs").doc(designId);
    const initialDesignSnap = await designRef.get();
    const initialDesign = (initialDesignSnap.data() ?? {}) as Record<string, unknown>;
    assertReversalUploadEligible(initialUpload, designId);

    if (!initialDesignSnap.exists) {
      await uploadRef.update({
        ...buildExcludedUploadPatch(),
        promotedDesignId: FieldValue.delete(),
      });
      return {
        uploadId,
        designId,
        catalogReviewStatus: "excluded_from_catalog",
        alreadyReversed: false,
        storageFilesDeleted: 0,
      };
    }

    assertReversalDesignEligible(initialDesign, uploadId, designId);

    // Invalidate the active attempt and move the upload into the protected reversal retry state.
    // Keeping the backlink until finalization makes a Storage failure retryable and lets the AI
    // enqueue callable reject stale client work while cleanup is in progress.
    await adminDb.runTransaction(async (transaction) => {
      const uploadSnap = await transaction.get(uploadRef);
      const designSnap = await transaction.get(designRef);
      if (!uploadSnap.exists || !designSnap.exists) {
        throw failedPrecondition("The promoted Customer Upload or design changed during reversal.");
      }

      const upload = (uploadSnap.data() ?? {}) as Record<string, unknown>;
      const design = (designSnap.data() ?? {}) as Record<string, unknown>;
      if (getDesignId(upload) !== designId) {
        throw failedPrecondition("Customer Upload promotion link changed during reversal.");
      }
      assertReversalUploadEligible(upload, designId);
      assertReversalDesignEligible(design, uploadId, designId);

      const blockers = await collectDesignReferenceBlockersInTransaction(transaction, designId);
      if (blockers.length > 0) {
        throw failedPrecondition(blockers[0]!);
      }

      transaction.update(designRef, {
        aiProcessingAttemptId: FieldValue.delete(),
        aiProcessingStage: "failed",
        updatedBy: caller.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(uploadRef, {
        ...buildExcludedUploadPatch(),
      });
    });

    const storageCleanup = await deleteDesignStorageAssets(designId);
    if (storageCleanup.failedPaths.length > 0) {
      throw internal(
        "Unable to safely remove the promoted design assets. The reversal was paused; retry to finish.",
        { failedPaths: storageCleanup.failedPaths },
      );
    }

    // Final transaction rechecks the authoritative pair and all downstream references after
    // Storage cleanup. The attempt was already invalidated, so late AI writes cannot revive it.
    await adminDb.runTransaction(async (transaction) => {
      const uploadSnap = await transaction.get(uploadRef);
      const designSnap = await transaction.get(designRef);
      if (!uploadSnap.exists) {
        throw failedPrecondition("Customer Upload was removed during reversal.");
      }

      const upload = (uploadSnap.data() ?? {}) as Record<string, unknown>;
      if (getDesignId(upload) !== designId) {
        throw failedPrecondition("Customer Upload promotion link changed during reversal.");
      }

      if (designSnap.exists) {
        const design = (designSnap.data() ?? {}) as Record<string, unknown>;
        assertReversalDesignEligible(design, uploadId, designId);
        const blockers = await collectDesignReferenceBlockersInTransaction(transaction, designId);
        if (blockers.length > 0) {
          throw failedPrecondition(blockers[0]!);
        }
        transaction.delete(designRef);
      }

      transaction.update(uploadRef, {
        ...buildExcludedUploadPatch(),
        promotedDesignId: FieldValue.delete(),
      });
    });

    return {
      uploadId,
      designId,
      catalogReviewStatus: "excluded_from_catalog",
      alreadyReversed: false,
      storageFilesDeleted: storageCleanup.deletedCount,
    };
  },
);
