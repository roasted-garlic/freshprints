import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { isPrintRequestFullyPrinted } from "@fresh-prints/shared/utils/printRequestQueueState";

import type { PrintRequestItemSummary } from "../../print-requests/services/printRequestService";

export interface ShowQueuePrintRequestSource {
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
        return !isPrintRequestFullyPrinted({
          status: request.status,
          totalRequestedQuantity: summary?.totalQuantity ?? 0,
          totalAllocatedQuantity: totals.totalAllocatedQuantity,
          totalInProgressQuantity: totals.totalInProgressQuantity,
          totalPrintedQuantity: totals.totalPrintedQuantity,
        });
      })
      .map((request) => ({ label: request.name, value: request.id })),
  ];
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
    for (const request of source.requests) {
      requestsById.set(request.id, request);
    }
    Object.assign(summariesByRequestId, source.summariesByRequestId);
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
