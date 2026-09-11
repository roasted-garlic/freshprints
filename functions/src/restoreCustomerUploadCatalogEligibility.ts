import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type { RestoreCustomerUploadCatalogEligibilityResponse } from "../../packages/shared/src/types/customerUpload/customerUploadStaffActions.types";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  assertCanManageCustomerUploadIntake,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { failedPrecondition, invalidArgument, unauthenticated } from "./lib/errors";

export const restoreCustomerUploadCatalogEligibility = onCall(
  async (request): Promise<RestoreCustomerUploadCatalogEligibilityResponse> => {
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

    const data = snap.data() ?? {};
    if (data.catalogReviewStatus === "pending_staff_review") {
      return { uploadId, catalogReviewStatus: "pending_staff_review" };
    }

    if (data.catalogReviewStatus !== "excluded_from_catalog") {
      throw failedPrecondition("Only excluded uploads can be restored to staff review.");
    }

    if (data.catalogExclusionReason === "customer_permission_denied") {
      if (data.catalogPermissionFollowUpStatus === "approved") {
        return { uploadId, catalogReviewStatus: "pending_staff_review" };
      }
      throw failedPrecondition(
        "Customer permission is required before this upload can return to staff review.",
      );
    }

    if (typeof data.promotedDesignId === "string" && data.promotedDesignId.trim()) {
      throw failedPrecondition("Promoted uploads cannot be restored to pending review.");
    }

    if (data.fullSizePurgedAt != null) {
      throw failedPrecondition(
        "Full-size files were deleted when this donation was excluded. It cannot be restored for AI Review.",
      );
    }

    await uploadRef.update({
      catalogReviewStatus: "pending_staff_review",
      catalogExclusionReason: "staff_review",
      catalogRetentionStartedAt: FieldValue.delete(),
      // Staff restore should surface at the top of Pending like a fresh intake item.
      catalogPendingQueuedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { uploadId, catalogReviewStatus: "pending_staff_review" };
  },
);
