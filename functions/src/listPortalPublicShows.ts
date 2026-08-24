import { Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import type { ListPortalPublicShowsResponse } from "../../packages/shared/src/types/portal/listPortalPublicShows.types";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";
import { canAcceptNewShowAllocations } from "../../packages/shared/src/utils/showAllocationEligibility";
import { filterShowsAvailableForAllocation } from "../../packages/shared/src/utils/showScheduleGrouping";
import { isPastPortalQueueCutoff } from "../../packages/shared/src/utils/showQueueCutoff";

import { adminDb } from "./lib/admin";
import { internal } from "./lib/errors";
import { loadPortalQueueCutoffHours } from "./lib/loadPortalQueueCutoffHours";
import { countUniquePublicCatalogDesignsByShowId } from "./lib/portalShowCatalogDesigns";
import { shouldIncludePortalCalendarShow } from "./lib/portalCalendarShowVisibility";

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

/**
 * Public Portal show calendar for Show Designs — no auth required.
 * Returns schedule metadata and unique public catalog design counts only.
 */
export const listPortalPublicShows = onCall(async (): Promise<ListPortalPublicShowsResponse> => {
  try {
    const now = new Date();
    const pastWindowStart = pastCalendarWindowStart(now);
    const portalQueueCutoffHoursBeforeStart = await loadPortalQueueCutoffHours();

    const snapshot = await adminDb
      .collection("upcomingShows")
      .where("scheduledStartAt", ">=", Timestamp.fromDate(pastWindowStart))
      .get();

    const shows = snapshot.docs.flatMap((showDoc) => {
      const data = showDoc.data();

      if (data.isArchived === true) {
        return [];
      }

      if (data.source === "staff_gang_sheet") {
        return [];
      }

      if (data.productionStatus === "canceled" || data.productionStatus === "archived") {
        return [];
      }

      const scheduledStartAt = data.scheduledStartAt as { toDate: () => Date } | undefined;
      const scheduledStartAtIso = scheduledStartAt ? scheduledStartAt.toDate().toISOString() : null;

      return [
        {
          id: showDoc.id,
          source: typeof data.source === "string" ? data.source : undefined,
          scheduledStartAt,
          scheduledStartAtIso,
          productionStatus: resolveProductionStatus(data.productionStatus),
        },
      ];
    });

    const capacityEligible = filterShowsAvailableForAllocation(shows, now).filter((show) =>
      canAcceptNewShowAllocations(show, now),
    );
    const allocatableIds = new Set(
      capacityEligible
        .filter(
          (show) => !isPastPortalQueueCutoff(show.scheduledStartAt, now, portalQueueCutoffHoursBeforeStart),
        )
        .map((show) => show.id),
    );
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

    const designCounts = await countUniquePublicCatalogDesignsByShowId(
      adminDb,
      calendarShows.map((show) => show.id),
    );

    return {
      shows: calendarShows
        .map((show) => ({
          id: show.id,
          scheduledStartAt: show.scheduledStartAtIso,
          productionStatus: show.productionStatus,
          uniquePublicCatalogDesignCount: designCounts.get(show.id) ?? 0,
        }))
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
        }),
    };
  } catch (error) {
    mapHttpsError(error);
  }
});
