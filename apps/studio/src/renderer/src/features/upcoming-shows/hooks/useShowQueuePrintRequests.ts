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
  const { ensureRequestsLoaded } = working;

  const sources = useMemo<ShowQueuePrintRequestSource[]>(
    () => [working, queued, printing],
    [printing, queued, working],
  );
  const attachedIdsKey = useMemo(
    () => [...new Set(attachedRequestIds)].sort().join("|"),
    [attachedRequestIds],
  );

  useEffect(() => {
    if (!attachedIdsKey) {
      return;
    }
    void ensureRequestsLoaded(attachedIdsKey.split("|"));
  }, [attachedIdsKey, ensureRequestsLoaded]);

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
