export type UpcomingShowSource = "whatnot";

/** Whatnot schedule/source status — never mixed with production completion. */
export type UpcomingShowStatus =
  | "scheduled"
  | "rescheduled"
  | "live"
  | "completed"
  | "canceled"
  | "missing_upstream"
  | "archived";

export type UpcomingShowSyncStatus = "idle" | "syncing" | "succeeded" | "failed";

/**
 * Production/print status for the show acting as its own print run. Separate from
 * `UpcomingShowStatus` (Whatnot schedule/source health) by design.
 */
export type ShowProductionStatus =
  | "open"
  | "full"
  | "printing"
  | "fully_printed"
  | "completed"
  | "archived"
  | "canceled";
