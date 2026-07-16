import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type { ExcludeCustomerUploadFromCatalogResponse } from "../../packages/shared/src/types/customerUpload/customerUploadStaffActions.types";

import { adminDb, adminStorage } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { storageObjectPath } from "./lib/storageObjectPath";
import {
  assertCanManageCustomerUploadIntake,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { failedPrecondition, invalidArgument, unauthenticated } from "./lib/errors";

async function deleteStorageIfPresent(path: unknown): Promise<void> {
  if (typeof path !== "string" || !path.trim()) {
    return;
  }

  await adminStorage.bucket().file(storageObjectPath(path)).delete({ ignoreNotFound: true });
}

function isCatalogDonation(data: Record<string, unknown>): boolean {
  return data.purpose === "catalog_donation";
}

export const excludeCustomerUploadFromCatalog = onCall(
  async (request): Promise<ExcludeCustomerUploadFromCatalogResponse> => {
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
    const snap = await uploadRef.get();
    if (!snap.exists) {
      throw invalidArgument("Upload was not found.");
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const status = data.catalogReviewStatus;
    if (status === "excluded_from_catalog") {
      return { uploadId, catalogReviewStatus: "excluded_from_catalog" };
    }

    if (status !== "pending_staff_review") {
      throw failedPrecondition(
        "Only uploads pending staff review can be excluded from the catalog.",
      );
    }

    if (typeof data.promotedDesignId === "string" && data.promotedDesignId.trim()) {
      throw failedPrecondition("Promoted uploads cannot be excluded from the catalog.");
    }

    // Donations were never catalog/print-request assets — purge full-size on exclude (ADR-FP-086 §4).
    // Keep thumbnail (and preview) for the Excluded audit list.
    if (isCatalogDonation(data) && data.fullSizePurgedAt == null) {
      await deleteStorageIfPresent(data.sourceStoragePath);
      await deleteStorageIfPresent(data.productionStoragePath);

      await uploadRef.update({
        catalogReviewStatus: "excluded_from_catalog",
        sourceStoragePath: null,
        productionStoragePath: null,
        fullSizePurgedAt: FieldValue.serverTimestamp(),
        fullSizePurgedBy: caller.id,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { uploadId, catalogReviewStatus: "excluded_from_catalog" };
    }

    await uploadRef.update({
      catalogReviewStatus: "excluded_from_catalog",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { uploadId, catalogReviewStatus: "excluded_from_catalog" };
  },
);
