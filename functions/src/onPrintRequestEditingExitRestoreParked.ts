import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

import { adminDb } from "./lib/admin";
import { applyRestoreParkedDraftInTransaction } from "./lib/portalContinuableParking";

/**
 * Safety net: restore parked draft when a request exits editing status
 * but still has parksDraftPrintRequestId set (indicating restore was missed).
 */
export const onPrintRequestEditingExitRestoreParked = onDocumentUpdated(
  "printRequests/{printRequestId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    
    if (!before || !after) {
      return;
    }

    const beforeStatus = typeof before.status === "string" ? before.status : "draft";
    const afterStatus = typeof after.status === "string" ? after.status : "draft";
    const beforeParkedDraftId = typeof before.parksDraftPrintRequestId === "string" 
      ? before.parksDraftPrintRequestId 
      : undefined;
    const afterParkedDraftId = typeof after.parksDraftPrintRequestId === "string" 
      ? after.parksDraftPrintRequestId 
      : undefined;

    // Only trigger if request was editing, is no longer editing, and still has a parked draft reference
    if (beforeStatus === "editing" && afterStatus !== "editing" && beforeParkedDraftId && afterParkedDraftId) {
      logger.info("Detected editing exit with unreleased parked draft, triggering restore", {
        printRequestId: event.params.printRequestId,
        beforeStatus,
        afterStatus,
        parkedDraftId: afterParkedDraftId,
      });

      try {
        await adminDb.runTransaction(async (transaction) => {
          const requestRef = adminDb.collection("printRequests").doc(event.params.printRequestId);
          
          await applyRestoreParkedDraftInTransaction(transaction, {
            editingRequestRef: requestRef,
            editingData: { ...after, status: afterStatus },
            actorId: "system",
          });
        });

        logger.info("Successfully restored parked draft via safety net", {
          printRequestId: event.params.printRequestId,
          restoredDraftId: afterParkedDraftId,
        });
      } catch (error) {
        logger.error("Failed to restore parked draft in safety net", {
          printRequestId: event.params.printRequestId,
          parkedDraftId: afterParkedDraftId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  },
);