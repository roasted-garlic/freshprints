import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

type ShowListSortDirection = "asc" | "desc";

function compareShowsByScheduledStart(
  left: UpcomingShow,
  right: UpcomingShow,
  direction: ShowListSortDirection,
): number {
  const leftMillis = left.scheduledStartAt?.toMillis();
  const rightMillis = right.scheduledStartAt?.toMillis();

  if (leftMillis === undefined && rightMillis === undefined) {
    return left.id.localeCompare(right.id);
  }

  if (leftMillis === undefined) {
    return 1;
  }

  if (rightMillis === undefined) {
    return -1;
  }

  const delta = leftMillis - rightMillis;
  return direction === "asc" ? delta : -delta;
}

/**
 * Sorts shows by `scheduledStartAt` ascending with shows missing a schedule sorted last —
 * used instead of a Firestore `orderBy("scheduledStartAt")` query, because `orderBy` silently
 * excludes documents missing that field. Manually added shows must always appear in this list
 * even before a schedule is set.
 */
export function sortUpcomingShowsForDisplay(shows: UpcomingShow[]): UpcomingShow[] {
  return [...shows].sort((left, right) => compareShowsByScheduledStart(left, right, "asc"));
}

/** Past Show Queue: most recently scheduled shows first; unscheduled still last. */
export function sortPastShowsForDisplay(shows: UpcomingShow[]): UpcomingShow[] {
  return [...shows].sort((left, right) => compareShowsByScheduledStart(left, right, "desc"));
}
