import type {
  UpcomingShowStatus,
  UpcomingShowSyncStatus,
} from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";

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
  return show.title?.trim() || `Whatnot show ${show.whatnotShowId}`;
}

export function formatUpcomingShowTimestampLabel(value: { toDate: () => Date } | undefined): string {
  if (!value) {
    return "Not scheduled";
  }

  return formatShowDateTimeLabel(value.toDate());
}

export function formatUpcomingShowManualImportTimestampLabel(value: { toDate: () => Date } | undefined): string {
  if (!value) {
    return "Never imported";
  }

  return formatShowDateTimeLabel(value.toDate());
}
