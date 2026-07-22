import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type {
  RecordCustomerUploadHalftoneResponseRequest,
  RecordCustomerUploadHalftoneResponseResponse,
} from "../../packages/shared/src/types/customerUpload/halftoneResponse.types";

import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { isAnonymousAuthToken } from "./lib/catalogDonationUploader";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { resolveCustomerUploadPurpose } from "../../packages/shared/src/utils/customerUploadPurpose";

const ALLOWED = new Set(["yes", "no"] as const);

function parseRequest(data: unknown): RecordCustomerUploadHalftoneResponseRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid request.");
  }
  const record = data as Record<string, unknown>;
  const uploadId = typeof record.uploadId === "string" ? record.uploadId.trim() : "";
  if (!uploadId) {
    throw new Error("uploadId is required.");
  }
  const value = record.value;
  if (value !== "yes" && value !== "no") {
    throw new Error("Halftone response must be yes or no.");
  }
  return { uploadId, value };
}

export const recordCustomerUploadHalftoneResponse = onCall(
  async (request): Promise<RecordCustomerUploadHalftoneResponseResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const isGuest = isAnonymousAuthToken(request.auth.token);
    if (!isGuest) {
      await requirePortalCustomer(request.auth.uid);
    }

    let payload: RecordCustomerUploadHalftoneResponseRequest;
    try {
      payload = parseRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    if (!ALLOWED.has(payload.value)) {
      throw invalidArgument("Halftone response must be yes or no.");
    }

    const uploadRef = adminDb
      .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
      .doc(payload.uploadId);
    const snap = await uploadRef.get();
    if (!snap.exists) {
      throw invalidArgument("Upload was not found.");
    }

    const data = snap.data() ?? {};
    if (data.customerUid !== request.auth.uid) {
      throw permissionDenied("You can only update your own uploads.");
    }

    if (isGuest && resolveCustomerUploadPurpose(data.purpose) !== "catalog_donation") {
      throw permissionDenied("Sign in to update print-request uploads.");
    }

    if (data.technicalStatus !== "ready") {
      throw failedPrecondition("Halftone response can only be recorded after processing succeeds.");
    }

    await uploadRef.update({
      halftoneSubmitterResponse: {
        value: payload.value,
        respondedAt: FieldValue.serverTimestamp(),
        respondedBy: request.auth.uid,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { uploadId: payload.uploadId, value: payload.value };
  },
);
