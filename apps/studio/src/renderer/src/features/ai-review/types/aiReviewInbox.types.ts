import type { DesignListQuery } from "../../designs/types/designQuery.types";
import type { ArtworkBackgroundPreset } from "../../designs/types/designForm.types";

export type AiReviewInboxTab = "processing" | "needs_review" | "rejected";

export interface AiReviewInboxFilters {
  tab: AiReviewInboxTab;
}

export interface AiReviewDraftForm {
  title: string;
  description: string;
  categoryId: string;
  tagsInput: string;
  /** Set when AI or catalog tags were shortened or omitted for display limits. */
  tagsAdjustmentNote?: string;
  /** Staff Halftone toggle — authoritative on approve. */
  markAsHalftone: boolean;
  artworkBackgroundPreset: ArtworkBackgroundPreset;
  artworkBackgroundCustomHex: string;
}

export interface AiReviewInboxListQuery extends DesignListQuery {
  inboxTab: AiReviewInboxTab;
}
