import type { Design } from "../../designs/types/design.types";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";
import { designMatchesInboxTab } from "./aiReviewInboxEligibility";

export const REJECTED_REOPEN_TARGET_TAB = "needs_review" as const;
export const REJECTED_RERUN_TARGET_TAB = "processing" as const;

export interface PendingCrossTabSelection {
  designId: string;
  tab: AiReviewInboxTab;
}

export function resolveRejectedReopenTargetTab(): typeof REJECTED_REOPEN_TARGET_TAB {
  return REJECTED_REOPEN_TARGET_TAB;
}

export function resolveRejectedRerunTargetTab(): typeof REJECTED_RERUN_TARGET_TAB {
  return REJECTED_RERUN_TARGET_TAB;
}

export function shouldSuppressDefaultInboxSelection(input: {
  pendingCrossTabSelection: PendingCrossTabSelection | null;
  selectedDesignId: string | null;
  tab: AiReviewInboxTab;
}): boolean {
  if (!input.pendingCrossTabSelection) {
    return false;
  }

  if (input.pendingCrossTabSelection.tab !== input.tab) {
    return false;
  }

  return input.pendingCrossTabSelection.designId === input.selectedDesignId;
}

export function resolvePendingCrossTabDesign(
  designs: Design[],
  pendingCrossTabSelection: PendingCrossTabSelection | null,
  tab: AiReviewInboxTab,
): Design | null {
  if (!pendingCrossTabSelection || pendingCrossTabSelection.tab !== tab) {
    return null;
  }

  return designs.find((design) => design.id === pendingCrossTabSelection.designId) ?? null;
}

export function shouldRetainCrossTabSelection(input: {
  designs: Design[];
  pendingCrossTabSelection: PendingCrossTabSelection | null;
  selectedDesignId: string | null;
  tab: AiReviewInboxTab;
}): boolean {
  if (!input.pendingCrossTabSelection) {
    return false;
  }

  if (input.pendingCrossTabSelection.tab !== input.tab) {
    return false;
  }

  if (input.pendingCrossTabSelection.designId !== input.selectedDesignId) {
    return false;
  }

  return !input.designs.some((design) => design.id === input.pendingCrossTabSelection!.designId);
}

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
