import type { UpcomingShowSource } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";

export type ShowQueueSurface = "shows" | "staff_gang_sheets";

export function getShowQueueSurfaceForSource(source: UpcomingShowSource | string): ShowQueueSurface {
  return source === "staff_gang_sheet" ? "staff_gang_sheets" : "shows";
}

/**
 * Decides how URL-selected show hydration interacts with the explicit Shows | Staff Gang Sheets tab.
 *
 * After first hydration, the user's surface choice wins: an incompatible URL show must not
 * force the tab back (the flicker bug). Deep links still set the surface on first load.
 */
export type QuerySurfaceSyncDecision =
  | { action: "set_surface"; surface: ShowQueueSurface }
  | { action: "clear_incompatible_query" }
  | { action: "continue_hydrate" };

export function decideQuerySurfaceSync(input: {
  queueSurface: ShowQueueSurface;
  queryShowSource: UpcomingShowSource | string | null | undefined;
  hasHydratedFromQuery: boolean;
}): QuerySurfaceSyncDecision {
  if (input.queryShowSource == null || input.queryShowSource === "") {
    return { action: "continue_hydrate" };
  }

  const querySurface = getShowQueueSurfaceForSource(input.queryShowSource);
  if (querySurface === input.queueSurface) {
    return { action: "continue_hydrate" };
  }

  if (!input.hasHydratedFromQuery) {
    return { action: "set_surface", surface: querySurface };
  }

  return { action: "clear_incompatible_query" };
}

/** Whether the Add Request control should be enabled for the selected lane. */
export function canEnableAddRequestAction(input: {
  isStaffGangSheet: boolean;
  canManageUpcomingShows: boolean;
  canManageStaffGangSheet: boolean;
  allocationBlocked: boolean;
}): boolean {
  if (input.allocationBlocked) {
    return false;
  }
  if (input.isStaffGangSheet) {
    return input.canManageStaffGangSheet;
  }
  return input.canManageUpcomingShows;
}
