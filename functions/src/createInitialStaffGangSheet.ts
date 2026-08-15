import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY,
  formatStaffGangSheetTitle,
  isStaffGangSheetActiveProductionStatus,
  resolveNextStaffGangSheetCycleNumber,
} from "../../packages/shared/src/utils/staffGangSheet";

import { loadCallerProfile, assertStaffCaller } from "./lib/caller";
import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  unauthenticated,
} from "./lib/errors";

export interface CreateInitialStaffGangSheetResponse {
  showId: string;
  cycleNumber: number;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to create Internal Gang Sheet right now.");
}

/**
 * Staff: create a shared Internal Gang Sheet when none is active.
 * Cycle number is always max(existing)+1 (never reuses #1 after history exists).
 * Uniqueness: at most one open/full/printing Staff sheet.
 */
export const createInitialStaffGangSheet = onCall(
  async (request): Promise<CreateInitialStaffGangSheetResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);

      return await adminDb.runTransaction(async (transaction) => {
        const staffQuery = adminDb.collection("upcomingShows").where("source", "==", "staff_gang_sheet");
        const staffSnap = await transaction.get(staffQuery);

        const activeExisting = staffSnap.docs.find((docSnap) =>
          isStaffGangSheetActiveProductionStatus(docSnap.data().productionStatus),
        );
        if (activeExisting) {
          const existingCycle =
            typeof activeExisting.data().staffGangSheetCycleNumber === "number"
              ? activeExisting.data().staffGangSheetCycleNumber
              : 1;
          throw failedPrecondition(
            `An active Internal Gang Sheet already exists (${formatStaffGangSheetTitle(existingCycle)}). Complete it before creating another.`,
          );
        }

        const cycleNumber = resolveNextStaffGangSheetCycleNumber(
          staffSnap.docs.map((docSnap) => docSnap.data().staffGangSheetCycleNumber),
        );

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
          maxTotalQuantity: DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY,
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
