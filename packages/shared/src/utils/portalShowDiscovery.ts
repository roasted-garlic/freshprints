import type { PortalPublicShowSummary } from "../types/portal/listPortalPublicShows.types";
import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";

const COMPLETED_STATUSES = new Set<ShowProductionStatus>(["fully_printed", "completed"]);

export function isUpcomingPortalShow(
  show: Pick<PortalPublicShowSummary, "productionStatus" | "scheduledStartAt">,
  now: Date = new Date(),
): boolean {
  if (!show.scheduledStartAt) {
    return false;
  }

  if (COMPLETED_STATUSES.has(show.productionStatus)) {
    return false;
  }

  return new Date(show.scheduledStartAt).getTime() > now.getTime();
}

export function comparePortalShowsBySchedule(
  left: Pick<PortalPublicShowSummary, "scheduledStartAt">,
  right: Pick<PortalPublicShowSummary, "scheduledStartAt">,
): number {
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
}

/** Nearest upcoming show that already has at least one public catalog design. */
export function findNextUpcomingShowWithDesigns(
  shows: readonly PortalPublicShowSummary[],
  now: Date = new Date(),
): PortalPublicShowSummary | null {
  return (
    shows
      .filter(
        (show) =>
          show.uniquePublicCatalogDesignCount > 0 && isUpcomingPortalShow(show, now),
      )
      .sort(comparePortalShowsBySchedule)[0] ?? null
  );
}

export interface LocalWeekRange {
  end: Date;
  start: Date;
}

/** Monday 00:00 through Sunday 23:59:59.999 in local time. */
export function getLocalWeekRange(now: Date = new Date()): LocalWeekRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = start.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

export function isScheduledInLocalWeek(
  scheduledStartAt: string,
  range: LocalWeekRange,
): boolean {
  const scheduledAt = new Date(scheduledStartAt).getTime();
  return scheduledAt >= range.start.getTime() && scheduledAt <= range.end.getTime();
}

/** Upcoming shows this calendar week (Mon–Sun) that already have public designs. */
export function findShowsThisWeekWithDesigns(
  shows: readonly PortalPublicShowSummary[],
  now: Date = new Date(),
): PortalPublicShowSummary[] {
  const weekRange = getLocalWeekRange(now);

  return shows
    .filter(
      (show) =>
        show.scheduledStartAt &&
        show.uniquePublicCatalogDesignCount > 0 &&
        isUpcomingPortalShow(show, now) &&
        isScheduledInLocalWeek(show.scheduledStartAt, weekRange),
    )
    .sort(comparePortalShowsBySchedule);
}
