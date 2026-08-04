import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";

/**
 * Merges directly-fetched requests (e.g. a deep link's `ensureRequestsLoaded` call) into the
 * currently loaded list, admitting an addition only when its own server-maintained `queueTab`
 * agrees with `activeTab` — or is absent (pre-backfill legacy documents, for which no tab is more
 * "correct" than another). Without this guard, a request fetched while one tab was active can be
 * merged in after the hook has since switched to a different tab (a real async race between this
 * merge and the tab-driven page reload), permanently contaminating that other tab's list until the
 * next full reload. Mirrors the identical, already-reviewed guard in
 * `mergeShowQueuePrintRequestSources`.
 */
export function mergePrintRequestsById(
  current: PrintRequest[],
  additions: PrintRequest[],
  activeTab: PrintRequestListTab,
): PrintRequest[] {
  const byId = new Map(current.map((request) => [request.id, request]));
  for (const request of additions) {
    if (request.queueTab && request.queueTab !== activeTab) {
      continue;
    }
    byId.set(request.id, request);
  }
  return [...byId.values()];
}
