import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { designService } from "../../designs/services/designService";
import { buildAiReviewInboxListQuery } from "../constants/aiReviewInboxConstants";
import type { AiReviewTabCounts } from "../components/AiReviewQueueStats";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";
import {
  applyAiReviewTabCountDeltas,
  type AiReviewTabCountDeltas,
} from "../utils/aiReviewLocalReconciliation";

const AI_REVIEW_TABS: AiReviewInboxTab[] = ["processing", "needs_review", "rejected"];

const EMPTY_COUNTS: AiReviewTabCounts = {
  processing: null,
  needs_review: null,
  rejected: null,
};

export function useAiReviewTabCounts(refreshKey = 0) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<AiReviewTabCounts>(EMPTY_COUNTS);
  const [hasMoreByTab, setHasMoreByTab] = useState<Partial<Record<AiReviewInboxTab, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const reloadCounts = useCallback(async () => {
    if (!user) {
      setCounts(EMPTY_COUNTS);
      setHasMoreByTab({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const results = await Promise.all(
        AI_REVIEW_TABS.map(async (tab) => {
          const listQuery = buildAiReviewInboxListQuery({ tab });
          const count = await designService.countDesigns(user, listQuery);

          return {
            count,
            // Aggregation returns the full matching count — no page-peek "+" needed.
            hasMore: false,
            tab,
          };
        }),
      );

      const nextCounts: AiReviewTabCounts = { ...EMPTY_COUNTS };
      const nextHasMore: Partial<Record<AiReviewInboxTab, boolean>> = {};

      for (const result of results) {
        nextCounts[result.tab] = result.count;
        nextHasMore[result.tab] = result.hasMore;
      }

      setCounts(nextCounts);
      setHasMoreByTab(nextHasMore);
    } catch {
      setCounts(EMPTY_COUNTS);
      setHasMoreByTab({});
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Amendment 9 P0: apply local deltas after successful approve/reject/archive without
   * re-running the three-tab `countDesigns` fan-out. Processing / queue paths still use
   * `reloadCounts` via `onQueueChanged`.
   */
  const applyCountsDelta = useCallback((deltas: AiReviewTabCountDeltas) => {
    setCounts((current) => applyAiReviewTabCountDeltas(current, deltas));
  }, []);

  useEffect(() => {
    void reloadCounts();
  }, [reloadCounts, refreshKey]);

  return {
    counts,
    hasMoreByTab,
    isLoading,
    reloadCounts,
    applyCountsDelta,
  };
}
