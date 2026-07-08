import type { Design } from "../../designs/types/design.types";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";

function compareById(leftDesign: Design, rightDesign: Design): number {
  return leftDesign.id.localeCompare(rightDesign.id);
}

/** Tab-aware inbox queue order — tie-breaker is always design id ascending. */
export function sortInboxDesigns(designs: Design[], tab: AiReviewInboxTab): Design[] {
  const sortedDesigns = [...designs].sort((leftDesign, rightDesign) => {
    if (tab === "needs_review" || tab === "rejected") {
      const leftMillis = leftDesign.updatedAt.toMillis();
      const rightMillis = rightDesign.updatedAt.toMillis();

      if (leftMillis !== rightMillis) {
        return rightMillis - leftMillis;
      }

      return compareById(leftDesign, rightDesign);
    }

    const leftMillis = leftDesign.createdAt.toMillis();
    const rightMillis = rightDesign.createdAt.toMillis();

    if (leftMillis !== rightMillis) {
      return leftMillis - rightMillis;
    }

    return compareById(leftDesign, rightDesign);
  });

  return sortedDesigns;
}
