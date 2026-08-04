import { useCallback, useEffect, useMemo } from "react";

import { usePrintRequests } from "../../print-requests/hooks/usePrintRequests";
import {
  loadMoreShowQueuePrintRequestSources,
  mergeShowQueuePrintRequestSources,
  type ShowQueuePrintRequestSource,
} from "../utils/showQueuePrintRequestSources";

export function useShowQueuePrintRequests(attachedRequestIds: string[]) {
  const working = usePrintRequests("working");
  const queued = usePrintRequests("queued");
  const printing = usePrintRequests("printing");
  const { ensureRequestsLoaded: ensureWorkingRequestsLoaded } = working;
  const { ensureRequestsLoaded: ensureQueuedRequestsLoaded } = queued;
  const { ensureRequestsLoaded: ensurePrintingRequestsLoaded } = printing;

  const sources = useMemo<ShowQueuePrintRequestSource[]>(
    () => [
      { ...working, tab: "working" as const },
      { ...queued, tab: "queued" as const },
      { ...printing, tab: "printing" as const },
    ],
    [printing, queued, working],
  );
  const attachedIdsKey = useMemo(
    () => [...new Set(attachedRequestIds)].sort().join("|"),
    [attachedRequestIds],
  );

  // Every source's own `ensureRequestsLoaded` must fetch the full attached-ID set — an attached
  // request can be Working, Queued, or Printing, and each source only admits a fetched request
  // into `mergeShowQueuePrintRequestSources`'s output when its own tab matches that request's
  // `queueTab` (see that function). Calling this on only one source would silently drop any
  // attached request whose tab isn't that one source's tab and isn't already on that tab's own
  // loaded page.
  useEffect(() => {
    if (!attachedIdsKey) {
      return;
    }
    const attachedIds = attachedIdsKey.split("|");
    void ensureWorkingRequestsLoaded(attachedIds);
    void ensureQueuedRequestsLoaded(attachedIds);
    void ensurePrintingRequestsLoaded(attachedIds);
  }, [attachedIdsKey, ensureWorkingRequestsLoaded, ensureQueuedRequestsLoaded, ensurePrintingRequestsLoaded]);

  const merged = useMemo(() => mergeShowQueuePrintRequestSources(sources), [sources]);
  const loadMore = useCallback(
    async () => loadMoreShowQueuePrintRequestSources(sources),
    [sources],
  );

  return {
    ...merged,
    hasMore: sources.some((source) => source.hasMore),
    isLoadingMore: sources.some((source) => source.isLoadingMore),
    loadMore,
  };
}
