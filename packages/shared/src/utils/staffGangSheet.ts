import type { PrintRequestOrigin } from "../types/printRequest/printRequest.types";
import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import type { UpcomingShowSource } from "../types/upcomingShow/upcomingShow.enums";

/** Origins allowed when allocating into a Staff Gang Sheet (strict; no isInternal inference). */
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
 * Whether a Print Request origin may be allocated onto a show of the given source.
 * Whatnot keeps origin-agnostic Studio behavior.
 * Staff requires persisted `requestOrigin === "studio_internal"` only (no isInternal inference).
 */
export function canAllocateOriginToShowSource(input: {
  source: UpcomingShowSource | string | null | undefined;
  requestOrigin: PrintRequestOrigin | string | null | undefined;
}): boolean {
  if (!isStaffGangSheetSource(input.source)) {
    return true;
  }

  return input.requestOrigin === "studio_internal";
}

export function formatStaffGangSheetTitle(cycleNumber: number): string {
  return `Staff Gang Sheet #${cycleNumber}`;
}
