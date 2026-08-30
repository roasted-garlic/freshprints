import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import { resolveDuplicateInsertBeforeSortOrder } from "../../packages/shared/src/utils/printRequestItemDisplayOrder";
import { formatPrintRequestItemSizeLabel } from "../../packages/shared/src/utils/printRequestItemSizing";
import { shouldIncrementDesignRequestCount } from "../../packages/shared/src/utils/printRequestItemSource";

import { adminDb } from "./lib/admin";
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
import {
  assertWorkingRequestAllowsPrintAdds,
  sumWorkingRequestPrintQuantities,
} from "./lib/printRequestWorkingRequestMax";

export interface DuplicatePortalPrintRequestItemRequest {
  printRequestId: string;
  itemId: string;
}

export interface DuplicatePortalPrintRequestItemResponse {
  itemId: string;
  printRequestId: string;
  sourceType: "catalog_design" | "customer_upload";
  designId?: string;
  customerUploadId?: string;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to duplicate the print request item right now.");
}

function asPositiveInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) {
    throw invalidArgument("Quantity must be at least 1.");
  }
  return Math.floor(n);
}

function createdAtMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/**
 * Customer-authoritative duplicate for Portal print request items.
 * Upload-backed items are Admin-created (same customerUploadId, no Storage clone).
 * Catalog-backed items copy designId. Does not increment designs.requestCount for uploads
 * (onPrintRequestItemCreated already gates via shouldIncrementDesignRequestCount).
 * New item is inserted immediately after the source in display order (to the right).
 */
