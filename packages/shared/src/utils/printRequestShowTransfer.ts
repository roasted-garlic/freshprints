import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import {
  canAcceptNewShowAllocations,
  type ShowAllocationEligibilityInput,
} from "./showAllocationEligibility";
import { isPastScheduledShow, type ShowWithScheduledStart } from "./showScheduleGrouping";
import { canRemoveRequestFromShow } from "./showQueueEditability";

export type PrintRequestShowTransferMode = "move" | "copy";

export interface PrintRequestShowTransferSource extends ShowWithScheduledStart {
  productionStatus?: ShowProductionStatus | string | null;
}

export type PrintRequestShowTransferDestination = ShowAllocationEligibilityInput & {
  source?: string | null;
  id?: string;
};

/** Whatnot shows only — Internal Gang Sheets are never transfer destinations. */
export function isPrintRequestWhatnotShow(show: { source?: string | null }): boolean {
  return show.source !== "staff_gang_sheet";
}

/**
 * Upcoming Whatnot shows that can still receive print-request allocations.
 * Excludes past/aired, finished/closed production lanes, and Internal Gang Sheets.
 */
export function isPrintRequestShowTransferDestination(
  show: PrintRequestShowTransferDestination,
  now: Date = new Date(),
): boolean {
  if (!isPrintRequestWhatnotShow(show)) {
    return false;
  }

  return canAcceptNewShowAllocations(show, now);
}

/**
 * Upcoming open shows move; aired or production-locked shows copy so history stays intact.
 */
export function resolvePrintRequestShowTransferMode(
  sourceShow: PrintRequestShowTransferSource,
  now: Date = new Date(),
): PrintRequestShowTransferMode {
  if (isPastScheduledShow(sourceShow, now)) {
    return "copy";
  }

  const productionStatus = sourceShow.productionStatus;
  if (
    typeof productionStatus === "string" &&
    canRemoveRequestFromShow(productionStatus as ShowProductionStatus) === false
  ) {
    return "copy";
  }

  return "move";
}

export function formatPrintRequestShowTransferActionLabel(mode: PrintRequestShowTransferMode): string {
  return mode === "copy" ? "Copy to another show" : "Move to another show";
}

export function formatPrintRequestShowTransferConfirmLabel(mode: PrintRequestShowTransferMode): string {
  return mode === "copy" ? "Copy to selected show" : "Move to selected show";
}
