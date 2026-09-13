import type { UpcomingShowSource } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { getWhatnotShowQueueTab } from "@fresh-prints/shared/utils/showProductionRecovery";
import { isPastScheduledShow } from "@fresh-prints/shared/utils/showScheduleGrouping";

import {
  getShowQueueSurfacePath,
  type ShowQueueRouteOptions,
} from "../constants/upcomingShowRoutes";
import { getShowQueueSurfaceForSource } from "./showQueueSurfaceSelection";

function isCurrentStaffGangSheetProductionStatus(status: string): boolean {
  return status === "open" || status === "full" || status === "printing";
}

function resolveShowQueueListTab(
  show: UpcomingShow | undefined,
  scheduledStartAtMillis: number | null,
  now: Date,
  showSource?: UpcomingShowSource | string,
): ShowQueueRouteOptions["tab"] {
  if (show?.source === "staff_gang_sheet") {
    return isCurrentStaffGangSheetProductionStatus(show.productionStatus) ? "current" : "history";
  }

  if (!show && showSource === "staff_gang_sheet") {
    return "current";
  }

  if (show) {
    return getWhatnotShowQueueTab(show, now);
  }

  if (scheduledStartAtMillis && scheduledStartAtMillis <= now.getTime()) {
    return "past";
  }

  return "upcoming";
}

export function buildShowQueueDeepLinkPath(input: {
  showId: string;
  printRequestId: string;
  show?: UpcomingShow;
  /** Use when `show` is not loaded yet — avoids defaulting internal sheets to `/show-queue`. */
  showSource?: UpcomingShowSource | string;
  scheduledStartAtMillis?: number | null;
  now?: Date;
}): string {
  const showId = input.showId.trim();
  const printRequestId = input.printRequestId.trim();
  if (!showId || !printRequestId) {
    return getShowQueueSurfacePath("shows");
  }

  const now = input.now ?? new Date();
  const surface = getShowQueueSurfaceForSource(input.show?.source ?? input.showSource ?? "whatnot");
  const tab = resolveShowQueueListTab(
    input.show,
    input.scheduledStartAtMillis ?? (input.show ? input.show.scheduledStartAt?.toMillis() ?? null : null),
    now,
    input.showSource,
  );

  return getShowQueueSurfacePath(surface, {
    showId,
    requestId: printRequestId,
    tab,
  });
}

export function isShowLikelyPast(
  show: UpcomingShow | undefined,
  scheduledStartAtMillis: number | null,
  now: Date,
): boolean {
  if (show) {
    return isPastScheduledShow(show, now);
  }

  return scheduledStartAtMillis !== null && scheduledStartAtMillis <= now.getTime();
}
