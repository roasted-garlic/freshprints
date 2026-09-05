import type { PrintRequestStatus } from "../types/printRequest/printRequest.enums";

/**
 * Working carts with items leave **Active** and become **Idle** when `updatedAt`
 * is older than this (covers overnight + next-day return).
 */
export const PRINT_REQUEST_WORKING_IDLE_AFTER_HOURS = 48;

/**
 * Working carts with items leave **Idle** and become **Stale** when `updatedAt`
 * is older than this.
 */
export const PRINT_REQUEST_WORKING_STALE_AFTER_DAYS = 7;

/**
 * Empty working carts older than this are eligible for owner/admin auto-archive.
 * Kept separate from Idle/Stale triage so empty cleanup stays slower.
 */
export const PRINT_REQUEST_WORKING_EMPTY_AUTO_ARCHIVE_AFTER_DAYS = 14;

export type PrintRequestWorkingTriageFilter =
  | "needs_requeue"
  | "active"
  | "idle"
  | "stale"
  | "empty"
  | "all";

export const PRINT_REQUEST_WORKING_TRIAGE_FILTERS: readonly PrintRequestWorkingTriageFilter[] = [
  "active",
  "idle",
  "stale",
  "empty",
  "all",
  "needs_requeue",
] as const;

export function getPrintRequestWorkingTriageLabel(filter: PrintRequestWorkingTriageFilter): string {
  switch (filter) {
    case "needs_requeue":
      return "Needs Re-queue";
    case "active":
      return "Active";
    case "idle":
      return "Idle";
    case "stale":
      return "Stale";
    case "empty":
      return "Empty";
    case "all":
      return "All";
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

/** Operational list tabs never show archived requests. */
export function isPrintRequestIncludedInListTabs(status: PrintRequestStatus): boolean {
  return status !== "archived";
}

export function getPrintRequestWorkingIdleCutoffMs(
  nowMs: number = Date.now(),
  idleAfterHours: number = PRINT_REQUEST_WORKING_IDLE_AFTER_HOURS,
): number {
  return nowMs - idleAfterHours * 60 * 60 * 1000;
}

export function getPrintRequestWorkingStaleCutoffMs(
  nowMs: number = Date.now(),
  staleAfterDays: number = PRINT_REQUEST_WORKING_STALE_AFTER_DAYS,
): number {
  return nowMs - staleAfterDays * 24 * 60 * 60 * 1000;
}

export function getPrintRequestWorkingEmptyAutoArchiveCutoffMs(
  nowMs: number = Date.now(),
  emptyAfterDays: number = PRINT_REQUEST_WORKING_EMPTY_AUTO_ARCHIVE_AFTER_DAYS,
): number {
  return nowMs - emptyAfterDays * 24 * 60 * 60 * 1000;
}

export type PrintRequestWorkingTriageBucket =
  | "needs_requeue"
  | "active"
  | "idle"
  | "stale"
  | "empty";

export function resolvePrintRequestWorkingTriageBucket(input: {
  itemCount: number;
  updatedAtMillis: number;
  needsStaffRequeueAt?: unknown | null;
  nowMs?: number;
  idleAfterHours?: number;
  staleAfterDays?: number;
}): PrintRequestWorkingTriageBucket {
  if (input.needsStaffRequeueAt != null) {
    return "needs_requeue";
  }

  if (input.itemCount <= 0) {
    return "empty";
  }

  const nowMs = input.nowMs ?? Date.now();
  const idleCutoff = getPrintRequestWorkingIdleCutoffMs(nowMs, input.idleAfterHours);
  const staleCutoff = getPrintRequestWorkingStaleCutoffMs(nowMs, input.staleAfterDays);

  if (input.updatedAtMillis < staleCutoff) {
    return "stale";
  }

  if (input.updatedAtMillis < idleCutoff) {
    return "idle";
  }

  return "active";
}

export function matchesPrintRequestWorkingTriageFilter(
  bucket: PrintRequestWorkingTriageBucket,
  filter: PrintRequestWorkingTriageFilter,
): boolean {
  if (filter === "all") {
    return true;
  }
  return bucket === filter;
}

/** Empty working requests older than the empty-archive window are eligible for auto-archive. */
export function isEmptyWorkingPrintRequestEligibleForAutoArchive(input: {
  itemCount: number;
  updatedAtMillis: number;
  nowMs?: number;
  emptyAfterDays?: number;
}): boolean {
  if (input.itemCount > 0) {
    return false;
  }
  const cutoff = getPrintRequestWorkingEmptyAutoArchiveCutoffMs(input.nowMs, input.emptyAfterDays);
  return input.updatedAtMillis < cutoff;
}
