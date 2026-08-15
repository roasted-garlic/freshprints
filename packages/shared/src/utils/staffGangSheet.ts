import type { PrintRequestOrigin } from "../types/printRequest/printRequest.types";
import type { UpcomingShowSource } from "../types/upcomingShow/upcomingShow.enums";

/** Origins allowed when allocating into a Staff Gang Sheet lane. */
export const STAFF_GANG_SHEET_ALLOWED_ORIGINS: ReadonlySet<PrintRequestOrigin> = new Set([
  "studio_internal",
  "studio_customer",
]);

export function isStaffGangSheetSource(source: UpcomingShowSource | string | null | undefined): boolean {
  return source === "staff_gang_sheet";
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
 * Whatnot lanes keep existing origin-agnostic Studio behavior; Staff lanes deny portal_customer.
 */
export function canAllocateOriginToShowSource(input: {
  source: UpcomingShowSource | string | null | undefined;
  requestOrigin: PrintRequestOrigin | string | null | undefined;
}): boolean {
  if (!isStaffGangSheetSource(input.source)) {
    return true;
  }

  return (
    typeof input.requestOrigin === "string" &&
    STAFF_GANG_SHEET_ALLOWED_ORIGINS.has(input.requestOrigin as PrintRequestOrigin)
  );
}

export function formatStaffGangSheetTitle(cycleNumber: number): string {
  return `Staff Gang Sheet #${cycleNumber}`;
}
