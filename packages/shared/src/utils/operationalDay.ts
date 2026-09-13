/** Canonical business timezone for the Portal Admin Show Queue. */
export const SHOW_QUEUE_OPERATIONAL_TIME_ZONE = "America/Chicago";

export interface OperationalDayWindow {
  dateKey: string;
  timeZone: string;
  start: Date;
  nextStart: Date;
  startMs: number;
  nextStartMs: number;
}

type DateTimePart = { type: string; value: string };

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function partsFor(date: Date, timeZone: string): Record<string, string> {
  const parts = formatterFor(timeZone).formatToParts(date) as DateTimePart[];
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function dateKeyFor(date: Date, timeZone: string): string {
  const parts = partsFor(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseDateKey(dateKey: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid operational date key: ${dateKey}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Return the timezone offset represented by an instant without using machine-local time. */
function offsetAt(date: Date, timeZone: string): number {
  const parts = partsFor(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** Convert a local midnight in an IANA zone to its UTC instant, including DST changes. */
function localMidnight(dateKey: string, timeZone: string): Date {
  const [year, month, day] = parseDateKey(dateKey);
  const wallClockAsUtc = Date.UTC(year, month - 1, day);
  const firstGuess = new Date(wallClockAsUtc);
  const corrected = new Date(wallClockAsUtc - offsetAt(firstGuess, timeZone));
  // A transition near midnight is unusual but possible in IANA data. One correction pass
  // makes the conversion stable without relying on a fixed offset or machine timezone.
  return new Date(wallClockAsUtc - offsetAt(corrected, timeZone));
}

function addCalendarDay(dateKey: string): string {
  const [year, month, day] = parseDateKey(dateKey);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear().toString().padStart(4, "0")}-${(next.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${next.getUTCDate().toString().padStart(2, "0")}`;
}

/**
 * Compute the current calendar day in the supplied IANA timezone. The returned range is
 * `[start, nextStart)`, so spring-forward and fall-back days remain DST-safe.
 */
export function getOperationalDayWindow(
  now: Date = new Date(),
  timeZone: string = SHOW_QUEUE_OPERATIONAL_TIME_ZONE,
): OperationalDayWindow {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Operational day requires a valid current instant.");
  }
  const dateKey = dateKeyFor(now, timeZone);
  const start = localMidnight(dateKey, timeZone);
  const nextStart = localMidnight(addCalendarDay(dateKey), timeZone);
  return {
    dateKey,
    timeZone,
    start,
    nextStart,
    startMs: start.getTime(),
    nextStartMs: nextStart.getTime(),
  };
}
