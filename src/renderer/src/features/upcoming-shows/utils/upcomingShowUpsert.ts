import type { UpcomingShowSource } from "../../../../../../shared/types/upcomingShow/upcomingShow.enums";
import type { UpcomingShow } from "../../../../../../shared/types/upcomingShow/upcomingShow.types";

export interface UpcomingShowUpsertKey {
  source: UpcomingShowSource;
  whatnotShowId: string;
}

export function findMatchingUpcomingShow(
  shows: UpcomingShow[],
  key: UpcomingShowUpsertKey,
): UpcomingShow | undefined {
  const whatnotShowId = key.whatnotShowId.trim();

  return shows.find((show) => show.source === key.source && show.whatnotShowId === whatnotShowId);
}

export interface UpcomingShowUpsertFields {
  title?: string;
  whatnotUrl?: string;
  scheduledStartAt?: UpcomingShow["scheduledStartAt"];
}

/**
 * Fields that should be overwritten on an existing local show record when upstream data
 * changes. Never includes local-only fields (status, syncStatus, notes, isArchived) so a
 * schedule sync cannot silently clobber staff-owned local state.
 */
export function buildUpcomingShowUpdateFields(fields: UpcomingShowUpsertFields): UpcomingShowUpsertFields {
  return {
    title: fields.title,
    whatnotUrl: fields.whatnotUrl,
    scheduledStartAt: fields.scheduledStartAt,
  };
}
