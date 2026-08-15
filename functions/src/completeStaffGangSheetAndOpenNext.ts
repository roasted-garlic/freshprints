import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { formatStaffGangSheetTitle } from "../../packages/shared/src/utils/staffGangSheet";

import { loadCallerProfile, assertStaffCaller } from "./lib/caller";
import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
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
  if (error instanceof Error && "code" in error) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to complete Staff Gang Sheet right now.");
}

/**
 * Completes a Staff Gang Sheet cycle and opens N+1 for the same assignee.
 * Trusted callable: Rules keep Staff Gang Sheet create/assign owner/admin-only, so helpers
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
        throw invalidArgument("A Staff Gang Sheet ID is required.");
      }

      const showRef = adminDb.collection("upcomingShows").doc(upcomingShowId);

      return await adminDb.runTransaction(async (transaction) => {
        const showSnap = await transaction.get(showRef);
        if (!showSnap.exists) {
          throw invalidArgument("Staff Gang Sheet not found.");
        }

        const data = showSnap.data()!;
        if (data.source !== "staff_gang_sheet") {
          throw failedPrecondition("Only Staff Gang Sheets can be completed with auto-cycle.");
        }

        const assignedStaffUserId =
          typeof data.assignedStaffUserId === "string" ? data.assignedStaffUserId.trim() : "";
        const cycleNumber =
          typeof data.staffGangSheetCycleNumber === "number" ? data.staffGangSheetCycleNumber : NaN;

        if (!assignedStaffUserId || !Number.isInteger(cycleNumber) || cycleNumber < 1) {
          throw failedPrecondition("Staff Gang Sheet assignment fields are incomplete.");
        }

        const isOwnerOrAdmin = caller.role === "owner" || caller.role === "admin";
        if (!isOwnerOrAdmin && assignedStaffUserId !== caller.id) {
          throw permissionDenied("You can only complete Staff Gang Sheets assigned to you.");
        }

        const openLaneQuery = adminDb
          .collection("upcomingShows")
          .where("source", "==", "staff_gang_sheet")
          .where("assignedStaffUserId", "==", assignedStaffUserId)
          .where("productionStatus", "==", "open");

        const openLaneSnap = await transaction.get(openLaneQuery);
        const openLanes = openLaneSnap.docs.filter((docSnap) => docSnap.id !== upcomingShowId);

        // Idempotent retry: current already completed and exactly one open successor exists.
        if (data.productionStatus === "completed") {
          if (openLanes.length === 1) {
            const next = openLanes[0]!;
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
            "This Staff Gang Sheet is already completed, but the next open cycle could not be resolved.",
          );
        }

        if (
          data.productionStatus !== "open" &&
          data.productionStatus !== "full" &&
          data.productionStatus !== "printing"
        ) {
          throw failedPrecondition("This Staff Gang Sheet cannot be completed in its current state.");
        }

        if (openLanes.length > 0) {
          throw failedPrecondition(
            "Another open Staff Gang Sheet already exists for this assignee. Resolve it before completing.",
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
          // Fold active segment if present (best-effort; Admin TX may not have client clock fold).
          completedUpdate.accumulatedPrintMs = data.accumulatedPrintMs;
        }

        transaction.update(showRef, completedUpdate);

        transaction.set(nextRef, {
          source: "staff_gang_sheet",
          title: formatStaffGangSheetTitle(nextCycleNumber),
          status: "scheduled",
          syncStatus: "idle",
          isArchived: false,
          productionStatus: "open",
          maxQuantityOverridden: false,
          allocatedQuantity: 0,
          accumulatedPrintMs: 0,
          assignedStaffUserId,
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
