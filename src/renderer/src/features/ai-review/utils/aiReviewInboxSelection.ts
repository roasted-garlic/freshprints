import type { Design } from "../../designs/types/design.types";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";
import { designMatchesInboxTab } from "./aiReviewInboxEligibility";

export function resolveIsPinnedNeedsReviewDesign(input: {
  tab: AiReviewInboxTab;
  selectedDesignId: string | null;
  liveDesignId: string | null | undefined;
  isRerunningAi: boolean;
}): boolean {
  return Boolean(
    input.tab === "needs_review" &&
      input.selectedDesignId &&
      input.liveDesignId === input.selectedDesignId &&
      input.isRerunningAi,
  );
}

export function shouldUseLiveDesignForSelection(input: {
  liveDesign: Design | null;
  selectedDesignId: string | null;
  tab: AiReviewInboxTab;
  isPinnedNeedsReviewDesign: boolean;
}): boolean {
  if (!input.liveDesign || input.liveDesign.id !== input.selectedDesignId) {
    return false;
  }

  return (
    designMatchesInboxTab(input.liveDesign, input.tab) || input.isPinnedNeedsReviewDesign
  );
}

export function shouldPrependPinnedDesignToInbox(input: {
  isPinnedNeedsReviewDesign: boolean;
  liveDesign: Design | null;
  sortedDesignIds: string[];
}): boolean {
  return Boolean(
    input.isPinnedNeedsReviewDesign &&
      input.liveDesign &&
      !input.sortedDesignIds.includes(input.liveDesign.id),
  );
}
