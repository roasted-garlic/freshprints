import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type { RecordCustomerUploadHalftoneStaffDecisionResponse } from "../../packages/shared/src/types/customerUpload/halftoneResponse.types";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  assertCanManageCustomerUploadIntake,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { invalidArgument, unauthenticated } from "./lib/errors";

export const recordCustomerUploadHalftoneStaffDecision = onCall(
  async (request): Promise<RecordCustomerUploadHalftoneStaffDecisionResponse> => {
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

    const data = request.data as Record<string, unknown>;
    if (typeof data.value !== "boolean") {
      throw invalidArgument("Halftone staff decision must be a boolean.");
    }
    const value = data.value;

    const uploadRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(uploadId);
    const snap = await uploadRef.get();
    if (!snap.exists) {
      throw invalidArgument("Upload was not found.");
    }

    await uploadRef.update({
      halftoneStaffDecision: {
        value,
        decidedAt: FieldValue.serverTimestamp(),
        decidedBy: caller.id,
        isExplicitOverride: true,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { uploadId, value };
  },
);
