import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type { ConfirmCustomerUploadsAndAttachToRequestResponse } from "../../packages/shared/src/types/customerUpload/confirmCustomerUploadAttach.types";
import { CUSTOMER_UPLOAD_TERMS_VERSION } from "../../packages/shared/src/types/customerUpload/customerUpload.types";
import { resolveInitialPrintRequestItemSize } from "../../packages/shared/src/utils/printRequestItemSizing";
import { resolveCustomerUploadPurpose } from "../../packages/shared/src/utils/customerUploadPurpose";

import { adminDb } from "./lib/admin";
import { validateConfirmCustomerUploadsAndAttachRequest } from "./lib/confirmCustomerUploadValidation";
import { buildCatalogIntakeConfirmationPatch } from "./lib/customerUploadCatalogConfirmation";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { loadPrintRequestLimitSettings } from "./lib/loadPrintRequestLimitSettings";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { assertWorkingRequestAllowsPrintAdds } from "./lib/printRequestWorkingRequestMax";
import { resolveOrCreateWorkingPrintRequestInTransaction } from "./lib/portalWorkingPrintRequest";
import { sumPrintRequestItemQuantities } from "../../packages/shared/src/utils/portalShowQueueCapacity";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to attach uploads right now.");
}

function resolveAttachPrintSize(upload: Record<string, unknown>): {
  printWidthInches?: number;
  printHeightInches?: number;
} {
  const widthPx = typeof upload.widthPx === "number" ? upload.widthPx : null;
  const heightPx = typeof upload.heightPx === "number" ? upload.heightPx : null;
  const defaultPrintWidthInches =
    typeof upload.printWidthInches === "number" ? upload.printWidthInches : undefined;

  if (widthPx && heightPx && widthPx > 0 && heightPx > 0) {
    try {
      const initial = resolveInitialPrintRequestItemSize({
        pixelWidth: widthPx,
        pixelHeight: heightPx,
        defaultPrintWidthInches,
        approvedMaxPrintWidthInches:
          typeof upload.approvedMaxPrintWidthInches === "number"
            ? upload.approvedMaxPrintWidthInches
            : undefined,
        approvedMaxPrintHeightInches:
          typeof upload.approvedMaxPrintHeightInches === "number"
            ? upload.approvedMaxPrintHeightInches
            : undefined,
      });
      return {
        printWidthInches: initial.printWidthInches,
        printHeightInches: initial.printHeightInches,
      };
    } catch {
      // Fall through to stored inches.
    }
  }

  return {
    printWidthInches:
      typeof upload.printWidthInches === "number" ? upload.printWidthInches : undefined,
    printHeightInches:
      typeof upload.printHeightInches === "number" ? upload.printHeightInches : undefined,
  };
}

