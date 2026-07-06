import type { UpcomingShow } from "../../../../../../shared/types/upcomingShow/upcomingShow.types";

/**
 * Sorts shows by `scheduledStartAt` ascending with shows missing a schedule sorted last —
 * used instead of a Firestore `orderBy("scheduledStartAt")` query, because `orderBy` silently
 * excludes documents missing that field. Manually added shows must always appear in this list
 * even before a schedule is set.
 */
export function sortUpcomingShowsForDisplay(shows: UpcomingShow[]): UpcomingShow[] {
  return [...shows].sort((left, right) => {
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

    return leftMillis - rightMillis;
  });
}
