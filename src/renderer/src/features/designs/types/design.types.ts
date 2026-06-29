import type { Timestamp } from "firebase/firestore";

import type { PrintSizeSource } from "../../../../../../shared/types/printSize/printSize.types";
import type { DesignAiAnalysis, DesignAiSuggestions, AiProcessingStage } from "../../../../../../shared/types/ai/aiProcessing.types";
import type { AiReviewStatus } from "./aiReview.types";
import type { DesignStatus } from "./designStatus.types";

export type { PrintSizeSource } from "../../../../../../shared/types/printSize/printSize.types";

export interface Design {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  status: DesignStatus;
  originalPath: string;
  thumbnailPath: string;
  previewPath?: string;
  /** Pixel width from the source PNG IHDR chunk. */
  width?: number;
  /** Pixel height from the source PNG IHDR chunk. */
  height?: number;
  /**
   * Legacy import metadata DPI (`min(metadataDpiX, metadataDpiY)` at import time).
   * Retained for backward compatibility with existing records and the current import pipeline.
   * Do not use as the production DPI source — prefer `effectiveDpi`.
   */
  dpi?: number;
  /** Staff-facing intended production width in inches. */
  printWidthInches?: number;
  /** Staff-facing intended production height in inches. */
  printHeightInches?: number;
  /** When true, print height follows width edits using pixel aspect ratio. */
  printAspectRatioLocked?: boolean;
  /** Embedded PNG `pHYs` DPI on the X axis at import (audit only). */
  metadataDpiX?: number;
  /** Embedded PNG `pHYs` DPI on the Y axis at import (audit only). */
  metadataDpiY?: number;
  /**
   * Production-facing effective DPI at declared print size.
   * Derived from pixels and print inches — not manually edited.
   */
  effectiveDpi?: number;
  /** Provenance for how print size fields were established. */
  printSizeSource?: PrintSizeSource;
  uploadedBy: string;
  requestedByCustomerId?: string;
  queueCount: number;
  requestCount?: number;
  showAddCount?: number;
  printCount?: number;
  lastRequestedAt?: Timestamp;
  lastAddedToShowAt?: Timestamp;
  lastPrintedAt?: Timestamp;
  /** True when an AI review pipeline has processed this design. */
  aiProcessed: boolean;
  /**
   * Legacy boolean approval flag. Prefer `aiReviewStatus === "approved"`.
   * Kept in sync by `designAiReviewService`.
   */
  aiReviewed: boolean;
  /** AI review outcome — separate from operational `status`. */
  aiReviewStatus?: AiReviewStatus;
  /** When the current AI review outcome was recorded. */
  aiReviewedAt?: Timestamp;
  /** Staff user ID who recorded the current AI review outcome. */
  aiReviewedBy?: string;
  /** Provider or ruleset version used for the review. */
  aiReviewVersion?: string;
  /** Staff- or AI-authored review notes. */
  aiReviewNotes?: string;
  /** Normalized confidence score between 0 and 1 when available. */
  aiReviewConfidence?: number;
  /** Background AI pipeline stage (Cloud Function owned). */
  aiProcessingStage?: AiProcessingStage;
  /** AI-generated catalog suggestions — separate from approved catalog fields. */
  aiSuggestions?: DesignAiSuggestions;
  /** Rich AI analysis metadata for future features. */
  aiAnalysis?: DesignAiAnalysis;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Operational status captured when entering `archived`. */
  previousStatus?: DesignStatus;
  archivedAt?: Timestamp;
  archivedBy?: string;
}

export interface CreateDesignInput {
  id?: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  status?: DesignStatus;
  originalPath?: string;
  thumbnailPath?: string;
  previewPath?: string;
  width?: number;
  height?: number;
  dpi?: number;
  printWidthInches?: number;
  printHeightInches?: number;
  printAspectRatioLocked?: boolean;
  metadataDpiX?: number;
  metadataDpiY?: number;
  effectiveDpi?: number;
  printSizeSource?: PrintSizeSource;
  requestedByCustomerId?: string;
  aiReviewStatus?: AiReviewStatus;
  aiProcessed?: boolean;
  aiReviewed?: boolean;
}

export type UpdateDesignInput = Partial<
  Pick<
    Design,
    | "title"
    | "description"
    | "categoryId"
    | "tags"
    | "status"
    | "originalPath"
    | "thumbnailPath"
    | "previewPath"
    | "width"
    | "height"
    | "dpi"
    | "printWidthInches"
    | "printHeightInches"
    | "printAspectRatioLocked"
    | "effectiveDpi"
    | "printSizeSource"
    | "requestedByCustomerId"
  >
>;
