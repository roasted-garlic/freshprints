import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import type { ShowCapacityResult } from "./showCapacity";

export type CapacityFillLevel = "low" | "medium" | "high" | "critical";

/**
 * Green/yellow/red fill level for a capacity progress bar, based on percent used. `undefined`
 * means there is no cap to measure against (unlimited), so no fill color applies.
 */
export function getCapacityFillLevel(percentUsed: number | undefined): CapacityFillLevel | undefined {
  if (percentUsed === undefined) {
    return undefined;
  }
  if (percentUsed >= 100) {
    return "critical";
  }
  if (percentUsed >= 90) {
    return "high";
  }
  if (percentUsed >= 70) {
    return "medium";
  }
  return "low";
}

/** Percent of capacity used, clamped to a minimum of 0. `undefined` when there is no cap. */
export function getShowCapacityPercent(capacity: ShowCapacityResult): number | undefined {
  if (capacity.maxTotalQuantity === undefined || capacity.maxTotalQuantity <= 0) {
    return undefined;
  }
  return Math.max(0, (capacity.allocatedQuantity / capacity.maxTotalQuantity) * 100);
}

/**
 * Clear "N of M used" / "no max set" capacity text, replacing the old ambiguous "N remaining of M"
 * / "N / M left" wording.
 */
export function formatCapacityUsedLabel(capacity: ShowCapacityResult): string {
  if (capacity.maxTotalQuantity === undefined) {
    return "No max set";
  }
  return `${capacity.allocatedQuantity} of ${capacity.maxTotalQuantity} used`;
}

/** "N spots left" / "Full" / "N over max" — the short-form label used on compact show option cards. */
export function formatSpotsRemainingLabel(capacity: ShowCapacityResult): string {
  if (capacity.maxTotalQuantity === undefined) {
    return "No limit";
  }
  if (capacity.isOverCapacity) {
    const over = capacity.allocatedQuantity - capacity.maxTotalQuantity;
    return `${over} over max`;
  }
  if (capacity.isFull) {
    return "Full";
  }
  const remaining = Math.max(0, capacity.remainingQuantity ?? 0);
  return `${remaining} spot${remaining === 1 ? "" : "s"} left`;
}

/**
 * Single-line capacity copy for calendar slot cards and compact summaries — leads with spots left,
 * then how many are taken of the allotted total (avoids repeating the same number twice).
 */
export function formatShowCapacitySlotLabel(capacity: ShowCapacityResult): string {
  if (capacity.maxTotalQuantity === undefined) {
    const taken = capacity.allocatedQuantity;
    return taken === 0 ? "No limit" : `${taken} taken · No limit`;
  }

  const max = capacity.maxTotalQuantity;
  const taken = capacity.allocatedQuantity;

  if (capacity.isOverCapacity) {
    const over = taken - max;
    return `${over} over max · ${taken} of ${max} taken`;
  }

  if (capacity.isFull) {
    return `Full · ${taken} of ${max} taken`;
  }

  const remaining = Math.max(0, capacity.remainingQuantity ?? 0);
  const spotsWord = remaining === 1 ? "spot" : "spots";
  return `${remaining} ${spotsWord} left · ${taken} of ${max} taken`;
}

export type DerivedShowStatusLabel =
  | "PRINTING"
  | "FULLY PRINTED"
  | "COMPLETED"
  | "ARCHIVED"
  | "CANCELED"
  | "OVER MAX"
  | "FULL"
  | "OPEN"
  | "PAST";

export interface DerivedShowStatusDisplay {
  label: DerivedShowStatusLabel;
  variant: "default" | "success" | "warning" | "danger" | "info";
}

export interface DerivedShowStatusDisplayOptions {
  /** When true, idle capacity states (OPEN/FULL/OVER MAX) display as PAST instead. */
  isPastScheduled?: boolean;
}

/**
 * Resolves the single status pill staff should see, combining stored `productionStatus` with
 * capacity-derived Open/Full/Over Max. Production lifecycle states (printing, fully printed,
 * completed, archived, canceled) always take priority over capacity, since those describe what
 * actually happened to the show rather than how full it currently is. Full/Over Max is otherwise
 * derived live from `allocatedQuantity` vs. `maxTotalQuantity` — it is never read from a persisted
 * `full` production status, so existing shows display correctly without any data migration.
 */
export function getDerivedShowStatusDisplay(
  productionStatus: ShowProductionStatus,
  capacity: ShowCapacityResult,
  options?: DerivedShowStatusDisplayOptions,
): DerivedShowStatusDisplay {
  switch (productionStatus) {
    case "printing":
      return { label: "PRINTING", variant: "info" };
    case "fully_printed":
      return { label: "FULLY PRINTED", variant: "success" };
    case "completed":
      return { label: "COMPLETED", variant: "success" };
    case "archived":
      return { label: "ARCHIVED", variant: "default" };
    case "canceled":
      return { label: "CANCELED", variant: "danger" };
    default:
      break;
  }

  if (options?.isPastScheduled) {
    return { label: "PAST", variant: "default" };
  }

  if (capacity.isOverCapacity) {
    return { label: "OVER MAX", variant: "danger" };
  }
  if (capacity.isFull) {
    return { label: "FULL", variant: "warning" };
  }
  return { label: "OPEN", variant: "default" };
}
