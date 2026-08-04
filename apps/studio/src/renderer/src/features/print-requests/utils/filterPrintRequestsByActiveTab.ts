import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";

/**
 * Render-time safety net: excludes any request whose own server-maintained `queueTab` disagrees
 * with `activeTab`, admitting a request with no `queueTab` unconditionally (pre-backfill legacy
 * documents, for which no tab is more "correct" than another — the same fallback already used by
 * `mergePrintRequestsById` and `mergeShowQueuePrintRequestSources`).
 *
 * `usePrintRequests`'s own state is expected to already be tab-pure by the time it reports
 * `isLoading: false` — this filter exists as defense-in-depth against exactly the kind of transitional
 * render-timing gap this function's own regression test reproduces, not as a substitute for that fix.
 */
export function filterPrintRequestsByActiveTab(
  requests: PrintRequest[],
  activeTab: PrintRequestListTab,
): PrintRequest[] {
  return requests.filter((request) => !request.queueTab || request.queueTab === activeTab);
}
