import type { ShowProductionStatus } from "../../../packages/shared/src/types/upcomingShow/upcomingShow.enums";

export interface PortalCalendarVisibilityShow {
  id: string;
  scheduledStartAt: { toDate: () => Date } | undefined;
  productionStatus: ShowProductionStatus;
}

export function shouldIncludePortalCalendarShow(input: {
  show: PortalCalendarVisibilityShow & { source?: string };
  allocatableIds: ReadonlySet<string>;
  pastCutoffUpcomingIds: ReadonlySet<string>;
  now: Date;
  pastWindowStart: Date;
}): boolean {
  const { show } = input;
  if (show.source === "staff_gang_sheet") return false;
  if (input.allocatableIds.has(show.id) || input.pastCutoffUpcomingIds.has(show.id)) return true;
  if (show.productionStatus === "completed" || show.productionStatus === "fully_printed") return true;
  if (!show.scheduledStartAt) return false;
  const scheduledAt = show.scheduledStartAt.toDate();
  return scheduledAt.getTime() < input.now.getTime()
    && scheduledAt.getTime() >= input.pastWindowStart.getTime();
}
