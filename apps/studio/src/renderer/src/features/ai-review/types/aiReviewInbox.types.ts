import type { DesignListQuery } from "../../designs/types/designQuery.types";
import type { ArtworkBackgroundPreset } from "../../designs/types/designForm.types";

export type AiReviewInboxTab = "processing" | "needs_review" | "rejected";

/** Queue list order — processing uses createdAt; review tabs use updatedAt. */
export type AiReviewInboxSortOrder = "newest" | "oldest";

export interface AiReviewInboxFilters {
  tab: AiReviewInboxTab;
  searchQuery?: string;
  sortOrder?: AiReviewInboxSortOrder;
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
  /** Staff Explicit Content classification — human only; missing on design ⇒ false. */
  isExplicitContent: boolean;
  /** Chip-input string for words/phrases to censor in Portal (Censored mode). */
  censoredTermsInput: string;
  /**
   * Staff: this design expects companion artwork (may not be uploaded yet).
   * AI Review only creates/ensures an incomplete set — full link/unlink is Design Library.
   */
  expectsCompanions: boolean;
  artworkBackgroundPreset: ArtworkBackgroundPreset;
  artworkBackgroundCustomHex: string;
}

export interface AiReviewInboxListQuery extends DesignListQuery {
  inboxTab: AiReviewInboxTab;
}
