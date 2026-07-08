/** Minimal shape for schedule tab / allocation eligibility (Studio, Portal, Functions). */
export interface ShowWithScheduledStart {
  scheduledStartAt?: { toDate: () => Date } | null | undefined;
}

export interface ShowWithId {
  id: string;
}

export type ShowScheduleTab = "upcoming" | "past";

export const PAST_SHOW_READ_ONLY_MESSAGE = "Past shows are read-only.";

function resolveScheduledDate(show: ShowWithScheduledStart): Date | null {
  return show.scheduledStartAt?.toDate() ?? null;
}

/**
 * Classifies a show as Upcoming or Past purely from its scheduled date/time versus `now` — display/filter
 * grouping only; never changes `productionStatus`. Shows with no schedule are treated as Upcoming.
 */
export function getShowScheduleTab(show: ShowWithScheduledStart, now: Date): ShowScheduleTab {
  const scheduledDate = resolveScheduledDate(show);

  if (!scheduledDate) {
    return "upcoming";
  }

  return scheduledDate.getTime() > now.getTime() ? "upcoming" : "past";
}

export function filterShowsByScheduleTab<T extends ShowWithScheduledStart>(
  shows: T[],
  tab: ShowScheduleTab,
  now: Date,
): T[] {
  return shows.filter((show) => getShowScheduleTab(show, now) === tab);
}

export function isPastScheduledShow(show: ShowWithScheduledStart, now: Date): boolean {
  return getShowScheduleTab(show, now) === "past";
}

/** Past-tab shows may be reviewed or finished, but printing cannot be started after the scheduled time. */
export function canStartShowPrinting(show: ShowWithScheduledStart, now: Date): boolean {
  return !isPastScheduledShow(show, now);
}

/** Past shows are read-only; new print requests cannot be allocated to them. */
export function canAllocatePrintRequestToShow(show: ShowWithScheduledStart, now: Date): boolean {
  return !isPastScheduledShow(show, now);
}

export function filterShowsAvailableForAllocation<T extends ShowWithScheduledStart>(
  shows: T[],
  now: Date,
): T[] {
  return filterShowsByScheduleTab(shows, "upcoming", now);
}

export function resolveVisibleShowSelection<T extends ShowWithId>(
  visibleShows: T[],
  selectedShowId: string | null,
): string | null {
  if (selectedShowId && visibleShows.some((show) => show.id === selectedShowId)) {
    return selectedShowId;
  }

  return visibleShows[0]?.id ?? null;
}
