import { FieldValue, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY,
  formatStaffGangSheetTitle,
  STAFF_GANG_SHEET_ACTIVE_PRODUCTION_STATUSES,
} from "../../packages/shared/src/utils/staffGangSheet";

import { loadCallerProfile, assertStaffCaller } from "./lib/caller";
import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  unauthenticated,
} from "./lib/errors";

export interface CompleteStaffGangSheetAndOpenNextRequest {
  upcomingShowId: string;
}

export interface CompleteStaffGangSheetAndOpenNextResponse {
  completedShowId: string;
  nextShowId: string;
  nextCycleNumber: number;
  alreadyCompleted: boolean;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to complete Internal Gang Sheet right now.");
}

async function loadActiveStaffGangSheetsExcluding(
  transaction: Transaction,
  excludeShowId: string,
): Promise<QueryDocumentSnapshot[]> {
  const activeDocs: QueryDocumentSnapshot[] = [];
  for (const productionStatus of STAFF_GANG_SHEET_ACTIVE_PRODUCTION_STATUSES) {
    const activeQuery = adminDb
      .collection("upcomingShows")
      .where("source", "==", "staff_gang_sheet")
      .where("productionStatus", "==", productionStatus);
    const snap = await transaction.get(activeQuery);
    for (const docSnap of snap.docs) {
      if (docSnap.id !== excludeShowId) {
        activeDocs.push(docSnap);
      }
    }
  }
  return activeDocs;
}

/**
 * Completes a shared Internal Gang Sheet cycle and opens N+1 (no assignee).
 * Trusted callable: Rules keep Internal Gang Sheet create owner/admin-only, so helpers
 * cannot create the next cycle via the client SDK.
 */
export const completeStaffGangSheetAndOpenNext = onCall(
  async (request): Promise<CompleteStaffGangSheetAndOpenNextResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);

      const upcomingShowId =
        typeof request.data?.upcomingShowId === "string" ? request.data.upcomingShowId.trim() : "";
      if (!upcomingShowId) {
        throw invalidArgument("An Internal Gang Sheet ID is required.");
      }

      const showRef = adminDb.collection("upcomingShows").doc(upcomingShowId);

      return await adminDb.runTransaction(async (transaction) => {
        const showSnap = await transaction.get(showRef);
        if (!showSnap.exists) {
          throw invalidArgument("Internal Gang Sheet not found.");
        }

        const data = showSnap.data()!;
        if (data.source !== "staff_gang_sheet") {
          throw failedPrecondition("Only Internal Gang Sheets can be completed with auto-cycle.");
        }

        const cycleNumber =
          typeof data.staffGangSheetCycleNumber === "number" ? data.staffGangSheetCycleNumber : NaN;

        if (!Number.isInteger(cycleNumber) || cycleNumber < 1) {
          throw failedPrecondition("Internal Gang Sheet cycle fields are incomplete.");
        }

        const allocatedQuantity =
          typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0;
        if (allocatedQuantity <= 0 && data.productionStatus !== "completed") {
          throw failedPrecondition(
            "Add at least one print request to this Internal Gangsheet before marking it complete.",
          );
        }

        const openSuccessorQuery = adminDb
          .collection("upcomingShows")
          .where("source", "==", "staff_gang_sheet")
          .where("productionStatus", "==", "open");
        const openSuccessorSnap = await transaction.get(openSuccessorQuery);
        const openSuccessors = openSuccessorSnap.docs.filter((docSnap) => docSnap.id !== upcomingShowId);

        // Idempotent retry: current already completed and exactly one open successor exists.
        if (data.productionStatus === "completed") {
          if (openSuccessors.length === 1) {
            const next = openSuccessors[0]!;
            const nextCycle =
              typeof next.data().staffGangSheetCycleNumber === "number"
                ? next.data().staffGangSheetCycleNumber
                : cycleNumber + 1;
            return {
              completedShowId: upcomingShowId,
              nextShowId: next.id,
              nextCycleNumber: nextCycle,
              alreadyCompleted: true,
            };
          }
          throw failedPrecondition(
            openSuccessors.length === 0
              ? "This Internal Gang Sheet is already completed, but no open successor was found."
              : "This Internal Gang Sheet is already completed, but multiple open Internal Gang Sheets exist. Resolve the extras before retrying.",
          );
        }

        if (
          data.productionStatus !== "open" &&
          data.productionStatus !== "full" &&
          data.productionStatus !== "printing"
        ) {
          throw failedPrecondition("This Internal Gang Sheet cannot be completed in its current state.");
        }

        const otherActive = await loadActiveStaffGangSheetsExcluding(transaction, upcomingShowId);
        if (otherActive.length > 0) {
          throw failedPrecondition(
            "Another active Internal Gang Sheet already exists. Resolve it before completing this one.",
          );
        }

        const nextCycleNumber = cycleNumber + 1;
        const nextRef = adminDb.collection("upcomingShows").doc();
        const now = FieldValue.serverTimestamp();

        const completedUpdate: Record<string, unknown> = {
          productionStatus: "completed",
          printFinishedAt: now,
          printFinishedBy: caller.id,
          activePrintStartedAt: FieldValue.delete(),
          printPausedAt: FieldValue.delete(),
          updatedBy: caller.id,
          updatedAt: now,
        };

        if (data.productionStatus === "printing" && typeof data.accumulatedPrintMs === "number") {
          completedUpdate.accumulatedPrintMs = data.accumulatedPrintMs;
        }

        transaction.update(showRef, completedUpdate);

        // Shared next cycle — do not write assignedStaffUserId.
        transaction.set(nextRef, {
          source: "staff_gang_sheet",
          title: formatStaffGangSheetTitle(nextCycleNumber),
          status: "scheduled",
          syncStatus: "idle",
          isArchived: false,
          productionStatus: "open",
          maxQuantityOverridden: false,
          maxTotalQuantity: DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY,
          allocatedQuantity: 0,
          accumulatedPrintMs: 0,
          staffGangSheetCycleNumber: nextCycleNumber,
          createdBy: caller.id,
          updatedBy: caller.id,
          createdAt: now,
          updatedAt: now,
        });

        return {
          completedShowId: upcomingShowId,
          nextShowId: nextRef.id,
          nextCycleNumber,
          alreadyCompleted: false,
        };
      });
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
