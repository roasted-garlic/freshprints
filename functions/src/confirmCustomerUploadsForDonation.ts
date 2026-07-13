import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type { ConfirmCustomerUploadsForDonationResponse } from "../../packages/shared/src/types/customerUpload/confirmCustomerUploadDonate.types";
import { CUSTOMER_UPLOAD_DONATE_TERMS_VERSION } from "../../packages/shared/src/types/customerUpload/customerUpload.types";
import { resolveCustomerUploadPurpose } from "../../packages/shared/src/utils/customerUploadPurpose";

import { adminDb } from "./lib/admin";
import { validateConfirmCustomerUploadsForDonationRequest } from "./lib/confirmCustomerUploadDonateValidation";
import { buildCatalogIntakeConfirmationPatch } from "./lib/customerUploadCatalogConfirmation";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to submit donation right now.");
}

export const confirmCustomerUploadsForDonation = onCall(
  async (request): Promise<ConfirmCustomerUploadsForDonationResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      await requirePortalCustomer(request.auth.uid);
      const payload = validateConfirmCustomerUploadsForDonationRequest(request.data);
      const customerUid = request.auth.uid;

      const batchRef = adminDb
        .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches)
        .doc(payload.batchId);
      const batchSnap = await batchRef.get();
      if (!batchSnap.exists) {
        throw invalidArgument("Upload batch was not found.");
      }
      const batch = batchSnap.data() ?? {};
      if (batch.customerUid !== customerUid) {
        throw permissionDenied("You do not own this upload batch.");
      }
      if (resolveCustomerUploadPurpose(batch.purpose) !== "catalog_donation") {
        throw failedPrecondition("This batch is not a catalog donation session.");
      }

      const uploadSnaps = await Promise.all(
        payload.uploadIds.map((id) =>
          adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(id).get(),
        ),
      );

      for (let i = 0; i < uploadSnaps.length; i += 1) {
        const snap = uploadSnaps[i];
        if (!snap.exists) {
          throw invalidArgument(`Upload ${payload.uploadIds[i]} was not found.`);
        }
        const data = snap.data() ?? {};
        if (data.customerUid !== customerUid) {
          throw permissionDenied("You do not own one or more uploads.");
        }
        if (data.batchId !== payload.batchId) {
          throw invalidArgument("Upload does not belong to this batch.");
        }
        if (resolveCustomerUploadPurpose(data.purpose) !== "catalog_donation") {
          throw failedPrecondition("Only donation uploads can be submitted here.");
        }
        if (data.technicalStatus !== "ready") {
          throw failedPrecondition("Only successfully processed uploads can be donated.");
        }
      }

      const confirmedUploadIds: string[] = [];

      await adminDb.runTransaction(async (tx) => {
        const now = FieldValue.serverTimestamp();
        const confirmationPatch = buildCatalogIntakeConfirmationPatch({
          catalogUseAcknowledged: true,
          termsVersion: CUSTOMER_UPLOAD_DONATE_TERMS_VERSION,
          printRequestId: null,
          now,
        });

        for (const uploadSnap of uploadSnaps) {
          tx.update(uploadSnap.ref, confirmationPatch);
          confirmedUploadIds.push(uploadSnap.id);
        }

        tx.update(batchRef, {
          ownershipConfirmed: true,
          catalogUseAcknowledged: true,
          termsVersion: CUSTOMER_UPLOAD_DONATE_TERMS_VERSION,
          confirmedAt: now,
          printRequestId: null,
          status: "confirmed",
          updatedAt: now,
        });
      });

      return { batchId: payload.batchId, confirmedUploadIds };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
