import type { PrintRequestStatus } from "../types/printRequest/printRequest.enums";

/** Working carts older than this (by updatedAt) are Stale when they still have items. */
export const PRINT_REQUEST_WORKING_STALE_AFTER_DAYS = 14;

export type PrintRequestWorkingTriageFilter = "needs_requeue" | "active" | "stale" | "empty" | "all";

export const PRINT_REQUEST_WORKING_TRIAGE_FILTERS: readonly PrintRequestWorkingTriageFilter[] = [
  "active",
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

export function getPrintRequestWorkingStaleCutoffMs(
  nowMs: number = Date.now(),
  staleAfterDays: number = PRINT_REQUEST_WORKING_STALE_AFTER_DAYS,
): number {
  return nowMs - staleAfterDays * 24 * 60 * 60 * 1000;
}

export type PrintRequestWorkingTriageBucket = "needs_requeue" | "active" | "stale" | "empty";

export function resolvePrintRequestWorkingTriageBucket(input: {
  itemCount: number;
  updatedAtMillis: number;
  needsStaffRequeueAt?: unknown | null;
  nowMs?: number;
  staleAfterDays?: number;
}): PrintRequestWorkingTriageBucket {
  if (input.needsStaffRequeueAt != null) {
    return "needs_requeue";
  }

  if (input.itemCount <= 0) {
    return "empty";
  }

  const cutoff = getPrintRequestWorkingStaleCutoffMs(input.nowMs, input.staleAfterDays);
  if (input.updatedAtMillis < cutoff) {
    return "stale";
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

/** Empty working requests older than this are eligible for auto-archive. */
export function isEmptyWorkingPrintRequestEligibleForAutoArchive(input: {
  itemCount: number;
  updatedAtMillis: number;
  nowMs?: number;
  staleAfterDays?: number;
}): boolean {
  if (input.itemCount > 0) {
    return false;
  }
  const cutoff = getPrintRequestWorkingStaleCutoffMs(input.nowMs, input.staleAfterDays);
  return input.updatedAtMillis < cutoff;
}
