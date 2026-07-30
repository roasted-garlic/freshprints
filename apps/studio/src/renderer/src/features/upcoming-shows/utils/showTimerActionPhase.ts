import type { ShowTimerActionResult } from "../services/upcomingShowService";

export type ShowTimerActionName = "start" | "pause" | "resume" | "finish";
export type ShowTimerCommittedPhase =
  | "committed"
  | "committed_reconciliation_partial"
  | "committed_refresh_failed";

export function classifyCommittedShowTimerPhase(
  result: ShowTimerActionResult,
  refreshFailed: boolean,
): ShowTimerCommittedPhase {
  if (
    result.reconciliation?.failedRequestCount ||
    result.reconciliation?.remediationRequestCount
  ) return "committed_reconciliation_partial";
  if (refreshFailed) return "committed_refresh_failed";
  return "committed";
}
