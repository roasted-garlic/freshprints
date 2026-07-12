import { onCall } from "firebase-functions/v2/https";

import type { ListPortalAllocatableShowsResponse } from "../../packages/shared/src/types/portal/listPortalAllocatableShows.types";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";
import {
  filterShowsAvailableForAllocation,
  isPastScheduledShow,
} from "../../packages/shared/src/utils/showScheduleGrouping";
import { adminDb } from "./lib/admin";
import { internal, unauthenticated } from "./lib/errors";
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
    await requirePortalCustomer(request.auth.uid);

    const snapshot = await adminDb.collection("upcomingShows").get();
    const now = new Date();
    const pastWindowStart = pastCalendarWindowStart(now);

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

    const allocatable = filterShowsAvailableForAllocation(shows, now);
    const allocatableIds = new Set(allocatable.map((show) => show.id));

    const calendarShows = shows.filter((show) => {
      if (allocatableIds.has(show.id)) {
        return true;
      }

      if (!show.scheduledStartAt) {
        return false;
      }

      if (!isPastScheduledShow(show, now)) {
        return false;
      }

      return show.scheduledStartAt.toDate().getTime() >= pastWindowStart.getTime();
    });

    const responseShows = calendarShows
      .map((show) => ({
        id: show.id,
        scheduledStartAt: show.scheduledStartAtIso,
        productionStatus: show.productionStatus,
        maxTotalQuantity: show.maxTotalQuantity,
        allocatedQuantity: show.allocatedQuantity,
        isAllocatable: allocatableIds.has(show.id),
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
      });

    return { shows: responseShows };
  } catch (error) {
    mapHttpsError(error);
  }
});
