/**
 * Formats a show's scheduled date/time for display without seconds — shows are only scheduled by
 * date, hour, and minute, so surfacing seconds (from `toLocaleString`'s default) is misleading
 * precision.
 */
export function formatShowDateTimeLabel(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Formats just the time portion, without seconds, for compact show pickers/cards. */
export function formatShowTimeOnlyLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
