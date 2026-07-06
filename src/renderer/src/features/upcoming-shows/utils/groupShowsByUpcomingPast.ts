import type { UpcomingShow } from "../../../../../../shared/types/upcomingShow/upcomingShow.types";

export type ShowScheduleTab = "upcoming" | "past";

/**
 * Classifies a show as Upcoming or Past purely from its scheduled date/time versus `now` — this
 * is a display/filter grouping only and never changes `productionStatus`. Shows with no schedule
 * are treated as Upcoming so they are never lost from view.
 */
export function getShowScheduleTab(show: UpcomingShow, now: Date): ShowScheduleTab {
  const scheduledDate = show.scheduledStartAt?.toDate();

  if (!scheduledDate) {
    return "upcoming";
  }

  return scheduledDate.getTime() > now.getTime() ? "upcoming" : "past";
}

export function filterShowsByScheduleTab(shows: UpcomingShow[], tab: ShowScheduleTab, now: Date): UpcomingShow[] {
  return shows.filter((show) => getShowScheduleTab(show, now) === tab);
}
