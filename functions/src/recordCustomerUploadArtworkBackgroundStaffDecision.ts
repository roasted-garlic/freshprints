import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  assertCanManageCustomerUploadIntake,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { invalidArgument, unauthenticated } from "./lib/errors";

export interface RecordCustomerUploadArtworkBackgroundStaffDecisionResponse {
  uploadId: string;
  artworkBackgroundHex: string | null;
  artworkBackgroundSource: "staff_manual" | null;
}

/**
 * Staff-only: persist Artwork Background on a customer upload (Studio intake).
 * - Explicit Light/Dark → `staff_manual` + hex (null hex = Light)
 * - Auto → clear both fields (`clearArtworkBackground: true`)
 */
export const recordCustomerUploadArtworkBackgroundStaffDecision = onCall(
  async (request): Promise<RecordCustomerUploadArtworkBackgroundStaffDecisionResponse> => {
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
    const clearArtworkBackground = data.clearArtworkBackground === true;

    const uploadRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(uploadId);
    const snap = await uploadRef.get();
    if (!snap.exists) {
      throw invalidArgument("Upload was not found.");
    }

    if (clearArtworkBackground) {
      await uploadRef.update({
        artworkBackgroundHex: FieldValue.delete(),
        artworkBackgroundSource: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        uploadId,
        artworkBackgroundHex: null,
        artworkBackgroundSource: null,
      };
    }

    const artworkBackgroundHex =
      typeof data.artworkBackgroundHex === "string" && data.artworkBackgroundHex.trim()
        ? data.artworkBackgroundHex.trim()
        : null;

    await uploadRef.update({
      artworkBackgroundHex,
      artworkBackgroundSource: "staff_manual" as const,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      uploadId,
      artworkBackgroundHex,
      artworkBackgroundSource: "staff_manual" as const,
    };
  },
);
