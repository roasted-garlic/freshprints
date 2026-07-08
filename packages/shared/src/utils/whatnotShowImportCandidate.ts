import { parseWhatnotShowUrl } from "./whatnotShowUrl";

/**
 * Raw candidate as extracted from the DOM of an already-loaded Whatnot show-list page (via
 * `webContents.executeJavaScript()` in the Electron main process), scoped per
 * `section[data-testid="livestream-card"]` — never a global anchor query, which mixes up
 * titles/dates across cards. Deliberately just three plain strings — no cookies, no raw HTML,
 * nothing beyond what's visibly rendered on the page.
 */
export interface RawWhatnotShowDomCandidate {
  href: string;
  title: string;
  dateText: string;
}

export type WhatnotShowImportCandidateStatus = "ready" | "live" | "needs_review";

export interface ParsedWhatnotShowImportCandidate {
  status: WhatnotShowImportCandidateStatus;
  whatnotShowId?: string;
  whatnotUrl?: string;
  title: string;
  /** Absolute instant, resolved from `rawDateText`. Never set for a "live" or unparseable candidate. */
  scheduledStartAt?: Date;
  /** The raw visible badge text (e.g. "Sun, Jul 12, 8:00 PM", "Tue 8:00 PM", "Live · 24"), always preserved as Whatnot's source of truth. */
  rawDateText: string;
  /** Present when `status` is `needs_review`, explaining what could not be resolved. */
  reviewReason?: string;
}

const WEEKDAY_LABEL_TO_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  su: 0,
  mon: 1,
  monday: 1,
  mo: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  tu: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  we: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  th: 4,
  fri: 5,
  friday: 5,
  fr: 5,
  sat: 6,
  saturday: 6,
  sa: 6,
};

const LIVE_BADGE_PATTERN = /^live\b/i;
const WEEKDAY_TIME_PATTERN = /^([a-z]{2,9})\.?,?\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)$/i;
const EXPLICIT_DATE_TIME_PATTERN =
  /^([a-z]{2,9})\.?,\s+([a-z]{3,9})\s+(\d{1,2}),\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i;
const RELATIVE_DAY_TIME_PATTERN = /^(today|tomorrow),?\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)$/i;
/** Matches the individual show dashboard's "Scheduled: 7/7 8:00PM" line — numeric month/day, no year. */
const NUMERIC_DATE_TIME_PATTERN = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i;

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function to24Hour(hour: number, meridiem: string): number {
  const normalizedHour = hour % 12;
  return meridiem.toLowerCase() === "pm" ? normalizedHour + 12 : normalizedHour;
}

function parseWeekdayIndex(rawWeekday: string): number | undefined {
  const normalizedWeekday = rawWeekday.toLowerCase().replace(/\.$/, "");
  return WEEKDAY_LABEL_TO_INDEX[normalizedWeekday];
}

export function isWhatnotLiveBadgeText(rawDateText: string): boolean {
  return LIVE_BADGE_PATTERN.test(rawDateText.trim());
}

/**
 * Resolves Whatnot's relative/ambiguous date-time badge text (e.g. "Today 8:00 PM",
 * "Tue 8:00 PM", "Sun, Jul 12, 8:00 PM") to an absolute instant, relative to `now`. Returns
 * `undefined` for any text that doesn't match a known shape — including a "Live · N" badge,
 * which has no schedulable date at all — rather than guessing; callers must treat that as a
 * "needs review" (or "live") candidate, never silently default to some other time.
 */
