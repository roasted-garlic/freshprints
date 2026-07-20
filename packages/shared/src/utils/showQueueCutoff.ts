/**
 * Portal Add-to-Show cutoff: customers cannot queue onto a show within N hours of
 * `scheduledStartAt`. Math uses absolute timestamps (UTC instants). Display uses the
 * browser locale; other Fresh Prints day buckets use America/Chicago separately.
 */

export const DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START = 5;
export const MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START = 1;
export const MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START = 72;

export const PORTAL_QUEUE_CUTOFF_PASSED_MESSAGE =
  "This show is past the add cutoff. Please choose another show.";

/** Slot copy when Portal Add-to-Show is still open: `{duration} to add designs to this show`. */
export const PORTAL_QUEUE_CUTOFF_OPEN_COPY_SUFFIX = " to add designs to this show";

/** Narrow-viewport open copy suffix: `{duration} to add designs`. */
export const PORTAL_QUEUE_CUTOFF_OPEN_COPY_SUFFIX_SHORT = " to add designs";

/** Compact closed copy for the capacity row (right side). */
export const PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL = "No longer able to add designs to this show";

/** Narrow-viewport closed copy for the capacity row. */
export const PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL_SHORT = "Can't add";

/** Remaining > 2h → success; ≤ 2h and > 30m → warning; ≤ 30m (and past) → danger. */
export const PORTAL_QUEUE_CUTOFF_WARNING_MS = 2 * 60 * 60 * 1000;
export const PORTAL_QUEUE_CUTOFF_DANGER_MS = 30 * 60 * 1000;

export type PortalQueueCutoffUrgency = "success" | "warning" | "danger";

export interface PortalQueueCutoffMeta {
  /** Desktop / wide copy. */
  label: string;
  /** Narrow-viewport copy (show-picker CSS swaps via media query). */
  shortLabel: string;
  urgency: PortalQueueCutoffUrgency;
}

function resolveScheduledStartDate(
  scheduledStartAt: Date | { toDate: () => Date } | null | undefined,
): Date | null {
  if (!scheduledStartAt) {
    return null;
  }
  if (scheduledStartAt instanceof Date) {
    return Number.isNaN(scheduledStartAt.getTime()) ? null : scheduledStartAt;
  }
  if (typeof scheduledStartAt.toDate === "function") {
    const date = scheduledStartAt.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/** Normalize Studio/settings input; returns default when unset/invalid. */
export function resolvePortalQueueCutoffHours(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START;
  }
  const hours = Math.floor(value);
  if (
    hours < MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START ||
    hours > MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START
  ) {
    return DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START;
  }
  return hours;
}

/** Whether a raw settings value is in the allowed Studio range (strict). */
export function isValidPortalQueueCutoffHours(value: number): boolean {
  return (
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START &&
    value <= MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START
  );
}

export function getPortalQueueCutoffAt(
  scheduledStartAt: Date | { toDate: () => Date } | null | undefined,
  cutoffHoursBeforeStart: number,
): Date | null {
  const start = resolveScheduledStartDate(scheduledStartAt);
  if (!start) {
    return null;
  }
  const hours = resolvePortalQueueCutoffHours(cutoffHoursBeforeStart);
  return new Date(start.getTime() - hours * 60 * 60 * 1000);
}

export function isPastPortalQueueCutoff(
  scheduledStartAt: Date | { toDate: () => Date } | null | undefined,
  now: Date,
  cutoffHoursBeforeStart: number,
): boolean {
  const cutoffAt = getPortalQueueCutoffAt(scheduledStartAt, cutoffHoursBeforeStart);
  if (!cutoffAt) {
    // No schedule → cannot apply cutoff; other eligibility rules handle this.
    return false;
  }
  return now.getTime() >= cutoffAt.getTime();
}

/**
 * Compact duration only (no “left” / sentence wrapper).
 * Examples: `2h 14m`, `45m`, `3h`
 */
export function formatPortalQueueCutoffDuration(remainingMs: number): string {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return "0m";
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * @deprecated Prefer `formatPortalQueueCutoffDuration` + sentence helpers.
 * Kept for any older call sites; appends “ left” for open windows.
 */
export function formatPortalQueueCutoffCountdown(
  remainingMs: number,
  options?: { closedLabel?: string },
): string {
  const closedLabel = options?.closedLabel ?? PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return closedLabel;
  }
  return `${formatPortalQueueCutoffDuration(remainingMs)} left`;
}

export function getPortalQueueCutoffUrgency(remainingMs: number): PortalQueueCutoffUrgency {
  if (!Number.isFinite(remainingMs) || remainingMs <= PORTAL_QUEUE_CUTOFF_DANGER_MS) {
    return "danger";
  }
  if (remainingMs <= PORTAL_QUEUE_CUTOFF_WARNING_MS) {
    return "warning";
  }
  return "success";
}

export function formatPortalQueueCutoffMeta(
  scheduledStartAt: Date | { toDate: () => Date } | null | undefined,
  now: Date,
  cutoffHoursBeforeStart: number,
): PortalQueueCutoffMeta | null {
  const cutoffAt = getPortalQueueCutoffAt(scheduledStartAt, cutoffHoursBeforeStart);
  if (!cutoffAt) {
    return null;
  }
  const remainingMs = cutoffAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return {
      label: PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL,
      shortLabel: PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL_SHORT,
      urgency: "danger",
    };
  }
  const duration = formatPortalQueueCutoffDuration(remainingMs);
  return {
    label: `${duration}${PORTAL_QUEUE_CUTOFF_OPEN_COPY_SUFFIX}`,
    shortLabel: `${duration}${PORTAL_QUEUE_CUTOFF_OPEN_COPY_SUFFIX_SHORT}`,
    urgency: getPortalQueueCutoffUrgency(remainingMs),
  };
}

/** @deprecated Prefer `formatPortalQueueCutoffMeta` (label + urgency). */
export function formatPortalQueueCutoffMetaLabel(
  scheduledStartAt: Date | { toDate: () => Date } | null | undefined,
  now: Date,
  cutoffHoursBeforeStart: number,
): string | null {
  return formatPortalQueueCutoffMeta(scheduledStartAt, now, cutoffHoursBeforeStart)?.label ?? null;
}
