import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

import {
  DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE,
  type DeleteEligibleCustomerUploadRequest,
  type DeleteEligibleCustomerUploadResponse,
  type PreviewCustomerUploadDeletionRequest,
  type PreviewCustomerUploadDeletionResponse,
} from "../../packages/shared/src/types/deletion/deletion.types";
import type { DeletionCallableWarmupResponse } from "../../packages/shared/src/types/deletion/deletionWarmup.types";
import { adminDb, adminStorage } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  buildCustomerUploadBatchDeletionPatch,
  resolveCustomerUploadAssetManifest,
  resolveCustomerUploadDeletionBlockers,
} from "./lib/customerUploadDeletionEligibility";
import { assertCanDeleteCustomerUpload } from "./lib/customerUploadStaffAuth";
import { deletionWarmupOk, isDeletionCallableWarmupRequest } from "./lib/deletionWarmup";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import {
  applyDonationFinalizeQuotaRefundInTransaction,
  resolveDonationFinalizeQuotaRefundTarget,
} from "./lib/refundDonationFinalizeQuota";
import { storageObjectPath } from "./lib/storageObjectPath";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to process customer upload deletion right now.");
}

function parseUploadId(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const customerUploadId =
    "customerUploadId" in data && typeof data.customerUploadId === "string"
      ? data.customerUploadId.trim()
      : "";
  if (!customerUploadId) {
    throw invalidArgument("Select a customer upload.");
  }
  return customerUploadId;
}

function requirePhrase(data: unknown): string {
  const phrase =
    data &&
    typeof data === "object" &&
    "confirmationPhrase" in data &&
    typeof data.confirmationPhrase === "string"
      ? data.confirmationPhrase.trim()
      : "";
  if (phrase !== DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE) {
    throw invalidArgument(
      `Confirmation phrase must be exactly "${DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE}".`,
    );
  }
  return phrase;
}

