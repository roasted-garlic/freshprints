import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  formatStaffGangSheetTitle,
  STAFF_GANG_SHEET_ACTIVE_PRODUCTION_STATUSES,
} from "../../packages/shared/src/utils/staffGangSheet";

import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

export interface CreateInitialStaffGangSheetResponse {
  showId: string;
  cycleNumber: number;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to create Staff Gang Sheet right now.");
}

/**
 * Owner/admin: create the initial shared Staff Gang Sheet (#1 by default) with
 * transactional uniqueness across open/full/printing Staff sheets.
 */
export const createInitialStaffGangSheet = onCall(
  async (request): Promise<CreateInitialStaffGangSheetResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      if (caller.role !== "owner" && caller.role !== "admin") {
        throw permissionDenied("Only owners and admins can create Staff Gang Sheets.");
      }

      const cycleNumber =
        typeof request.data?.staffGangSheetCycleNumber === "number"
          ? request.data.staffGangSheetCycleNumber
          : 1;
      if (!Number.isInteger(cycleNumber) || cycleNumber < 1) {
        throw failedPrecondition("Staff Gang Sheet cycle number must be a positive integer.");
      }

      return await adminDb.runTransaction(async (transaction) => {
        for (const productionStatus of STAFF_GANG_SHEET_ACTIVE_PRODUCTION_STATUSES) {
          const activeQuery = adminDb
            .collection("upcomingShows")
            .where("source", "==", "staff_gang_sheet")
            .where("productionStatus", "==", productionStatus);
          const activeSnap = await transaction.get(activeQuery);
          if (!activeSnap.empty) {
            const existing = activeSnap.docs[0]!;
            const existingCycle =
              typeof existing.data().staffGangSheetCycleNumber === "number"
                ? existing.data().staffGangSheetCycleNumber
                : 1;
            throw failedPrecondition(
              `An active Staff Gang Sheet already exists (${formatStaffGangSheetTitle(existingCycle)}). Complete it before creating another.`,
            );
          }
        }

        const showRef = adminDb.collection("upcomingShows").doc();
        const now = FieldValue.serverTimestamp();
        transaction.set(showRef, {
          source: "staff_gang_sheet",
          title: formatStaffGangSheetTitle(cycleNumber),
          status: "scheduled",
          syncStatus: "idle",
          isArchived: false,
          productionStatus: "open",
          maxQuantityOverridden: false,
          allocatedQuantity: 0,
          accumulatedPrintMs: 0,
          staffGangSheetCycleNumber: cycleNumber,
          createdBy: caller.id,
          updatedBy: caller.id,
          createdAt: now,
          updatedAt: now,
        });

        return { showId: showRef.id, cycleNumber };
      });
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
