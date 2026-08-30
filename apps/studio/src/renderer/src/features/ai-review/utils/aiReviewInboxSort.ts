import type { Design } from "../../designs/types/design.types";
import type { DesignListSortDirection } from "../../designs/types/designQuery.types";
import type { AiReviewInboxSortOrder, AiReviewInboxTab } from "../types/aiReviewInbox.types";

function compareById(leftDesign: Design, rightDesign: Design): number {
  return leftDesign.id.localeCompare(rightDesign.id);
}

export function getDefaultAiReviewInboxSortOrder(tab: AiReviewInboxTab): AiReviewInboxSortOrder {
  return tab === "processing" ? "oldest" : "newest";
}

export function resolveAiReviewInboxSortOrder(
  tab: AiReviewInboxTab,
  sortOrder?: AiReviewInboxSortOrder,
): AiReviewInboxSortOrder {
  return sortOrder ?? getDefaultAiReviewInboxSortOrder(tab);
}

export function resolveAiReviewInboxSortDirection(
  tab: AiReviewInboxTab,
  sortOrder?: AiReviewInboxSortOrder,
): DesignListSortDirection {
  const resolved = resolveAiReviewInboxSortOrder(tab, sortOrder);
  return resolved === "newest" ? "desc" : "asc";
}

export function getAiReviewInboxSortField(tab: AiReviewInboxTab): "createdAt" | "updatedAt" {
  return tab === "processing" ? "createdAt" : "updatedAt";
}

export function getAiReviewInboxSortLabel(sortOrder: AiReviewInboxSortOrder): string {
  return sortOrder === "newest" ? "Newest first" : "Oldest first";
}

/** Tab-aware inbox queue order — tie-breaker is always design id ascending. */
export function sortInboxDesigns(
  designs: Design[],
  tab: AiReviewInboxTab,
  sortOrder?: AiReviewInboxSortOrder,
): Design[] {
  const sortDirection = resolveAiReviewInboxSortDirection(tab, sortOrder);
  const timeField = getAiReviewInboxSortField(tab);

  return [...designs].sort((leftDesign, rightDesign) => {
    const leftMillis = leftDesign[timeField].toMillis();
    const rightMillis = rightDesign[timeField].toMillis();

    if (leftMillis !== rightMillis) {
      return sortDirection === "desc" ? rightMillis - leftMillis : leftMillis - rightMillis;
    }

    return compareById(leftDesign, rightDesign);
  });
}
