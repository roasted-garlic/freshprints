import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { isPrintRequestFullyPrinted } from "@fresh-prints/shared/utils/printRequestQueueState";
import {
  derivePrintRequestListTab,
  type PrintRequestListTab,
} from "@fresh-prints/shared/utils/printRequestListGrouping";

import type { PrintRequestItemSummary } from "../../print-requests/services/printRequestService";

export interface ShowQueuePrintRequestSource {
  /**
   * The tab this source's own `usePrintRequests` instance was mounted for. Used only to filter out
   * requests that `ensureRequestsLoaded` force-fetched by ID into this source but whose own
   * `queueTab` says they actually belong to a different tab (a request queued to a show forces a
   * fetch through whichever source happens to own `ensureRequestsLoaded`, not necessarily its
   * matching tab) — never used to decide the tab for a request whose `queueTab` is absent, since a
   * pre-backfill request without `queueTab` yet has no better classification available here.
   */
  tab: PrintRequestListTab;
  requests: PrintRequest[];
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
}

type AllocationTotals = {
  totalAllocatedQuantity: number;
  totalInProgressQuantity: number;
  totalPrintedQuantity: number;
};

export function buildShowQueuePrintRequestOptions(input: {
  requests: PrintRequest[];
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  allocationTotalsByRequestId: Record<string, AllocationTotals>;
  requestIdsAlreadyOnShow: Set<string>;
}): Array<{ label: string; value: string }> {
  return [
    { label: "Choose a request", value: "" },
    ...input.requests
      .filter((request) => !input.requestIdsAlreadyOnShow.has(request.id))
      .filter((request) => {
        const summary = input.summariesByRequestId[request.id];
        const totals = input.allocationTotalsByRequestId[request.id] ?? {
          totalAllocatedQuantity: 0,
          totalInProgressQuantity: 0,
          totalPrintedQuantity: 0,
        };
        const totalRequestedQuantity = summary?.totalQuantity ?? 0;
        // Nothing left to attach anywhere (fully queued / printed).
        if (
          totalRequestedQuantity > 0 &&
          totals.totalAllocatedQuantity >= totalRequestedQuantity
        ) {
          return false;
        }
        return !isPrintRequestFullyPrinted({
          status: request.status,
          totalRequestedQuantity,
          totalAllocatedQuantity: totals.totalAllocatedQuantity,
          totalInProgressQuantity: totals.totalInProgressQuantity,
          totalPrintedQuantity: totals.totalPrintedQuantity,
        });
      })
      .map((request) => ({ label: request.name, value: request.id })),
  ];
}

/**
 * Resolves the tab a Show Queue "Attached Print Requests" deep link should open. Prefers the
 * matched request's own server-maintained `queueTab` (already present on any request loaded via a
 * paged tab query or a direct-ID fetch) since it reflects the request's persisted state, not a
 * point-in-time local snapshot. Falls back to a live `derivePrintRequestListTab` recomputation only
 * when `queueTab` is absent (pre-backfill legacy documents) — this is the same fallback the field's
 * own doc comment already prescribes, not a new behavior.
 *
 * The prior implementation always recomputed the tab from locally-cached summary/allocation-totals
 * inputs, one of which (`usePrintRequestAllocationTotals`) is fetched once per page mount and never
 * refreshed — after adding a request to a show without remounting the page, those inputs remain the
 * pre-add zero/default values for the rest of that page session, deterministically producing the
 * wrong tab (`working`) even though the request's real `queueTab` had already updated.
 */
export function resolveShowQueuePrintRequestLinkTab(input: {
  matchedRequest: Pick<PrintRequest, "queueTab" | "status"> | undefined;
  totalRequestedQuantity: number;
  totalAllocatedQuantity: number;
  totalInProgressQuantity: number;
  totalPrintedQuantity: number;
}): PrintRequestListTab {
  if (input.matchedRequest?.queueTab) {
    return input.matchedRequest.queueTab;
  }

  return derivePrintRequestListTab({
    totalRequestedQuantity: input.totalRequestedQuantity,
    totalAllocatedQuantity: input.totalAllocatedQuantity,
    totalInProgressQuantity: input.totalInProgressQuantity,
    totalPrintedQuantity: input.totalPrintedQuantity,
    status: input.matchedRequest?.status ?? "active",
  });
}

export function mergeShowQueuePrintRequestSources(
  sources: ShowQueuePrintRequestSource[],
): {
  requests: PrintRequest[];
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
} {
  const requestsById = new Map<string, PrintRequest>();
  const summariesByRequestId: Record<string, PrintRequestItemSummary> = {};

  for (const source of sources) {
    // Tracks only the IDs THIS source's own iteration admits, so the summary step below can never
    // attribute a summary to a source that never actually contributed that request — checking the
    // cross-source `requestsById` accumulator instead would let an unrelated, differently-fetched
    // source silently overwrite an already-correct summary for the same request ID whenever that
    // request is (legitimately) force-loaded into more than one source (Implementation Review
    // finding, 2026-08-03).
    const admittedIdsThisSource = new Set<string>();
    for (const request of source.requests) {
      // A request force-loaded by ID (e.g. attached to this show but outside its owning source's
      // paged tab query) can land in a source whose tab does not match the request's own
      // server-maintained `queueTab`. Only admit it into a source's contribution when the two
      // agree, or when `queueTab` is absent (pre-backfill legacy documents, for which no source is
      // more "correct" than another) — this keeps `mergeShowQueuePrintRequestSources`'s output from
      // ever claiming a Queued request is Working-tab data.
      if (request.queueTab && request.queueTab !== source.tab) {
        continue;
      }
      requestsById.set(request.id, request);
      admittedIdsThisSource.add(request.id);
    }
    Object.assign(
      summariesByRequestId,
      Object.fromEntries(
        Object.entries(source.summariesByRequestId).filter(([requestId]) =>
          admittedIdsThisSource.has(requestId),
        ),
      ),
    );
  }

  return {
    requests: [...requestsById.values()],
    summariesByRequestId,
  };
}

export async function loadMoreShowQueuePrintRequestSources(
  sources: ShowQueuePrintRequestSource[],
): Promise<void> {
  await Promise.all(sources.filter((source) => source.hasMore).map((source) => source.loadMore()));
}
