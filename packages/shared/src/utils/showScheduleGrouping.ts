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

export interface ShowWithProductionSource extends ShowWithScheduledStart {
  source?: string | null;
  productionStatus?: string | null;
  allocatedQuantity?: number;
}

/**
 * Whatnot show that Studio still treats as Printing after the authoritative Past boundary.
 * Staff Gang Sheets are excluded — they use a different Current/History lifecycle.
 */
export function isStalePastPrintingWhatnotShow(show: ShowWithProductionSource, now: Date): boolean {
  return (
    show.source === "whatnot" &&
    show.productionStatus === "printing" &&
    isPastScheduledShow(show, now)
  );
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

/**
 * Decides whether the currently selected show has silently fallen out of the active schedule tab's
 * visible list purely because its OWN schedule-tab classification changed (e.g. its scheduled start
 * time passed "now" between an action and a subsequent refresh) — not because the owner navigated
 * away from it (Plan Section 29.4). When the still-existing selected show now belongs to a
 * different tab than the currently active one, returns that show's tab so the caller can switch to
 * it and preserve the selection (and any state keyed on that show's id, e.g. a retry warning)
 * instead of silently falling back to a different show via `resolveVisibleShowSelection`. Returns
 * `null` when no such reclassification occurred (the selection is unaffected, doesn't exist, or is
 * already in the active tab).
 */
export function resolveScheduleTabForStillExistingSelection<
  T extends ShowWithId & ShowWithScheduledStart,
>(
  shows: readonly T[],
  selectedShowId: string | null,
  activeScheduleTab: ShowScheduleTab,
  now: Date,
): ShowScheduleTab | null {
  if (!selectedShowId) {
    return null;
  }
  const stillExistingShow = shows.find((show) => show.id === selectedShowId);
  if (!stillExistingShow) {
    return null;
  }
  const stillExistingShowTab = getShowScheduleTab(stillExistingShow, now);
  return stillExistingShowTab !== activeScheduleTab ? stillExistingShowTab : null;
}
