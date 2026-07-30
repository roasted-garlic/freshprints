import { Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import type { ListPortalAllocatableShowsResponse } from "../../packages/shared/src/types/portal/listPortalAllocatableShows.types";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";
import { canAcceptNewShowAllocations } from "../../packages/shared/src/utils/showAllocationEligibility";
import { filterShowsAvailableForAllocation } from "../../packages/shared/src/utils/showScheduleGrouping";
import {
  getPortalQueueCutoffAt,
  isPastPortalQueueCutoff,
} from "../../packages/shared/src/utils/showQueueCutoff";
import { adminDb } from "./lib/admin";
import { internal, unauthenticated } from "./lib/errors";
import { loadPortalQueueCutoffHours } from "./lib/loadPortalQueueCutoffHours";
import { shouldIncludePortalCalendarShow } from "./lib/portalCalendarShowVisibility";
import { requirePortalCustomer } from "./lib/portalCustomer";

/** Include past shows from the start of (current month − 2) for calendar highlights. */
const PAST_CALENDAR_MONTHS = 2;

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }

  if (error instanceof Error) {
    throw internal(error.message);
  }

  throw internal("Unable to list shows right now.");
}

function resolveProductionStatus(value: unknown): ShowProductionStatus {
  const allowed: ShowProductionStatus[] = [
    "open",
    "full",
    "printing",
    "fully_printed",
    "completed",
    "archived",
    "canceled",
  ];

  if (typeof value === "string" && allowed.includes(value as ShowProductionStatus)) {
    return value as ShowProductionStatus;
  }

  return "open";
}

function pastCalendarWindowStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth() - PAST_CALENDAR_MONTHS, 1);
}

interface InternalAllocatableShow {
  id: string;
  scheduledStartAt: { toDate: () => Date } | undefined;
  scheduledStartAtIso: string | null;
  productionStatus: ShowProductionStatus;
  maxTotalQuantity?: number;
  allocatedQuantity: number;
}