export function resolveWhatnotShowDateText(rawDateText: string, now: Date): Date | undefined {
  const trimmed = rawDateText.trim();

  if (isWhatnotLiveBadgeText(trimmed)) {
    return undefined;
  }

  const relativeDayMatch = RELATIVE_DAY_TIME_PATTERN.exec(trimmed);
  if (relativeDayMatch) {
    const hour = to24Hour(Number(relativeDayMatch[2]), relativeDayMatch[4]);
    const minute = Number(relativeDayMatch[3]);
    const resolved = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
    if (relativeDayMatch[1].toLowerCase() === "tomorrow") {
      resolved.setDate(resolved.getDate() + 1);
    }
    return resolved;
  }

  // Must be checked before the bare weekday pattern, since "Sun, Jul 12, 8:00 PM" would
  // otherwise also match the looser weekday-prefix shape.
  const explicitMatch = EXPLICIT_DATE_TIME_PATTERN.exec(trimmed);
  if (explicitMatch) {
    const weekdayIndex = parseWeekdayIndex(explicitMatch[1]);
    if (weekdayIndex === undefined) {
      return undefined;
    }

    const monthIndex = MONTH_NAMES.indexOf(explicitMatch[2].slice(0, 3).toLowerCase());
    if (monthIndex === -1) {
      return undefined;
    }
    const day = Number(explicitMatch[3]);
    const hour = to24Hour(Number(explicitMatch[4]), explicitMatch[6]);
    const minute = Number(explicitMatch[5]);

    let year = now.getFullYear();
    let candidate = new Date(year, monthIndex, day, hour, minute, 0, 0);
    if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      year += 1;
      candidate = new Date(year, monthIndex, day, hour, minute, 0, 0);
    }
    return candidate;
  }

  // Bare weekday, with or without a trailing comma: "Tue 8:00 PM", "Sat, 8:00 PM".
  const weekdayMatch = WEEKDAY_TIME_PATTERN.exec(trimmed);
  if (weekdayMatch) {
    const targetWeekday = parseWeekdayIndex(weekdayMatch[1]);
    if (targetWeekday === undefined) {
      return undefined;
    }

    const hour = to24Hour(Number(weekdayMatch[2]), weekdayMatch[4]);
    const minute = Number(weekdayMatch[3]);
    const daysUntilTarget = (targetWeekday - now.getDay() + 7) % 7 || 7;
    const resolved = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
    resolved.setDate(resolved.getDate() + daysUntilTarget);
    return resolved;
  }

  // Numeric "M/D H:MMAM/PM" from the individual show dashboard's "Scheduled: 7/7 8:00PM" line.
  const numericMatch = NUMERIC_DATE_TIME_PATTERN.exec(trimmed);
  if (numericMatch) {
    const month = Number(numericMatch[1]) - 1;
    const day = Number(numericMatch[2]);
    const hour = to24Hour(Number(numericMatch[3]), numericMatch[5]);
    const minute = Number(numericMatch[4]);

    if (month < 0 || month > 11 || day < 1 || day > 31) {
      return undefined;
    }

    let year = now.getFullYear();
    let candidate = new Date(year, month, day, hour, minute, 0, 0);
    if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      year += 1;
      candidate = new Date(year, month, day, hour, minute, 0, 0);
    }
    return candidate;
  }

  return undefined;
}

/**
 * Parses the individual show dashboard's "Scheduled: <text>" line (e.g. "Scheduled: 7/7 8:00PM")
 * into just the date/time portion, stripping the "Scheduled:" label. Returns the trimmed
 * remainder unchanged if no "Scheduled:" prefix is found, so callers can pass either the full
 * line or an already-stripped value.
 */
export function stripScheduledLabel(rawText: string): string {
  const match = /^scheduled:\s*(.+)$/i.exec(rawText.trim());
  return match ? match[1].trim() : rawText.trim();
}

/**
 * Normalizes one raw DOM candidate into a parsed import candidate. Never throws.
 *
 * - No extractable show ID -> `needs_review` (nothing to import).
 * - A "Live · N" badge -> `status: "live"`, no `scheduledStartAt` is ever invented for it.
 * - Any other unparseable date/time text -> `needs_review`, raw text preserved for staff to see.
 */
export function parseWhatnotShowImportCandidate(
  raw: RawWhatnotShowDomCandidate,
  now: Date,
): ParsedWhatnotShowImportCandidate {
  const title = raw.title.trim();
  const parsedUrl = parseWhatnotShowUrl(raw.href);

  if (!parsedUrl) {
    return {
      status: "needs_review",
      title: title || raw.href,
      rawDateText: raw.dateText,
      reviewReason: "Could not extract a Whatnot show ID from this link.",
    };
  }

  if (isWhatnotLiveBadgeText(raw.dateText)) {
    return {
      status: "live",
      whatnotShowId: parsedUrl.whatnotShowId,
      whatnotUrl: parsedUrl.whatnotUrl,
      title: title || "Untitled show",
      rawDateText: raw.dateText,
    };
  }

  const scheduledStartAt = resolveWhatnotShowDateText(raw.dateText, now);

  if (!scheduledStartAt) {
    return {
      status: "needs_review",
      whatnotShowId: parsedUrl.whatnotShowId,
      whatnotUrl: parsedUrl.whatnotUrl,
      title: title || "Untitled show",
      rawDateText: raw.dateText,
      reviewReason: "Could not parse the show date/time.",
    };
  }

  return {
    status: "ready",
    whatnotShowId: parsedUrl.whatnotShowId,
    whatnotUrl: parsedUrl.whatnotUrl,
    title: title || "Untitled show",
    scheduledStartAt,
    rawDateText: raw.dateText,
  };
}

export function parseWhatnotShowImportCandidates(
  rawCandidates: RawWhatnotShowDomCandidate[],
  now: Date,
): ParsedWhatnotShowImportCandidate[] {
  return rawCandidates.map((raw) => parseWhatnotShowImportCandidate(raw, now));
}