export const confirmCustomerUploadsAndAttachToRequest = onCall(
  async (request): Promise<ConfirmCustomerUploadsAndAttachToRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const payload = validateConfirmCustomerUploadsAndAttachRequest(request.data);
      const customerUid = request.auth.uid;
      const quantity = payload.defaultQuantity ?? 1;
      const catalogUseAcknowledged = payload.catalogUseAcknowledged;

      const batchRef = adminDb
        .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches)
        .doc(payload.batchId);
      const batchSnap = await batchRef.get();
      if (!batchSnap.exists) {
        throw invalidArgument("Upload batch was not found.");
      }
      if (batchSnap.data()?.customerUid !== customerUid) {
        throw permissionDenied("You do not own this upload batch.");
      }
      if (resolveCustomerUploadPurpose(batchSnap.data()?.purpose) === "catalog_donation") {
        throw failedPrecondition("Donation uploads cannot be added to a print request.");
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
        if (resolveCustomerUploadPurpose(data.purpose) === "catalog_donation") {
          throw failedPrecondition("Donation uploads cannot be added to a print request.");
        }
        if (data.technicalStatus !== "ready") {
          throw failedPrecondition("Only successfully processed uploads can be added to a request.");
        }
      }

      const attachedItemIds: string[] = [];
      const reusedItemIds: string[] = [];
      let printRequestId = "";
      const settings = await loadPrintRequestLimitSettings();
      const maxPerRequest = settings.maxQuantityPerShowPerCustomer;

      await adminDb.runTransaction(async (tx) => {
        const resolved = await resolveOrCreateWorkingPrintRequestInTransaction(tx, {
          customerId: portalCustomer.customerId,
          userId: customerUid,
          username: portalCustomer.username,
          displayName: portalCustomer.displayName,
        });
        printRequestId = resolved.printRequestId;
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);

        const existingByUploadId = new Map<string, string>();
        let currentItemCount = 0;
        let currentPrintCount = 0;

        // When a request was just created, resolve helper already wrote — do not read after write.
        if (!resolved.created) {
          for (let i = 0; i < payload.uploadIds.length; i += 10) {
            const chunk = payload.uploadIds.slice(i, i + 10);
            const existingSnap = await tx.get(
              adminDb
                .collection("printRequestItems")
                .where("printRequestId", "==", printRequestId)
                .where("customerUploadId", "in", chunk),
            );
            for (const docSnap of existingSnap.docs) {
              const uploadId = String(docSnap.data().customerUploadId ?? "");
              if (uploadId) {
                existingByUploadId.set(uploadId, docSnap.id);
              }
            }
          }

          const requestSnap = await tx.get(requestRef);
          currentItemCount = Number(requestSnap.data()?.itemCount ?? 0);

          const allItemsSnap = await tx.get(
            adminDb.collection("printRequestItems").where("printRequestId", "==", printRequestId),
          );
          currentPrintCount = sumPrintRequestItemQuantities(
            allItemsSnap.docs.map((docSnap) => {
              const qty = Number(docSnap.data()?.quantity ?? 1);
              return {
                quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
              };
            }),
          );
        }

        const now = FieldValue.serverTimestamp();
        let newItemCount = 0;
        let newPrintCount = 0;
        for (const uploadSnap of uploadSnaps) {
          if (!existingByUploadId.has(uploadSnap.id)) {
            newItemCount += 1;
            newPrintCount += quantity;
          }
        }

        if (newPrintCount > 0) {
          assertWorkingRequestAllowsPrintAdds({
            currentPrintCount,
            addCount: newPrintCount,
            maxPerRequest,
          });
        }

        newItemCount = 0;
        newPrintCount = 0;

        for (const uploadSnap of uploadSnaps) {
          const uploadId = uploadSnap.id;
          const upload = uploadSnap.data() ?? {};
          const existingItemId = existingByUploadId.get(uploadId);
          const confirmationPatch = buildCatalogIntakeConfirmationPatch({
            catalogUseAcknowledged,
            termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
            printRequestId,
            now,
          });

          if (existingItemId) {
            reusedItemIds.push(existingItemId);
            tx.update(uploadSnap.ref, confirmationPatch);
            continue;
          }

          newItemCount += 1;
          newPrintCount += quantity;
          const itemRef = adminDb.collection("printRequestItems").doc();
          const titleSnapshot =
            typeof upload.originalFilename === "string" && upload.originalFilename.trim()
              ? upload.originalFilename.trim()
              : "Uploaded artwork";
          const printSize = resolveAttachPrintSize(upload);

          tx.set(
            itemRef,
            withoutUndefinedFields({
              id: itemRef.id,
              printRequestId,
              sourceType: "customer_upload",
              customerUploadId: uploadId,
              titleSnapshot,
              quantity,
              printWidthInches: printSize.printWidthInches,
              printHeightInches: printSize.printHeightInches,
              status: "pending",
              addedBy: customerUid,
              createdAt: now,
              updatedAt: now,
            }),
          );
          attachedItemIds.push(itemRef.id);

          tx.update(uploadSnap.ref, confirmationPatch);
        }

        if (newPrintCount > 0) {
          tx.update(requestRef, {
            itemCount: resolved.created ? newItemCount : currentItemCount + newItemCount,
            updatedAt: now,
            updatedBy: customerUid,
          });
        }

        tx.update(batchRef, {
          ownershipConfirmed: true,
          catalogUseAcknowledged,
          termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
          confirmedAt: now,
          printRequestId,
          status: "confirmed",
          updatedAt: now,
        });
      });

      return { printRequestId, attachedItemIds, reusedItemIds };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