export const listPortalAllocatableShows = onCall(async (request): Promise<ListPortalAllocatableShowsResponse> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }

  try {
    const startedAtMs = Date.now();
    const customer = await requirePortalCustomer(request.auth.uid);

    const now = new Date();
    const pastWindowStart = pastCalendarWindowStart(now);
    const portalQueueCutoffHoursBeforeStart = await loadPortalQueueCutoffHours();

    // Bound scan to calendar window (avoids loading the entire historical collection).
    const snapshot = await adminDb
      .collection("upcomingShows")
      .where("scheduledStartAt", ">=", Timestamp.fromDate(pastWindowStart))
      .get();
    const showDocumentsReturned = snapshot.size;

    const shows: InternalAllocatableShow[] = snapshot.docs.flatMap((showDoc) => {
      const data = showDoc.data();

      if (data.isArchived === true) {
        return [];
      }

      if (data.productionStatus === "canceled" || data.productionStatus === "archived") {
        return [];
      }

      const scheduledStartAt = data.scheduledStartAt as { toDate: () => Date } | undefined;
      const scheduledStartAtIso = scheduledStartAt ? scheduledStartAt.toDate().toISOString() : null;
      const allocatedQuantity =
        typeof data.allocatedQuantity === "number" && data.allocatedQuantity >= 0 ? data.allocatedQuantity : 0;

      return [
        {
          id: showDoc.id,
          scheduledStartAt,
          scheduledStartAtIso,
          productionStatus: resolveProductionStatus(data.productionStatus),
          maxTotalQuantity:
            typeof data.maxTotalQuantity === "number" && data.maxTotalQuantity >= 0
              ? data.maxTotalQuantity
              : undefined,
          allocatedQuantity,
        },
      ];
    });

    const capacityEligible = filterShowsAvailableForAllocation(shows, now).filter((show) =>
      canAcceptNewShowAllocations(show, now),
    );
    const allocatable = capacityEligible.filter(
      (show) => !isPastPortalQueueCutoff(show.scheduledStartAt, now, portalQueueCutoffHoursBeforeStart),
    );
    const allocatableIds = new Set(allocatable.map((show) => show.id));
    const pastCutoffUpcomingIds = new Set(
      capacityEligible
        .filter((show) => isPastPortalQueueCutoff(show.scheduledStartAt, now, portalQueueCutoffHoursBeforeStart))
        .map((show) => show.id),
    );

    const calendarShows = shows.filter((show) =>
      shouldIncludePortalCalendarShow({
        show,
        allocatableIds,
        pastCutoffUpcomingIds,
        now,
        pastWindowStart,
      }),
    );

    const customerQtyByShowId = new Map<string, number>();
    let allocationDocumentsReturned = 0;
    if (calendarShows.length > 0) {
      const customerAllocationsSnap = await adminDb
        .collection("showAllocations")
        .where("customerId", "==", customer.customerId)
        .get();
      allocationDocumentsReturned = customerAllocationsSnap.size;

      for (const docSnap of customerAllocationsSnap.docs) {
        const data = docSnap.data();
        if (data.status === "canceled") {
          continue;
        }
        const showId = typeof data.upcomingShowId === "string" ? data.upcomingShowId : "";
        if (!showId) {
          continue;
        }
        const qty =
          typeof data.allocatedQuantity === "number" && Number.isFinite(data.allocatedQuantity)
            ? Math.max(0, Math.floor(data.allocatedQuantity))
            : 0;
        if (qty <= 0) {
          continue;
        }
        customerQtyByShowId.set(showId, (customerQtyByShowId.get(showId) ?? 0) + qty);
      }
    }

    const responseShows = calendarShows
      .map((show) => {
        const pastCutoff = pastCutoffUpcomingIds.has(show.id);
        const cutoffAt = getPortalQueueCutoffAt(show.scheduledStartAt, portalQueueCutoffHoursBeforeStart);
        return {
          id: show.id,
          scheduledStartAt: show.scheduledStartAtIso,
          productionStatus: show.productionStatus,
          maxTotalQuantity: show.maxTotalQuantity,
          allocatedQuantity: show.allocatedQuantity,
          customerAllocatedQuantity: customerQtyByShowId.get(show.id) ?? 0,
          isAllocatable: allocatableIds.has(show.id),
          isPastQueueCutoff: pastCutoff,
          queueCutoffAt: cutoffAt ? cutoffAt.toISOString() : null,
        };
      })
      .sort((left, right) => {
        if (!left.scheduledStartAt && !right.scheduledStartAt) {
          return 0;
        }

        if (!left.scheduledStartAt) {
          return 1;
        }

        if (!right.scheduledStartAt) {
          return -1;
        }

        return left.scheduledStartAt.localeCompare(right.scheduledStartAt);
      });

    const result = {
      shows: responseShows,
      portalQueueCutoffHoursBeforeStart,
    };
    if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
      const allocationQueryRan = calendarShows.length > 0;
      console.info("portal-allocatable-shows-accounting", {
        functionName: "listPortalAllocatableShows",
        eventClassification: "explicit-show-picker-open",
        readOperations: 4 + (allocationQueryRan ? 1 : 0),
        documentsReturned: 3 + showDocumentsReturned + allocationDocumentsReturned,
        approximateBillableReads:
          3 +
          Math.max(1, showDocumentsReturned) +
          (allocationQueryRan ? Math.max(1, allocationDocumentsReturned) : 0),
        showDocumentsReturned,
        allocationDocumentsReturned,
        writes: 0,
        deletes: 0,
        transactionAttempts: 0,
        batchSize: 0,
        retryNumber: 0,
        duplicateSkip: false,
        durationMs: Date.now() - startedAtMs,
        outcome: "success",
      });
    }
    return result;
  } catch (error) {
    mapHttpsError(error);
  }
});