export const duplicatePortalPrintRequestItem = onCall(
  async (request): Promise<DuplicatePortalPrintRequestItemResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = request.data as DuplicatePortalPrintRequestItemRequest;
      const printRequestId =
        typeof data?.printRequestId === "string" ? data.printRequestId.trim() : "";
      const itemId = typeof data?.itemId === "string" ? data.itemId.trim() : "";

      if (!printRequestId || !itemId) {
        throw invalidArgument("printRequestId and itemId are required.");
      }

      const customerUid = request.auth.uid;
      let createdItemId = "";
      let sourceType: "catalog_design" | "customer_upload" = "catalog_design";
      let designId: string | undefined;
      let customerUploadId: string | undefined;
      const settings = await loadPrintRequestLimitSettings();
      const maxPerRequest = settings.maxQuantityPerPrintRequest;

      await adminDb.runTransaction(async (tx) => {
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);
        const itemRef = adminDb.collection("printRequestItems").doc(itemId);
        const siblingsQuery = adminDb
          .collection("printRequestItems")
          .where("printRequestId", "==", printRequestId);

        const [requestSnap, itemSnap, siblingsSnap] = await Promise.all([
          tx.get(requestRef),
          tx.get(itemRef),
          tx.get(siblingsQuery),
        ]);

        if (!requestSnap.exists) {
          throw invalidArgument("Print request not found.");
        }
        if (!itemSnap.exists) {
          throw invalidArgument("Print request item not found.");
        }

        const requestData = requestSnap.data() ?? {};
        const itemData = itemSnap.data() ?? {};

        if (requestData.customerId !== portalCustomer.customerId) {
          throw permissionDenied("You do not own this print request.");
        }

        const status = requestData.status;
        if (status !== "draft" && status !== "editing") {
          throw failedPrecondition("This print request can no longer be edited.");
        }

        if (itemData.printRequestId !== printRequestId) {
          throw invalidArgument("Item does not belong to this print request.");
        }

        const quantity = asPositiveInt(itemData.quantity);
        const printWidthInches =
          typeof itemData.printWidthInches === "number" ? itemData.printWidthInches : undefined;
        const printHeightInches =
          typeof itemData.printHeightInches === "number" ? itemData.printHeightInches : undefined;
        const notes =
          typeof itemData.notes === "string" && itemData.notes.trim()
            ? itemData.notes.trim()
            : undefined;
        const titleSnapshot =
          typeof itemData.titleSnapshot === "string" && itemData.titleSnapshot.trim()
            ? itemData.titleSnapshot.trim()
            : undefined;

        const standardSizePresetKey =
          typeof itemData.standardSizePresetKey === "string" &&
          itemData.standardSizePresetKey.trim()
            ? itemData.standardSizePresetKey.trim()
            : undefined;

        // Newest-first Portal display: insert-before = visual right of source.
        const insertOrder = resolveDuplicateInsertBeforeSortOrder({
          sourceItemId: itemId,
          items: siblingsSnap.docs.map((siblingDoc) => {
            const siblingData = siblingDoc.data() ?? {};
            return {
              id: siblingDoc.id,
              sortOrder:
                typeof siblingData.sortOrder === "number" && Number.isFinite(siblingData.sortOrder)
                  ? siblingData.sortOrder
                  : undefined,
              createdAtMillis: createdAtMillis(siblingData.createdAt),
            };
          }),
        });
        const sortOrder = insertOrder.duplicateSortOrder;

        const isUpload =
          itemData.sourceType === "customer_upload" ||
          (typeof itemData.customerUploadId === "string" &&
            itemData.customerUploadId.trim().length > 0);

        let uploadId = "";
        let catalogDesignId = "";

        if (isUpload) {
          uploadId =
            typeof itemData.customerUploadId === "string" ? itemData.customerUploadId.trim() : "";
          if (!uploadId) {
            throw failedPrecondition("Uploaded artwork is missing its source upload.");
          }

          const uploadRef = adminDb
            .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
            .doc(uploadId);
          const uploadSnap = await tx.get(uploadRef);
          if (!uploadSnap.exists) {
            throw invalidArgument("Customer upload was not found.");
          }
          const uploadData = uploadSnap.data() ?? {};
          if (uploadData.customerUid !== customerUid) {
            throw permissionDenied("You do not own this upload.");
          }

          sourceType = "customer_upload";
          customerUploadId = uploadId;
        } else {
          catalogDesignId =
            typeof itemData.designId === "string" ? itemData.designId.trim() : "";
          if (!catalogDesignId) {
            throw failedPrecondition("Print request item is missing a design.");
          }

          const designSnap = await tx.get(adminDb.collection("designs").doc(catalogDesignId));
          if (!designSnap.exists || designSnap.data()?.status !== "ready") {
            throw failedPrecondition("Only approved catalog designs can be duplicated.");
          }

          sourceType = "catalog_design";
          designId = catalogDesignId;
        }

        const newItemRef = adminDb.collection("printRequestItems").doc();
        createdItemId = newItemRef.id;
        const now = FieldValue.serverTimestamp();

        assertWorkingRequestAllowsPrintAdds({
          currentPrintCount: sumWorkingRequestPrintQuantities(
            siblingsSnap.docs.map((docSnap) => {
              const data = docSnap.data() ?? {};
              return {
                quantity: typeof data.quantity === "number" ? data.quantity : 1,
              };
            }),
          ),
          addCount: quantity,
          maxPerRequest,
        });

        if (isUpload) {
          tx.set(
            newItemRef,
            withoutUndefinedFields({
              id: newItemRef.id,
              printRequestId,
              sourceType: "customer_upload",
              customerUploadId: uploadId,
              titleSnapshot: titleSnapshot ?? "Uploaded artwork",
              quantity,
              printWidthInches,
              printHeightInches,
              sizeLabel:
                typeof printWidthInches === "number" && typeof printHeightInches === "number"
                  ? formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches)
                  : undefined,
              ...(standardSizePresetKey ? { standardSizePresetKey } : {}),
              sortOrder,
              notes,
              status: "pending",
              addedBy: customerUid,
              createdAt: now,
              updatedAt: now,
            }),
          );
        } else {
          tx.set(
            newItemRef,
            withoutUndefinedFields({
              id: newItemRef.id,
              printRequestId,
              designId: catalogDesignId,
              quantity,
              printWidthInches,
              printHeightInches,
              sizeLabel:
                typeof printWidthInches === "number" && typeof printHeightInches === "number"
                  ? formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches)
                  : undefined,
              ...(standardSizePresetKey ? { standardSizePresetKey } : {}),
              sortOrder,
              notes,
              status: "pending",
              addedBy: customerUid,
              createdAt: now,
              updatedAt: now,
            }),
          );
        }

        if (insertOrder.sourceSortOrderUpdate !== undefined) {
          tx.update(itemRef, {
            sortOrder: insertOrder.sourceSortOrderUpdate,
            updatedAt: now,
          });
        }

        // Sanity: upload duplicates must never look like catalog increments.
        if (
          shouldIncrementDesignRequestCount({
            sourceType,
            designId,
            customerUploadId,
          }) &&
          sourceType === "customer_upload"
        ) {
          throw internal("Upload duplicate incorrectly flagged for design requestCount.");
        }

        const currentItemCount =
          typeof requestData.itemCount === "number" && Number.isFinite(requestData.itemCount)
            ? Math.max(0, Math.floor(requestData.itemCount))
            : 0;

        tx.update(requestRef, {
          itemCount: currentItemCount + 1,
          updatedBy: customerUid,
          updatedAt: now,
        });
      });

      return {
        itemId: createdItemId,
        printRequestId,
        sourceType,
        ...(designId ? { designId } : {}),
        ...(customerUploadId ? { customerUploadId } : {}),
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
