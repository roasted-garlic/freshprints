import type { ShowProductionStatus } from '@fresh-prints/shared/types/upcomingShow/upcomingShow.enums';

/** Whether the show airs in the future or has already started / finished. */
export type OurShowsTiming = 'upcoming' | 'past';

/** Border urgency — green / yellow / red capacity cues. */
export type OurShowsCapacityBorder = 'low' | 'medium' | 'high';

const COMPLETED_STATUSES = new Set<ShowProductionStatus>(['fully_printed', 'completed']);

const BORDER_PRIORITY: Record<OurShowsCapacityBorder, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function resolveOurShowsTiming(input: {
  productionStatus: ShowProductionStatus;
  scheduledStartAt: Date | null;
  now?: Date;
}): OurShowsTiming {
  if (COMPLETED_STATUSES.has(input.productionStatus)) {
    return 'past';
  }

  const now = input.now ?? new Date();
  if (input.scheduledStartAt && input.scheduledStartAt.getTime() < now.getTime()) {
    return 'past';
  }

  return 'upcoming';
}

export function resolveOurShowsCapacityBorder(input: {
  productionStatus: ShowProductionStatus;
}): OurShowsCapacityBorder {
  switch (input.productionStatus) {
    case 'full':
      return 'medium';
    case 'printing':
    case 'fully_printed':
    case 'completed':
      return 'high';
    case 'open':
    default:
      return 'low';
  }
}

export function pickDominantCapacityBorder(
  borders: readonly OurShowsCapacityBorder[],
): OurShowsCapacityBorder {
  return borders.reduce(
    (best, current) => (BORDER_PRIORITY[current] > BORDER_PRIORITY[best] ? current : best),
    'low',
  );
}

export function formatOurShowsTimingLabel(timing: OurShowsTiming): string {
  return timing === 'past' ? 'Aired' : 'Upcoming';
}

export function formatOurShowsCapacityBorderLabel(border: OurShowsCapacityBorder): string {
  switch (border) {
    case 'low':
      return 'Plenty of room';
    case 'medium':
      return 'Filling up';
    case 'high':
      return 'Full';
    default: {
      const exhaustive: never = border;
      return exhaustive;
    }
  }
}

export function formatShowDesignGallerySubtitle(input: {
  productionStatus: ShowProductionStatus;
  scheduledStartAt: string | null;
  now?: Date;
}): string {
  const scheduledDate = input.scheduledStartAt ? new Date(input.scheduledStartAt) : null;
  const timing = resolveOurShowsTiming({
    now: input.now,
    productionStatus: input.productionStatus,
    scheduledStartAt: scheduledDate,
  });

  if (!scheduledDate) {
    return timing === 'past'
      ? 'Everything that was requested for this Whatnot show.'
      : 'Everything currently requested for this Whatnot show.';
  }

  const dateLabel = scheduledDate.toLocaleString();
  return timing === 'past'
    ? `Everything that was requested for ${dateLabel}.`
    : `Everything currently requested for ${dateLabel}.`;
}
