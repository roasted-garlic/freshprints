import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
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
import { requirePortalCustomer } from "./lib/portalCustomer";

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

/**
 * Customer-authoritative duplicate for Portal print request items.
 * Upload-backed items are Admin-created (same customerUploadId, no Storage clone).
 * Catalog-backed items copy designId. Does not increment designs.requestCount for uploads
 * (onPrintRequestItemCreated already gates via shouldIncrementDesignRequestCount).
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

      await adminDb.runTransaction(async (tx) => {
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);
        const itemRef = adminDb.collection("printRequestItems").doc(itemId);
        const [requestSnap, itemSnap] = await Promise.all([tx.get(requestRef), tx.get(itemRef)]);

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
        const sortOrder =
          typeof itemData.sortOrder === "number" && Number.isFinite(itemData.sortOrder)
            ? itemData.sortOrder + 0.5
            : undefined;
        const notes =
          typeof itemData.notes === "string" && itemData.notes.trim()
            ? itemData.notes.trim()
            : undefined;
        const titleSnapshot =
          typeof itemData.titleSnapshot === "string" && itemData.titleSnapshot.trim()
            ? itemData.titleSnapshot.trim()
            : undefined;

        const isUpload =
          itemData.sourceType === "customer_upload" ||
          (typeof itemData.customerUploadId === "string" &&
            itemData.customerUploadId.trim().length > 0);

        const newItemRef = adminDb.collection("printRequestItems").doc();
        createdItemId = newItemRef.id;
        const now = FieldValue.serverTimestamp();

        if (isUpload) {
          const uploadId =
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
              sortOrder,
              notes,
              status: "pending",
              addedBy: customerUid,
              createdAt: now,
              updatedAt: now,
            }),
          );
        } else {
          const catalogDesignId =
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
              sortOrder,
              notes,
              status: "pending",
              addedBy: customerUid,
              createdAt: now,
              updatedAt: now,
            }),
          );
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
