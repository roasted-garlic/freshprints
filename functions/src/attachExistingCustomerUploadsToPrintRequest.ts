import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type { AttachExistingCustomerUploadsToPrintRequestResponse } from "../../packages/shared/src/types/customerUpload/attachExistingCustomerUpload.types";
import {
  resolveInitialPrintRequestItemSize,
  resolvePrintRequestDefaultWidthInches,
} from "../../packages/shared/src/utils/printRequestItemSizing";
import { resolveCustomerUploadPurpose } from "../../packages/shared/src/utils/customerUploadPurpose";
import { resolveNextPrintRequestItemSortOrder } from "../../packages/shared/src/utils/printRequestItemDisplayOrder";
import { sumPrintRequestItemQuantities } from "../../packages/shared/src/utils/portalShowQueueCapacity";

import { adminDb } from "./lib/admin";
import { validateAttachExistingCustomerUploadsToPrintRequest } from "./lib/attachExistingCustomerUploadValidation";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { loadEffectivePrintRequestLimitsForCustomer } from "./lib/loadEffectivePrintRequestLimits";
import { loadStandardPrintSizesSettings } from "./lib/loadStandardPrintSizesSettings";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { assertPortalMaintenanceAllowsCustomerMutation } from "./lib/portalMaintenance";
import { assertWorkingRequestAllowsPrintAdds } from "./lib/printRequestWorkingRequestMax";
import { assertPortalActiveEditableRequestData } from "./lib/portalContinuableParking";
import { resolveOrCreateWorkingPrintRequestInTransaction } from "./lib/portalWorkingPrintRequest";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to add this design to your print request right now.");
}

function resolveAttachPrintSize(
  upload: Record<string, unknown>,
  printRequestDefaultWidthInches?: number,
): {
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
        printRequestDefaultWidthInches,
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

function assertUploadAttachable(upload: Record<string, unknown>, uploadId: string): void {
  if (upload.ownershipConfirmed !== true) {
    throw failedPrecondition(`Upload ${uploadId} is not confirmed for reuse.`);
  }
  if (upload.technicalStatus !== "ready") {
    throw failedPrecondition("Only successfully processed uploads can be added to a request.");
  }
  if (upload.fullSizePurgedAt != null) {
    throw failedPrecondition("This design’s full-size file is no longer available to add.");
  }
  const productionPath =
    typeof upload.productionStoragePath === "string" ? upload.productionStoragePath.trim() : "";
  if (!productionPath) {
    throw failedPrecondition("This design’s full-size file is no longer available to add.");
  }
  const purpose = resolveCustomerUploadPurpose(upload.purpose);
  if (purpose !== "print_request" && purpose !== "catalog_donation") {
    throw failedPrecondition("This upload cannot be added to a print request.");
  }
}

/**
 * Re-attach existing Personal / Uploaded / Donated gallery uploads onto a Continuable request.
 * Does not rewrite catalog consent, denial, or donation Pending fields.
 */
export const attachExistingCustomerUploadsToPrintRequest = onCall(
  async (request): Promise<AttachExistingCustomerUploadsToPrintRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      await assertPortalMaintenanceAllowsCustomerMutation(request.auth.uid);
      const payload = validateAttachExistingCustomerUploadsToPrintRequest(request.data);
      const customerUid = request.auth.uid;
      const quantity = payload.defaultQuantity ?? 1;

      const uploadSnaps = await Promise.all(
        payload.uploadIds.map((id) =>
          adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(id).get(),
        ),
      );

      for (let i = 0; i < uploadSnaps.length; i += 1) {
        const snap = uploadSnaps[i];
        if (!snap?.exists) {
          throw invalidArgument(`Upload ${payload.uploadIds[i]} was not found.`);
        }
        const data = snap.data() ?? {};
        if (data.customerUid !== customerUid) {
          throw permissionDenied("You do not own one or more uploads.");
        }
        assertUploadAttachable(data, snap.id);
      }

      const attachedItemIds: string[] = [];
      const reusedItemIds: string[] = [];
      let printRequestId = "";
      const [effectiveLimits, standardPrintSizesSettings] = await Promise.all([
        loadEffectivePrintRequestLimitsForCustomer(portalCustomer.customerId),
        loadStandardPrintSizesSettings(),
      ]);
      const printRequestDefaultWidthInches = resolvePrintRequestDefaultWidthInches(
        standardPrintSizesSettings,
      );
      const maxPerRequest = effectiveLimits.effectiveMaxQuantityPerPrintRequest;

      await adminDb.runTransaction(async (tx) => {
        let created = false;
        if (payload.printRequestId) {
          printRequestId = payload.printRequestId;
          const requestRef = adminDb.collection("printRequests").doc(printRequestId);
          const requestSnap = await tx.get(requestRef);
          if (!requestSnap.exists) {
            throw invalidArgument("Print request was not found.");
          }
          const requestData = requestSnap.data() ?? {};
          if (requestData.customerId !== portalCustomer.customerId) {
            throw permissionDenied("You do not own this print request.");
          }
          assertPortalActiveEditableRequestData(requestData, printRequestId);
        } else {
          const resolved = await resolveOrCreateWorkingPrintRequestInTransaction(tx, {
            customerId: portalCustomer.customerId,
            userId: customerUid,
            username: portalCustomer.username,
            displayName: portalCustomer.displayName,
          });
          printRequestId = resolved.printRequestId;
          created = resolved.created;
        }

        const requestRef = adminDb.collection("printRequests").doc(printRequestId);
        const existingByUploadId = new Map<string, string>();
        let currentItemCount = 0;
        let currentPrintCount = 0;
        let nextSortOrder = 1;

        if (!created) {
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
          const existingItems = allItemsSnap.docs.map((docSnap) => {
            const data = docSnap.data() ?? {};
            const qty = Number(data.quantity ?? 1);
            return {
              quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
              sortOrder:
                typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)
                  ? data.sortOrder
                  : undefined,
            };
          });
          currentPrintCount = sumPrintRequestItemQuantities(existingItems);
          nextSortOrder = resolveNextPrintRequestItemSortOrder(existingItems);
        }

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
        const now = FieldValue.serverTimestamp();

        for (const uploadSnap of uploadSnaps) {
          const uploadId = uploadSnap.id;
          const upload = uploadSnap.data() ?? {};
          const existingItemId = existingByUploadId.get(uploadId);

          if (existingItemId) {
            reusedItemIds.push(existingItemId);
            tx.update(uploadSnap.ref, {
              printRequestId,
              updatedAt: now,
            });
            continue;
          }

          newItemCount += 1;
          newPrintCount += quantity;
          const itemRef = adminDb.collection("printRequestItems").doc();
          const titleSnapshot =
            typeof upload.originalFilename === "string" && upload.originalFilename.trim()
              ? upload.originalFilename.trim()
              : "Uploaded artwork";
          const printSize = resolveAttachPrintSize(upload, printRequestDefaultWidthInches);
          const sortOrder = nextSortOrder;
          nextSortOrder += 1;

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
              sortOrder,
              status: "pending",
              addedBy: customerUid,
              createdAt: now,
              updatedAt: now,
            }),
          );
          attachedItemIds.push(itemRef.id);

          tx.update(uploadSnap.ref, {
            printRequestId,
            updatedAt: now,
          });
        }

        if (newPrintCount > 0) {
          tx.update(requestRef, {
            itemCount: created ? newItemCount : currentItemCount + newItemCount,
            updatedAt: now,
            updatedBy: customerUid,
          });
        }
      });

      return { printRequestId, attachedItemIds, reusedItemIds };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
