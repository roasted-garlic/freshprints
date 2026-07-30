import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";

import type { PrintRequestItemSummary } from "../services/printRequestService";

export interface PrintRequestListState {
  requests: PrintRequest[];
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  countsByTab: Record<PrintRequestListTab, number>;
}

/**
 * Reconciles a single deleted/archived print request into already-loaded list state without
 * rerunning the full unbounded `listPrintRequests` + per-request item-summary reload — that reload
 * scales with total print-request count, not with the one request that changed (Wave C
 * comprehensive-audit amendment, 2026-07-24). Both outcomes also decrement the exact
 * `countsByTab[activeTab]` count by 1 — the reconciled request is always removed from whichever
 * tab is currently loaded (delete removes the row outright; archive excludes it from every list
 * tab), so the tab button's exact count must not silently drift stale until the next full reload
 * (independent-review finding, Wave C hydration remediation pass 5, 2026-07-25).
 */
export function reconcileDeletedOrArchivedRequest<T extends PrintRequestListState>(
  state: T,
  printRequestId: string,
  outcome: "deleted" | "archived",
  activeTab: PrintRequestListTab,
): T {
  const wasInState = state.requests.some((request) => request.id === printRequestId);
  const countsByTab = wasInState
    ? { ...state.countsByTab, [activeTab]: Math.max(0, state.countsByTab[activeTab] - 1) }
    : state.countsByTab;

  if (outcome === "deleted") {
    const summariesByRequestId = { ...state.summariesByRequestId };
    delete summariesByRequestId[printRequestId];
    return {
      ...state,
      requests: state.requests.filter((request) => request.id !== printRequestId),
      summariesByRequestId,
      countsByTab,
    };
  }
  return {
    ...state,
    requests: state.requests.map((request) =>
      request.id === printRequestId ? { ...request, status: "archived" } : request,
    ),
    countsByTab,
  };
}
