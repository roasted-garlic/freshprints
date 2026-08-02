import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type { StaffInboxItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";

import { getPrintRequestsPath } from "../../print-requests/constants/printRequestRoutes";
import { formatUpcomingShowTitle } from "../../upcoming-shows/utils/upcomingShowDisplay";
import { getUpcomingShowsPath } from "../../upcoming-shows/constants/upcomingShowRoutes";

export function getStaffInboxItemNavigationPath(item: StaffInboxItem): string {
  if (item.kind === "design_issue_report" && item.designIssueReport) return `/designs?designId=${encodeURIComponent(item.designIssueReport.designId)}`;
  if (item.kind === "show_queue_full" && item.upcomingShowId) {
    return getUpcomingShowsPath({ showId: item.upcomingShowId });
  }

  if (!item.printRequestId || !item.printRequestTab) {
    return "/inbox";
  }

  return getPrintRequestsPath({
    tab: item.printRequestTab,
    requestId: item.printRequestId,
  });
}

export function buildShowTitleById(shows: UpcomingShow[]): Record<string, string> {
  const showTitleById: Record<string, string> = {};

  for (const show of shows) {
    showTitleById[show.id] = formatUpcomingShowTitle(show);
  }

  return showTitleById;
}
