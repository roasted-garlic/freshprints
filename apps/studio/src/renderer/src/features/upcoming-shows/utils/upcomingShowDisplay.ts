import type {
  UpcomingShowStatus,
  UpcomingShowSyncStatus,
} from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import { formatStaffGangSheetTitle } from "@fresh-prints/shared/utils/staffGangSheet";
import { isPastScheduledShow } from "./groupShowsByUpcomingPast";

export function getUpcomingShowStatusBadgeVariant(status: UpcomingShowStatus) {
  switch (status) {
    case "scheduled":
    case "rescheduled":
      return "info";
    case "live":
      return "success";
    case "completed":
      return "default";
    case "canceled":
    case "missing_upstream":
      return "danger";
    case "archived":
    default:
      return "default";
  }
}

export function getUpcomingShowSyncStatusBadgeVariant(syncStatus: UpcomingShowSyncStatus) {
  switch (syncStatus) {
    case "succeeded":
      return "success";
    case "syncing":
      return "info";
    case "failed":
      return "danger";
    case "idle":
    default:
      return "default";
  }
}

export function formatUpcomingShowTitle(show: UpcomingShow): string {
  if (show.source === "staff_gang_sheet") {
    // Prefer cycle-based label so legacy stored "Staff Gang Sheet #N" titles display as Internal.
    if (typeof show.staffGangSheetCycleNumber === "number") {
      return formatStaffGangSheetTitle(show.staffGangSheetCycleNumber);
    }
    return show.title?.trim() || "Internal Gang Sheet";
  }
  if (show.source === "dev_fixture") {
    return show.title?.trim() || "DEV fixture show";
  }
  return show.title?.trim() || `Whatnot show ${show.whatnotShowId ?? "unknown"}`;
}

export function formatUpcomingShowWhatnotIdentityLabel(show: UpcomingShow): string {
  if (show.source === "dev_fixture") {
    return "DEV OVERRIDE";
  }
  return show.whatnotShowId ?? "unknown";
}

export function formatUpcomingShowTimestampLabel(value: { toDate: () => Date } | undefined): string {
  if (!value) {
    return "Not scheduled";
  }

  return formatShowDateTimeLabel(value.toDate());
}

export function shouldShowUpcomingShowScheduleStatusBadge(show: UpcomingShow, now: Date): boolean {
  if (!isPastScheduledShow(show, now)) {
    return true;
  }

  return show.status !== "scheduled" && show.status !== "rescheduled";
}

export function formatUpcomingShowManualImportTimestampLabel(value: { toDate: () => Date } | undefined): string {
  if (!value) {
    return "Never imported";
  }

  return formatShowDateTimeLabel(value.toDate());
}
