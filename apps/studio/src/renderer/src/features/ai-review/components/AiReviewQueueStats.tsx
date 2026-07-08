import { AI_REVIEW_INBOX_TABS } from "../constants/aiReviewInboxConstants";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";

export interface AiReviewTabCounts {
  processing: number | null;
  needs_review: number | null;
  rejected: number | null;
}

interface AiReviewQueueStatsProps {
  counts: AiReviewTabCounts;
  hasMoreByTab: Partial<Record<AiReviewInboxTab, boolean>>;
  isLoading: boolean;
}

function formatCount(count: number | null, hasMore: boolean): string {
  if (count === null) {
    return "—";
  }

  return hasMore ? `${count}+` : String(count);
}

export function AiReviewQueueStats({ counts, hasMoreByTab, isLoading }: AiReviewQueueStatsProps) {
  return (
    <div aria-label="Queue statistics" className="ai-review-queue-stats">
      {AI_REVIEW_INBOX_TABS.map((tab) => (
        <div className="ai-review-queue-stat" key={tab.id}>
          <span className="ai-review-queue-stat-label">{tab.label}</span>
          <span className="ai-review-queue-stat-value">
            {isLoading ? "…" : formatCount(counts[tab.id], Boolean(hasMoreByTab[tab.id]))}
          </span>
        </div>
      ))}
    </div>
  );
}
