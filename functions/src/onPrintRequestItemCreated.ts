import { FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { shouldIncrementDesignRequestCount } from "../../packages/shared/src/utils/printRequestItemSource";

import { adminDb } from "./lib/admin";

/**
 * Keeps cart-add popularity (`requestCount` / `lastRequestedAt`) for Popular.
 * Recently Requested uses `lastAddedToShowAt` via onShowAllocationCreated instead —
 * Working-draft adds alone must not appear there.
 * Single source of truth — Studio must not also client-increment these fields.
 * Customer-upload items must not increment catalog requestCount.
 */
export const onPrintRequestItemCreated = onDocumentCreated(
  "printRequestItems/{itemId}",
  async (event) => {
    const startedAtMs = Date.now();
    const data = event.data?.data();
    const itemRef = event.data?.ref;
    if (!data || !itemRef) {
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
    try {
      // Cheap redelivery guard: Eventarc is at-least-once, so a redelivered create event for the
      // same item must not double-count `requestCount`. Rather than persisting a new field on the
      // (potentially hot, contended) design document, mark the small triggering item document itself
      // inside the same transaction that reads it — a second delivery sees the marker and skips the
      // increment (Wave C comprehensive-audit amendment, 2026-07-24).
      const duplicateSkip = await adminDb.runTransaction(async (transaction) => {
        const itemSnapshot = await transaction.get(itemRef);
        if (itemSnapshot.data()?.requestCountApplied === true) {
          return true;
        }
        transaction.update(designRef, {
          requestCount: FieldValue.increment(1),
          lastRequestedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(itemRef, { requestCountApplied: true });
        return false;
      });
      if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
        console.info("portal-design-request-analytics-accounting", {
          functionName: "onPrintRequestItemCreated",
          eventClassification: "catalog-item-created",
          readOperations: 1,
          documentsReturned: 1,
          writes: duplicateSkip ? 0 : 2,
          deletes: 0,
          transactionAttempts: 1,
          batchSize: 0,
          retryNumber: 0,
          duplicateSkip,
          durationMs: Date.now() - startedAtMs,
          outcome: "success",
        });
      }
    } catch (error) {
      if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
        console.info("portal-design-request-analytics-accounting", {
          functionName: "onPrintRequestItemCreated",
          eventClassification: "catalog-item-created",
          readOperations: 1,
          documentsReturned: 0,
          writes: 0,
          deletes: 0,
          transactionAttempts: 1,
          batchSize: 0,
          retryNumber: 0,
          duplicateSkip: false,
          durationMs: Date.now() - startedAtMs,
          outcome: "failure",
          failureCode: "design-update-failed",
        });
      }
      throw error;
    }
  },
);
