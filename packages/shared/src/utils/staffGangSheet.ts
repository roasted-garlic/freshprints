import type { PrintRequestOrigin } from "../types/printRequest/printRequest.types";
import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import type { UpcomingShowSource } from "../types/upcomingShow/upcomingShow.enums";

/** Default capacity for Internal Gang Sheets (same default as Whatnot show capacity). */
export const DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY = 200;

/** Origins allowed when allocating into a Staff Gang Sheet. */
export const STAFF_GANG_SHEET_ALLOWED_ORIGINS: ReadonlySet<PrintRequestOrigin> = new Set([
  "studio_internal",
]);

/** Production statuses that count as the single shared active Staff Gang Sheet. */
export const STAFF_GANG_SHEET_ACTIVE_PRODUCTION_STATUSES: readonly ShowProductionStatus[] = [
  "open",
  "full",
  "printing",
] as const;

export function isStaffGangSheetSource(source: UpcomingShowSource | string | null | undefined): boolean {
  return source === "staff_gang_sheet";
}

export function isStaffGangSheetActiveProductionStatus(
  status: ShowProductionStatus | string | null | undefined,
): boolean {
  return (
    typeof status === "string" &&
    (STAFF_GANG_SHEET_ACTIVE_PRODUCTION_STATUSES as readonly string[]).includes(status)
  );
}

/**
 * Portal must never list or queue onto Staff Gang Sheets.
 * Returns true when a show document (or mapped show) is Portal-allocatable by source.
 */
export function isPortalAllocatableShowSource(
  source: UpcomingShowSource | string | null | undefined,
): boolean {
  return source === "whatnot";
}

/**
 * Whether a Print Request may be allocated onto a show of the given source.
 * Whatnot keeps origin-agnostic Studio behavior.
 * Internal Gang Sheets accept studio_internal origin, or legacy Studio internal docs
 * marked `isInternal` without a conflicting customer origin.
 */
export function canAllocateOriginToShowSource(input: {
  source: UpcomingShowSource | string | null | undefined;
  requestOrigin: PrintRequestOrigin | string | null | undefined;
  isInternal?: boolean;
}): boolean {
  if (!isStaffGangSheetSource(input.source)) {
    return true;
  }

  if (input.requestOrigin === "studio_customer" || input.requestOrigin === "portal_customer") {
    return false;
  }

  if (input.requestOrigin === "studio_internal") {
    return true;
  }

  // Legacy / badge-visible Internal requests may only have isInternal set.
  return input.isInternal === true;
}

export function formatStaffGangSheetTitle(cycleNumber: number): string {
  return `Internal Gang Sheet #${cycleNumber}`;
}

/**
 * Next cycle after any existing Internal Gang Sheets (history + current).
 * Empty corpus → 1. Never reuses a cycle number.
 */
export function resolveNextStaffGangSheetCycleNumber(
  existingCycleNumbers: ReadonlyArray<number | null | undefined>,
): number {
  let maxCycle = 0;
  for (const value of existingCycleNumbers) {
    if (typeof value === "number" && Number.isInteger(value) && value > maxCycle) {
      maxCycle = value;
    }
  }
  return maxCycle + 1;
}

/**
 * Internal Gang Sheets always enforce a numeric capacity (default 200).
 * Legacy unlimited docs without `maxTotalQuantity` resolve to the default.
 */
export function resolveInternalGangSheetMaxTotalQuantity(
  maxTotalQuantity: number | null | undefined,
): number {
  return typeof maxTotalQuantity === "number" && Number.isFinite(maxTotalQuantity)
    ? maxTotalQuantity
    : DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY;
}
