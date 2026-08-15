import { FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { shouldIncrementDesignRequestCount } from "../../packages/shared/src/utils/printRequestItemSource";

import { adminDb } from "./lib/admin";
import { transitionCustomerUploadToStaffReviewIfEligible } from "./lib/customerUploadCatalogConfirmation";

/**
 * On show allocation create:
 * 1. Customer-upload source → idempotently advance upload to Studio Pending
 *    (`not_eligible` → `pending_staff_review`). Covers Studio client allocate
 *    (Rules forbid client writes to customerUploads) and complements Portal queue TX.
 * 2. Catalog design source → bump Recently Requested / show-add popularity.
 *
 * De-allocation does not rewind catalogReviewStatus (one-way intake).
 * Never creates Designs or auto Send to AI.
 */
export const onShowAllocationCreated = onDocumentCreated(
  "showAllocations/{allocationId}",
  async (event) => {
    const data = event.data?.data();
    const allocationRef = event.data?.ref;
    if (!data || !allocationRef) {
      return;
    }

    if (data.status === "canceled") {
      return;
    }

    if (data.sourceType === "customer_upload") {
      const customerUploadId =
        typeof data.customerUploadId === "string" ? data.customerUploadId.trim() : "";
      if (customerUploadId) {
        await transitionCustomerUploadToStaffReviewIfEligible(customerUploadId);
      }
      return;
    }

    const upcomingShowId =
      typeof data.upcomingShowId === "string" ? data.upcomingShowId.trim() : "";
    if (!upcomingShowId) {
      return;
    }

    // Staff Gang Sheet allocations must not bump customer-facing Recently Requested / popularity.
    const showSnap = await adminDb.collection("upcomingShows").doc(upcomingShowId).get();
    if (showSnap.data()?.source === "staff_gang_sheet") {
      return;
    }

    if (
      !shouldIncrementDesignRequestCount({
        sourceType: data.sourceType,
        designId: typeof data.designId === "string" ? data.designId : undefined,
        customerUploadId:
          typeof data.customerUploadId === "string" ? data.customerUploadId : undefined,
      })
    ) {
      return;
    }

    const designId = String(data.designId).trim();
    const designRef = adminDb.collection("designs").doc(designId);

    // Cheap redelivery guard mirroring onPrintRequestItemCreated: mark the small triggering
    // allocation document itself so a redelivered CloudEvent for the same allocation cannot
    // double-count `showAddCount` (Wave C comprehensive-audit amendment, 2026-07-24).
    await adminDb.runTransaction(async (transaction) => {
      const [designSnapshot, allocationSnapshot] = await Promise.all([
        transaction.get(designRef),
        transaction.get(allocationRef),
      ]);
      if (!designSnapshot.exists) {
        return;
      }
      if (allocationSnapshot.data()?.showAddCountApplied === true) {
        return;
      }
      transaction.update(designRef, {
        showAddCount: FieldValue.increment(1),
        lastAddedToShowAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(allocationRef, { showAddCountApplied: true });
    });
  },
);
