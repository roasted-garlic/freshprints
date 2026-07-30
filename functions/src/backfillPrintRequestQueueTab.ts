import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { BACKFILL_PRINT_REQUEST_QUEUE_TAB_CONFIRMATION_PHRASE } from "../../packages/shared/src/types/admin/backfillPrintRequestQueueTab.types";
import { isOperationalWipeAllowedProjectId } from "../../packages/shared/src/types/admin/wipeOperationalTestData.types";
import { computePrintRequestQueueTab } from "../../packages/shared/src/utils/printRequestQueueTabRecompute";

import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

const BATCH_LIMIT = 400;
const BACKFILL_CONFIRMATION_PHRASE = BACKFILL_PRINT_REQUEST_QUEUE_TAB_CONFIRMATION_PHRASE;

/**
 * One-time migration: populates `printRequests/{id}.queueTab` for documents that predate the
 * `onPrintRequestQueueTabInputWritten`/`onShowAllocationQueueTabInputWritten` triggers (Wave C
 * hydration remediation, 2026-07-25). Not run automatically — a human checkpoint per this
 * repository's workflow rules; the owner must invoke this explicitly and only after the two new
 * triggers are deployed (otherwise newly-created/updated requests would already have a correct
 * `queueTab` and this call becomes a safe no-op for them).
 *
 * Resumable: paginates by `__name__` cursor, bounded to `BATCH_LIMIT` requests read per page, one
 * batch commit per page. Supports `dryRun` (compute + report, write nothing) and an explicit
 * `startAfterRequestId` so a partial run can continue without re-scanning already-migrated
 * documents. Cost per invocation: O(one page of requests) + O(that page's own items/allocations,
 * chunked) — never a full items/allocations corpus scan.
 */
export const backfillPrintRequestQueueTab = onCall(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId || !isOperationalWipeAllowedProjectId(projectId)) {
      throw permissionDenied("This migration can only run against an approved development project.");
    }

    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || caller.role !== "owner") {
      throw permissionDenied("Only owners can run this migration.");
    }

    const data = (request.data ?? {}) as {
      confirmationPhrase?: unknown;
      dryRun?: unknown;
      startAfterRequestId?: unknown;
      pageLimit?: unknown;
    };

    if (data.confirmationPhrase !== BACKFILL_CONFIRMATION_PHRASE) {
      throw invalidArgument(`Confirmation phrase must be exactly "${BACKFILL_CONFIRMATION_PHRASE}".`);
    }

    const dryRun = data.dryRun === true;
    const startAfterRequestId =
      typeof data.startAfterRequestId === "string" ? data.startAfterRequestId.trim() : "";
    const pageLimit =
      typeof data.pageLimit === "number" && Number.isFinite(data.pageLimit) && data.pageLimit > 0
        ? Math.min(Math.trunc(data.pageLimit), BATCH_LIMIT)
        : BATCH_LIMIT;

    let requestsQuery = adminDb
      .collection("printRequests")
      .orderBy("__name__")
      .limit(pageLimit);

    if (startAfterRequestId) {
      const startAfterSnapshot = await adminDb
        .collection("printRequests")
        .doc(startAfterRequestId)
        .get();
      if (!startAfterSnapshot.exists) {
        throw failedPrecondition("startAfterRequestId does not refer to an existing print request.");
      }
      requestsQuery = requestsQuery.startAfter(startAfterSnapshot);
    }

    const snapshot = await requestsQuery.get();

    let scanned = 0;
    let alreadyCorrect = 0;
    let updated = 0;
    let missingItemsOrAllocationsReads = 0;
    const batch = adminDb.batch();
    let batchWrites = 0;

    for (const requestDoc of snapshot.docs) {
      scanned += 1;
      const requestData = requestDoc.data();
      const status =
        typeof requestData.status === "string"
          ? (requestData.status as "draft" | "active" | "editing" | "completed" | "archived")
          : "draft";

      const [itemsSnapshot, allocationsSnapshot] = await Promise.all([
        adminDb.collection("printRequestItems").where("printRequestId", "==", requestDoc.id).get(),
        adminDb.collection("showAllocations").where("printRequestId", "==", requestDoc.id).get(),
      ]);
      missingItemsOrAllocationsReads += 2;

      const nextQueueTab = computePrintRequestQueueTab({
        status,
        items: itemsSnapshot.docs.map((doc) => ({
          quantity: typeof doc.data().quantity === "number" ? doc.data().quantity : 0,
        })),
        allocations: allocationsSnapshot.docs.map((doc) => ({
          allocatedQuantity:
            typeof doc.data().allocatedQuantity === "number" ? doc.data().allocatedQuantity : 0,
          status: typeof doc.data().status === "string" ? doc.data().status : "canceled",
        })),
      });

      if (requestData.queueTab === nextQueueTab) {
        alreadyCorrect += 1;
        continue;
      }

      updated += 1;
      if (!dryRun) {
        batch.update(requestDoc.ref, { queueTab: nextQueueTab, updatedAt: FieldValue.serverTimestamp() });
        batchWrites += 1;
      }
    }

    if (!dryRun && batchWrites > 0) {
      await batch.commit();
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return {
      dryRun,
      scanned,
      alreadyCorrect,
      updated,
      itemsAndAllocationsReadOperations: missingItemsOrAllocationsReads,
      hasMore: snapshot.docs.length === pageLimit,
      nextStartAfterRequestId: lastDoc ? lastDoc.id : null,
    };
  },
);