async function deleteStoragePath(path: string): Promise<boolean> {
  try {
    await adminStorage.bucket().file(storageObjectPath(path)).delete({ ignoreNotFound: true });
    return true;
  } catch (error) {
    console.error("Failed to delete customer upload Storage object.", {
      path,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

async function buildPreview(
  customerUploadId: string,
  options?: { requireOwnerUid?: string },
): Promise<PreviewCustomerUploadDeletionResponse> {
  const snap = await adminDb.collection("customerUploads").doc(customerUploadId).get();
  if (!snap.exists) {
    return {
      outcome: "already_done",
      blockers: [],
      entityLabel: "Customer upload",
      notes: ["This upload is already gone."],
      customerUploadId,
      title: "Customer upload",
    };
  }

  const data = snap.data() ?? {};
  if (options?.requireOwnerUid) {
    const ownerUid = typeof data.customerUid === "string" ? data.customerUid.trim() : "";
    if (!ownerUid || ownerUid !== options.requireOwnerUid) {
      throw permissionDenied("You can only delete your own uploads.");
    }
  }

  const title =
    typeof data.originalFilename === "string" && data.originalFilename.trim()
      ? data.originalFilename.trim()
      : "Customer upload";

  const [itemRefs, promotedDesignRefs] = await Promise.all([
    adminDb
      .collection("printRequestItems")
      .where("customerUploadId", "==", customerUploadId)
      .limit(20)
      .get(),
    adminDb
      .collection("designs")
      .where("sourceCustomerUploadId", "==", customerUploadId)
      .limit(20)
      .get(),
  ]);

  const blockers = resolveCustomerUploadDeletionBlockers({
    printRequestItemCount: itemRefs.size,
    promotedDesignId: data.promotedDesignId,
    promotedDesignReferenceCount: promotedDesignRefs.size,
  });
  const assetManifest = resolveCustomerUploadAssetManifest(data, customerUploadId);
  if (assetManifest.blocker) {
    blockers.push(assetManifest.blocker);
  }
  if (blockers.length > 0) {
    return {
      outcome: "blocked",
      blockers,
      entityLabel: title,
      customerUploadId,
      title,
    };
  }

  return {
    outcome: "allowed_hard_delete",
    blockers: [],
    entityLabel: title,
    confirmLabel: "Delete Upload",
    notes: ["This permanently deletes the upload document and its Storage files."],
    customerUploadId,
    title,
  };
}

async function executeEligibleHardDelete(
  customerUploadId: string,
  options?: { requireOwnerUid?: string },
): Promise<DeleteEligibleCustomerUploadResponse> {
  const preview = await buildPreview(customerUploadId, options);
  if (preview.outcome === "already_done") {
    return {
      outcome: "already_done",
      message: "Upload already deleted.",
      entityId: customerUploadId,
      customerUploadId,
      storageFilesDeleted: 0,
      storageCleanupFailed: false,
    };
  }
  if (preview.outcome !== "allowed_hard_delete") {
    return {
      outcome: preview.outcome,
      blockers: preview.blockers,
      message: preview.blockers[0]?.message ?? "This upload cannot be deleted.",
      entityId: customerUploadId,
      customerUploadId,
      storageFilesDeleted: 0,
      storageCleanupFailed: false,
    };
  }

  const recheck = await buildPreview(customerUploadId, options);
  if (recheck.outcome !== "allowed_hard_delete") {
    return {
      outcome: recheck.outcome,
      blockers: recheck.blockers,
      message: recheck.blockers[0]?.message ?? "Dependencies changed. Deletion was blocked.",
      entityId: customerUploadId,
      customerUploadId,
      storageFilesDeleted: 0,
      storageCleanupFailed: false,
    };
  }

  const snap = await adminDb.collection("customerUploads").doc(customerUploadId).get();
  const data = snap.data() ?? {};
  if (options?.requireOwnerUid) {
    const ownerUid = typeof data.customerUid === "string" ? data.customerUid.trim() : "";
    if (!ownerUid || ownerUid !== options.requireOwnerUid) {
      throw permissionDenied("You can only delete your own uploads.");
    }
  }

  const assetManifest = resolveCustomerUploadAssetManifest(data, customerUploadId);
  if (assetManifest.blocker) {
    return {
      outcome: "blocked",
      blockers: [assetManifest.blocker],
      message: assetManifest.blocker.message,
      entityId: customerUploadId,
      customerUploadId,
      storageFilesDeleted: 0,
      storageCleanupFailed: false,
    };
  }

  let storageFilesDeleted = 0;
  let storageCleanupFailed = false;
  for (const path of assetManifest.paths) {
    const ok = await deleteStoragePath(path);
    if (ok) {
      storageFilesDeleted += 1;
    } else {
      storageCleanupFailed = true;
    }
  }

  if (storageCleanupFailed) {
    return {
      outcome: "failed",
      message:
        "Some upload files could not be removed. The upload record was retained so cleanup can be retried safely.",
      entityId: customerUploadId,
      customerUploadId,
      storageFilesDeleted,
      storageCleanupFailed: true,
    };
  }

  const uploadRef = adminDb.collection("customerUploads").doc(customerUploadId);
  await adminDb.runTransaction(async (transaction) => {
    const currentUpload = await transaction.get(uploadRef);
    if (!currentUpload.exists) {
      return;
    }
    const currentData = currentUpload.data() ?? {};
    if (options?.requireOwnerUid) {
      const ownerUid =
        typeof currentData.customerUid === "string" ? currentData.customerUid.trim() : "";
      if (!ownerUid || ownerUid !== options.requireOwnerUid) {
        throw permissionDenied("You can only delete your own uploads.");
      }
    }

    const refundTarget = resolveDonationFinalizeQuotaRefundTarget(currentData);
    const rateLimitSnap = refundTarget
      ? await transaction.get(refundTarget.rateLimitRef)
      : null;

    const batchId = typeof currentData.batchId === "string" ? currentData.batchId.trim() : "";
    if (batchId) {
      const batchRef = adminDb.collection("customerUploadBatches").doc(batchId);
      const batchSnap = await transaction.get(batchRef);
      if (batchSnap.exists) {
        transaction.update(batchRef, {
          ...buildCustomerUploadBatchDeletionPatch(
            batchSnap.data() ?? {},
            customerUploadId,
            currentData.technicalStatus,
          ),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    if (refundTarget && rateLimitSnap) {
      applyDonationFinalizeQuotaRefundInTransaction(
        transaction,
        rateLimitSnap,
        refundTarget.rateLimitRef,
      );
    }

    transaction.delete(uploadRef);
  });

  return {
    outcome: "allowed_hard_delete",
    message: "Unused customer upload and all owned assets deleted.",
    entityId: customerUploadId,
    customerUploadId,
    storageFilesDeleted,
    storageCleanupFailed,
  };
}

export const previewCustomerUploadDeletion = onCall(
  async (
    request,
  ): Promise<PreviewCustomerUploadDeletionResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertCanDeleteCustomerUpload(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }
      return await buildPreview(parseUploadId(request.data as PreviewCustomerUploadDeletionRequest));
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const deleteEligibleCustomerUpload = onCall(
  async (
    request,
  ): Promise<DeleteEligibleCustomerUploadResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertCanDeleteCustomerUpload(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }
      const customerUploadId = parseUploadId(request.data as DeleteEligibleCustomerUploadRequest);
      requirePhrase(request.data);
      return await executeEligibleHardDelete(customerUploadId);
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

/** Portal customer preview — own uploads only; reuses staff eligibility blockers. */
export const previewPortalCustomerUploadDeletion = onCall(
  async (request): Promise<PreviewCustomerUploadDeletionResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      return await buildPreview(
        parseUploadId(request.data as PreviewCustomerUploadDeletionRequest),
        { requireOwnerUid: request.auth.uid },
      );
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

/** Portal customer hard delete — own uploads only; same Storage-first / refund contract as Studio. */
export const deletePortalCustomerUpload = onCall(
  async (request): Promise<DeleteEligibleCustomerUploadResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const customerUploadId = parseUploadId(request.data as DeleteEligibleCustomerUploadRequest);
      requirePhrase(request.data);
      return await executeEligibleHardDelete(customerUploadId, {
        requireOwnerUid: request.auth.uid,
      });
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
