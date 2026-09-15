import { getShowScheduleTab } from "./showScheduleGrouping";

/** Production statuses still operational for capacity / allocation management. */
export const SHOW_QUEUE_DEFAULT_MAX_APPLY_PRODUCTION_STATUSES = [
  "open",
  "full",
  "printing",
] as const;

export type ShowQueueDefaultMaxApplyProductionStatus =
  (typeof SHOW_QUEUE_DEFAULT_MAX_APPLY_PRODUCTION_STATUSES)[number];

/** Sources that snapshot `settings/showQueue.defaultMaxTotalQuantity` at create. */
export const SHOW_QUEUE_DEFAULT_MAX_APPLY_SOURCES = ["whatnot", "dev_fixture"] as const;

export type ShowQueueDefaultMaxApplySource = (typeof SHOW_QUEUE_DEFAULT_MAX_APPLY_SOURCES)[number];

export interface ShowQueueDefaultMaxApplyCandidate {
  source?: string | null;
  productionStatus?: string | null;
  isArchived?: boolean | null;
  scheduledStartAt?: { toDate: () => Date } | null;
  allocatedQuantity?: number | null;
  maxTotalQuantity?: number | null;
}

const APPLY_PRODUCTION_STATUS_SET: ReadonlySet<string> = new Set(
  SHOW_QUEUE_DEFAULT_MAX_APPLY_PRODUCTION_STATUSES,
);

const APPLY_SOURCE_SET: ReadonlySet<string> = new Set(SHOW_QUEUE_DEFAULT_MAX_APPLY_SOURCES);

/**
 * Whether a show may receive a bulk apply of the Show Queue global default max.
 * Upcoming schedule + operational production status + Whatnot/DEV fixture only.
 * Past / Needs Attention (past-schedule) / terminal / Internal Gang Sheets are excluded.
 */
export function isShowEligibleForDefaultMaxApply(
  show: ShowQueueDefaultMaxApplyCandidate,
  now: Date = new Date(),
): boolean {
  if (show.isArchived === true) {
    return false;
  }

  if (typeof show.source !== "string" || !APPLY_SOURCE_SET.has(show.source)) {
    return false;
  }

  if (
    typeof show.productionStatus !== "string" ||
    !APPLY_PRODUCTION_STATUS_SET.has(show.productionStatus)
  ) {
    return false;
  }

  return getShowScheduleTab(show, now) === "upcoming";
}

/**
 * Skip applying a finite new max when it would land below current allocated quantity
 * (same danger case as per-show `setShowMaxQuantity` without override).
 * Clearing the max (no limit) is never skipped for this reason.
 */
export function shouldSkipDefaultMaxApplyForAllocatedQuantity(
  show: Pick<ShowQueueDefaultMaxApplyCandidate, "allocatedQuantity">,
  newMaxTotalQuantity: number | null,
): boolean {
  if (newMaxTotalQuantity === null) {
    return false;
  }

  const allocated =
    typeof show.allocatedQuantity === "number" && Number.isFinite(show.allocatedQuantity)
      ? show.allocatedQuantity
      : 0;

  return newMaxTotalQuantity < allocated;
}
