import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

import { adminDb } from "./lib/admin";
import { applyRestoreParkedDraftInTransaction } from "./lib/portalContinuableParking";

/**
 * Whether the editing-exit safety net should attempt a parked-draft restore.
 *
 * Studio allocate clears `parksDraftPrintRequestId` in the same write that exits `editing`,
 * so requiring the after-doc to still hold the pointer silently skipped restore.
 */
export function shouldRestoreParkedDraftOnEditingExit(input: {
  beforeStatus: string;
  afterStatus: string;
  beforeParkedDraftId: string | undefined;
}): boolean {
  return (
    input.beforeStatus === "editing" &&
    input.afterStatus !== "editing" &&
    Boolean(input.beforeParkedDraftId?.trim())
  );
}

/**
 * Safety net: restore parked draft when a request exits editing status
 * while it still pointed at a parked Working draft (including when the exit write
 * already cleared `parksDraftPrintRequestId`).
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
    const beforeParkedDraftId =
      typeof before.parksDraftPrintRequestId === "string"
        ? before.parksDraftPrintRequestId.trim()
        : undefined;

    if (
      !shouldRestoreParkedDraftOnEditingExit({
        beforeStatus,
        afterStatus,
        beforeParkedDraftId,
      })
    ) {
      return;
    }

    logger.info("Detected editing exit with parked draft pointer, triggering restore", {
      printRequestId: event.params.printRequestId,
      beforeStatus,
      afterStatus,
      parkedDraftId: beforeParkedDraftId,
    });

    try {
      await adminDb.runTransaction(async (transaction) => {
        const requestRef = adminDb.collection("printRequests").doc(event.params.printRequestId);

        await applyRestoreParkedDraftInTransaction(transaction, {
          editingRequestRef: requestRef,
          editingData: {
            status: afterStatus,
            parksDraftPrintRequestId: beforeParkedDraftId,
          },
          actorId: "system",
        });
      });

      logger.info("Successfully restored parked draft via safety net", {
        printRequestId: event.params.printRequestId,
        restoredDraftId: beforeParkedDraftId,
      });
    } catch (error) {
      logger.error("Failed to restore parked draft in safety net", {
        printRequestId: event.params.printRequestId,
        parkedDraftId: beforeParkedDraftId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
