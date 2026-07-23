import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE,
  type DeleteEligibleCustomerUploadRequest,
  type DeleteEligibleCustomerUploadResponse,
  type PreviewCustomerUploadDeletionRequest,
  type PreviewCustomerUploadDeletionResponse,
} from "../../packages/shared/src/types/deletion/deletion.types";
import { adminDb, adminStorage } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { isCustomerUploadPromoted } from "./lib/deletionEligibility";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can permanently delete customer uploads.");
  }
}

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
    await adminStorage.bucket().file(path).delete({ ignoreNotFound: true });
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
  const title =
    typeof data.originalFilename === "string" && data.originalFilename.trim()
      ? data.originalFilename.trim()
      : "Customer upload";

  const itemRefs = await adminDb
    .collection("printRequestItems")
    .where("customerUploadId", "==", customerUploadId)
    .limit(20)
    .get();

  if (!itemRefs.empty) {
    return {
      outcome: "blocked",
      blockers: [
        {
          code: "attached_to_print_request",
          message: `This upload cannot be deleted because it is attached to ${itemRefs.size} print request item(s). Remove those items first.`,
          count: itemRefs.size,
          navigateHint: "Print Requests",
        },
      ],
      entityLabel: title,
      customerUploadId,
      title,
    };
  }

  if (isCustomerUploadPromoted(data.promotedDesignId)) {
    return {
      outcome: "blocked",
      blockers: [
        {
          code: "promoted_to_design",
          message:
            "This upload cannot be deleted because it was promoted to a catalog design. Resolve the promotion relationship first.",
          navigateHint: "Design Library",
        },
      ],
      entityLabel: title,
      customerUploadId,
      title,
    };
  }

  return {
    outcome: "allowed_hard_delete",
    blockers: [],
    entityLabel: title,
    confirmLabel: "Delete unused upload",
    notes: ["This permanently deletes the upload document and its Storage files."],
    customerUploadId,
    title,
  };
}

export const previewCustomerUploadDeletion = onCall(
  async (request): Promise<PreviewCustomerUploadDeletionResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      return await buildPreview(parseUploadId(request.data as PreviewCustomerUploadDeletionRequest));
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const deleteEligibleCustomerUpload = onCall(
  async (request): Promise<DeleteEligibleCustomerUploadResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      const customerUploadId = parseUploadId(request.data as DeleteEligibleCustomerUploadRequest);
      requirePhrase(request.data);

      const preview = await buildPreview(customerUploadId);
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

      const recheck = await buildPreview(customerUploadId);
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
      const paths = [
        data.sourceStoragePath,
        data.productionStoragePath,
        data.previewStoragePath,
        data.thumbnailStoragePath,
      ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      let storageFilesDeleted = 0;
      let storageCleanupFailed = false;
      for (const path of paths) {
        const ok = await deleteStoragePath(path);
        if (ok) {
          storageFilesDeleted += 1;
        } else {
          storageCleanupFailed = true;
        }
      }

      await adminDb.collection("customerUploads").doc(customerUploadId).delete();

      return {
        outcome: "allowed_hard_delete",
        message: storageCleanupFailed
          ? "Upload deleted, but some Storage files failed to clean up. Check logs for recovery."
          : "Unused customer upload deleted.",
        entityId: customerUploadId,
        customerUploadId,
        storageFilesDeleted,
        storageCleanupFailed,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
