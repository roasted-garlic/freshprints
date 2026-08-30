import { ArrowDown, ArrowUp } from "lucide-react";

import type { AiReviewInboxSortOrder } from "../types/aiReviewInbox.types";
import { getAiReviewInboxSortLabel } from "../utils/aiReviewInboxSort";

interface AiReviewInboxSortToggleProps {
  sortOrder: AiReviewInboxSortOrder;
  onToggle: () => void;
}

export function AiReviewInboxSortToggle({ onToggle, sortOrder }: AiReviewInboxSortToggleProps) {
  const label = getAiReviewInboxSortLabel(sortOrder);
  const Icon = sortOrder === "newest" ? ArrowDown : ArrowUp;

  return (
    <button
      aria-label={`${label}. Click to reverse sort order.`}
      className="icon-button icon-button-md icon-button-ghost ai-review-sort-toggle"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <Icon aria-hidden size={16} strokeWidth={2.2} />
    </button>
  );
}
