import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type { ExcludeCustomerUploadFromCatalogResponse } from "../../packages/shared/src/types/customerUpload/customerUploadStaffActions.types";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  assertCanManageCustomerUploadIntake,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { failedPrecondition, invalidArgument, unauthenticated } from "./lib/errors";

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

    await uploadRef.update({
      catalogReviewStatus: "excluded_from_catalog",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { uploadId, catalogReviewStatus: "excluded_from_catalog" };
  },
);
