export const SHOW_CALENDAR_NO_DATE_KEY = "no-date";

/** Local calendar date key (`YYYY-MM-DD`) for grouping and grid matching. */
export function toLocalDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface CalendarMonthDay {
  dateKey: string;
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasShows: boolean;
}

export interface CalendarMonthLabel {
  month: number;
  year: number;
  label: string;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export type CalendarWeekStartsOn = "sunday" | "monday";

function getMonthGridStart(firstOfMonth: Date, weekStartsOn: CalendarWeekStartsOn): Date {
  const sundayBasedOffset = firstOfMonth.getDay();
  const offset = weekStartsOn === "monday" ? (sundayBasedOffset + 6) % 7 : sundayBasedOffset;
  return addDays(firstOfMonth, -offset);
}

/** Month grid weeks, including leading/trailing days from adjacent months. */
export function buildCalendarMonthWeeks(
  year: number,
  month: number,
  showDateKeys: ReadonlySet<string>,
  now: Date = new Date(),
  options?: { weekStartsOn?: CalendarWeekStartsOn; trimEmptyWeeks?: boolean },
): CalendarMonthDay[][] {
  const weekStartsOn = options?.weekStartsOn ?? "sunday";
  const todayKey = toLocalDateKey(now);
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = getMonthGridStart(firstOfMonth, weekStartsOn);
  const weeks: CalendarMonthDay[][] = [];

  let cursor = startOfLocalDay(gridStart);

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: CalendarMonthDay[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dateKey = toLocalDateKey(cursor);
      week.push({
        dateKey,
        date: new Date(cursor),
        dayOfMonth: cursor.getDate(),
        isCurrentMonth: cursor.getMonth() === month,
        isToday: dateKey === todayKey,
        hasShows: showDateKeys.has(dateKey),
      });
      cursor = addDays(cursor, 1);
    }

    weeks.push(week);
  }

  if (!options?.trimEmptyWeeks) {
    return weeks;
  }

  return weeks.filter((week) =>
    week.some((day) => day.isCurrentMonth || day.hasShows),
  );
}

export function formatCalendarMonthLabel(year: number, month: number): CalendarMonthLabel {
  const label = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return { year, month, label };
}

export function shiftCalendarMonth(year: number, month: number, delta: number): CalendarMonthLabel {
  const shifted = new Date(year, month + delta, 1);
  return formatCalendarMonthLabel(shifted.getFullYear(), shifted.getMonth());
}

/** Earliest date key from a set, ignoring `no-date`. */
export function getEarliestShowDateKey(dateKeys: Iterable<string>): string | null {
  const sorted = [...dateKeys]
    .filter((key) => key !== SHOW_CALENDAR_NO_DATE_KEY)
    .sort((left, right) => left.localeCompare(right));

  return sorted[0] ?? null;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatCalendarDayGroupLabel(dateKey: string): string {
  if (dateKey === SHOW_CALENDAR_NO_DATE_KEY) {
    return "No date set";
  }

  return parseLocalDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
