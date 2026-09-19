import type { AiReviewInboxSortOrder } from "../types/aiReviewInbox.types";

export const AI_REVIEW_INBOX_SORT_PREFERENCE_KEY =
  "fresh-prints.ai-review.inbox-sort-order";

/**
 * Workspace-level AI Review queue sort preference.
 * Unset means the existing tab-specific default remains in effect.
 */
export function readAiReviewInboxSortPreference(): AiReviewInboxSortOrder | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = window.localStorage.getItem(AI_REVIEW_INBOX_SORT_PREFERENCE_KEY);
  return value === "newest" || value === "oldest" ? value : undefined;
}

export function writeAiReviewInboxSortPreference(sortOrder: AiReviewInboxSortOrder): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AI_REVIEW_INBOX_SORT_PREFERENCE_KEY, sortOrder);
}
