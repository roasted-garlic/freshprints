import type { UpcomingShow } from "../../../../../../shared/types/upcomingShow/upcomingShow.types";

export interface UpcomingShowDateGroup {
  /** Sort key, e.g. "2026-08-01"; "no-date" for shows missing a schedule. */
  dateKey: string;
  dateLabel: string;
  shows: UpcomingShow[];
}

const NO_DATE_KEY = "no-date";

function getDateKey(show: UpcomingShow): string {
  const date = show.scheduledStartAt?.toDate();

  if (!date) {
    return NO_DATE_KEY;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(dateKey: string): string {
  if (dateKey === NO_DATE_KEY) {
    return "No date set";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Groups shows by calendar day (in local time) for a compact date-grouped picker, ordered
 * ascending with shows missing a schedule grouped last. Within a group, shows are ordered by
 * their scheduled time ascending.
 */
export function groupShowsByDate(shows: UpcomingShow[]): UpcomingShowDateGroup[] {
  const groupsByKey = new Map<string, UpcomingShow[]>();

  for (const show of shows) {
    const key = getDateKey(show);
    const existing = groupsByKey.get(key);

    if (existing) {
      existing.push(show);
    } else {
      groupsByKey.set(key, [show]);
    }
  }

  const sortedKeys = [...groupsByKey.keys()].sort((left, right) => {
    if (left === NO_DATE_KEY && right === NO_DATE_KEY) {
      return 0;
    }

    if (left === NO_DATE_KEY) {
      return 1;
    }

    if (right === NO_DATE_KEY) {
      return -1;
    }

    return left.localeCompare(right);
  });

  return sortedKeys.map((dateKey) => ({
    dateKey,
    dateLabel: formatDateLabel(dateKey),
    shows: [...(groupsByKey.get(dateKey) ?? [])].sort((left, right) => {
      const leftMillis = left.scheduledStartAt?.toMillis() ?? Number.POSITIVE_INFINITY;
      const rightMillis = right.scheduledStartAt?.toMillis() ?? Number.POSITIVE_INFINITY;
      return leftMillis - rightMillis;
    }),
  }));
}
