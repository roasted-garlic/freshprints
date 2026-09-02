import { formatCalendarDayGroupLabel } from '@fresh-prints/shared/utils/showCalendarGrid';

/** Accessible name for an Upcoming Shows calendar day cell. */
export function formatOurShowsDayAriaLabel(input: {
  dateKey: string;
  designCount: number;
  hasShows: boolean;
  isToday: boolean;
}): string {
  const dayLabel = formatCalendarDayGroupLabel(input.dateKey);
  const todaySuffix = input.isToday ? ', Today' : '';

  if (!input.hasShows) {
    return `${dayLabel}${todaySuffix}, no shows`;
  }

  const designWord = input.designCount === 1 ? 'design' : 'designs';
  return `${dayLabel}${todaySuffix}, ${input.designCount} ${designWord} — open show gallery`;
}
