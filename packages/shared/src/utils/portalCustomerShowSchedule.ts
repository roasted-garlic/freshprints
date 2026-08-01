import { formatShowDateTimeLabel } from "./showDateTimeDisplay";

/** Quiet customer-facing fallback when a referenced show document is missing. */
export const PORTAL_SHOW_SCHEDULE_UNAVAILABLE_LABEL = "Schedule unavailable";

/** Hard cap for batch `printRequestIds` on `getPortalPrintRequestShowSchedules`. */
export const PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX = 50;

export interface PortalCustomerShowSchedule {
  /** Internal id for dedupe/join only — never render to customers. */
  upcomingShowId: string;
  /** ISO scheduled start, or null when the show doc exists but has no start. */
  scheduledStartAt: string | null;
  /** True when the allocation referenced a show that could not be loaded. */
  missingShow?: boolean;
}

export interface PortalCustomerShowScheduleAllocationInput {
  upcomingShowId: string;
  allocatedQuantity: number;
  status: string;
}

/**
 * Distinct shows with a positive, non-canceled allocation, ordered chronologically.
 * Missing schedules sort after dated ones; stable by upcomingShowId when times tie/missing.
 */
export function buildPortalCustomerShowSchedulesFromAllocations(
  allocations: ReadonlyArray<PortalCustomerShowScheduleAllocationInput>,
  scheduleByShowId: ReadonlyMap<string, { scheduledStartAt: string | null; missingShow?: boolean }>,
): PortalCustomerShowSchedule[] {
  const qtyByShowId = new Map<string, number>();

  for (const allocation of allocations) {
    if (allocation.status === "canceled") {
      continue;
    }
    const showId = allocation.upcomingShowId.trim();
    if (!showId) {
      continue;
    }
    const qty =
      typeof allocation.allocatedQuantity === "number" && Number.isFinite(allocation.allocatedQuantity)
        ? Math.max(0, Math.floor(allocation.allocatedQuantity))
        : 0;
    if (qty <= 0) {
      continue;
    }
    qtyByShowId.set(showId, (qtyByShowId.get(showId) ?? 0) + qty);
  }

  const schedules: PortalCustomerShowSchedule[] = [];
  for (const showId of qtyByShowId.keys()) {
    const resolved = scheduleByShowId.get(showId);
    if (!resolved || resolved.missingShow) {
      schedules.push({
        upcomingShowId: showId,
        scheduledStartAt: null,
        missingShow: true,
      });
      continue;
    }
    schedules.push({
      upcomingShowId: showId,
      scheduledStartAt: resolved.scheduledStartAt,
    });
  }

  return schedules.sort((left, right) => {
    const leftMs = scheduledStartMs(left);
    const rightMs = scheduledStartMs(right);
    if (leftMs === null && rightMs === null) {
      return left.upcomingShowId.localeCompare(right.upcomingShowId);
    }
    if (leftMs === null) {
      return 1;
    }
    if (rightMs === null) {
      return -1;
    }
    if (leftMs !== rightMs) {
      return leftMs - rightMs;
    }
    return left.upcomingShowId.localeCompare(right.upcomingShowId);
  });
}

function scheduledStartMs(schedule: PortalCustomerShowSchedule): number | null {
  if (schedule.missingShow || !schedule.scheduledStartAt) {
    return null;
  }
  const ms = Date.parse(schedule.scheduledStartAt);
  return Number.isFinite(ms) ? ms : null;
}

/** Customer-visible label for one schedule entry (never includes show id/title). */
export function formatPortalCustomerShowScheduleLabel(schedule: PortalCustomerShowSchedule): string {
  if (schedule.missingShow) {
    return PORTAL_SHOW_SCHEDULE_UNAVAILABLE_LABEL;
  }
  if (!schedule.scheduledStartAt) {
    return PORTAL_SHOW_SCHEDULE_UNAVAILABLE_LABEL;
  }
  const date = new Date(schedule.scheduledStartAt);
  if (Number.isNaN(date.getTime())) {
    return PORTAL_SHOW_SCHEDULE_UNAVAILABLE_LABEL;
  }
  return formatShowDateTimeLabel(date);
}

export interface PortalCustomerShowScheduleCardSummary {
  /** Null when there is no positive allocation schedule to show. */
  line: string | null;
  additionalCount: number;
}

/**
 * Compact card line: earliest schedule, optional `+ N more`.
 * Progress status chips stay separate — this is additive copy only.
 */
export function buildPortalCustomerShowScheduleCardSummary(
  schedules: ReadonlyArray<PortalCustomerShowSchedule>,
): PortalCustomerShowScheduleCardSummary {
  if (schedules.length === 0) {
    return { line: null, additionalCount: 0 };
  }
  const earliest = schedules[0]!;
  const label = formatPortalCustomerShowScheduleLabel(earliest);
  const additionalCount = Math.max(0, schedules.length - 1);
  if (additionalCount === 0) {
    return { line: `Queued for ${label}`, additionalCount: 0 };
  }
  return {
    line: `Queued for ${label} · + ${additionalCount} more`,
    additionalCount,
  };
}

export function formatPortalPrintRequestShowScheduleBatchCapMessage(
  max: number = PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX,
): string {
  return `At most ${max} print requests can be loaded for schedules at once.`;
}
