import type { Design } from "../../designs/types/design.types";
import { resolveDesignAiReviewDisplay } from "../../designs/utils/aiReviewState";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";
import { designHasAiSuggestions, resolveAiProcessingOutputStatus } from "./aiProcessingOutput";

export function designMatchesInboxTab(design: Design, tab: AiReviewInboxTab): boolean {
  const review = resolveDesignAiReviewDisplay(design);

  switch (tab) {
    case "processing":
      return (
        (design.status === "imported" || design.status === "processing") &&
        review.aiReviewStatus === "pending"
      );
    case "needs_review":
      return design.status === "imported" && review.aiReviewStatus === "needs_review";
    case "rejected":
      return design.status === "rejected";
    default:
      return false;
  }
}

export function isDesignApprovableInInbox(design: Design, tab: AiReviewInboxTab): boolean {
  return (
    tab === "needs_review" &&
    designMatchesInboxTab(design, tab) &&
    resolveAiProcessingOutputStatus(design) === "ready"
  );
}

export function isDesignRejectableInInbox(design: Design, tab: AiReviewInboxTab): boolean {
  return (
    tab === "needs_review" &&
    designMatchesInboxTab(design, tab) &&
    resolveAiProcessingOutputStatus(design) === "ready"
  );
}

export function isDesignReopenableInInbox(design: Design, tab: AiReviewInboxTab): boolean {
  return tab === "rejected" && design.status === "rejected";
}

export function isDesignRerunnableInInbox(design: Design, tab: AiReviewInboxTab): boolean {
  return tab === "rejected" && design.status === "rejected";
}

export function isDesignRetryableInProcessing(design: Design, tab: AiReviewInboxTab): boolean {
  return tab === "processing" && resolveAiProcessingOutputStatus(design) === "failed";
}

/** Matches server isRerunFromReviewEligible + client output preconditions. */
export function isDesignRerunnableFromNeedsReview(design: Design): boolean {
  const review = resolveDesignAiReviewDisplay(design);
  const outputStatus = resolveAiProcessingOutputStatus(design);

  return (
    design.status === "imported" &&
    review.aiReviewStatus === "needs_review" &&
    (designHasAiSuggestions(design) || outputStatus === "failed")
  );
}

export function canEditCatalogInInbox(tab: AiReviewInboxTab): boolean {
  return tab === "needs_review";
}
