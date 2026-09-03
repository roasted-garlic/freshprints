import type { Timestamp } from "firebase/firestore";

import type { PrintSizeSource } from "@fresh-prints/shared/types/printSize/printSize.types";
import type { DesignAiAnalysis, DesignAiSuggestions, AiProcessingStage } from "@fresh-prints/shared/types/ai/aiProcessing.types";
import type { DesignSmartProfile, SmartProfileDimensionLists } from "@fresh-prints/shared/types/catalog/smartProfile.types";
import type {
  ArtworkBackgroundSource,
  HalftoneDecisionSource,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import type { ArtworkPlacement } from "@fresh-prints/shared/constants/design/artworkPlacement.constants";
import type { AiReviewStatus } from "./aiReview.types";
import type { DesignStatus } from "./designStatus.types";

export type { PrintSizeSource } from "@fresh-prints/shared/types/printSize/printSize.types";
export type { ArtworkPlacement } from "@fresh-prints/shared/constants/design/artworkPlacement.constants";

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
  /**
   * Optional mat / OG letterbox background (`#rrggbb`).
   * Missing → Portal/Studio artwork grey `#e5e7eb`.
   */
  artworkBackgroundHex?: string;
  /**
   * How `artworkBackgroundHex` was established (import override, code auto, staff edit, …).
   * Display provenance only — not a semantic/halftone signal.
   */
  artworkBackgroundSource?: ArtworkBackgroundSource;
  /**
   * Optional staff-managed artwork garment placement (display label "Placement").
   * Missing → Unspecified. Allowlisted values only; unknown/legacy strings map to undefined on
   * read — see `parseArtworkPlacement`. No migration/backfill.
   */
  artworkPlacement?: ArtworkPlacement;
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
  /** Set when this design was promoted from a Portal customer upload (Sub-phase E). */
  sourceCustomerUploadId?: string;
  wasUpscaled?: boolean;
  upscaleFactor?: number;
  upscalePassCount?: 0 | 1 | 2;
  /** Native production pixels before any upscale pass (provenance). */
  nativeProductionWidthPx?: number;
  nativeProductionHeightPx?: number;
  interactiveEnhancedOriginalPath?: string;
  interactiveEnhancedWidthPx?: number;
  interactiveEnhancedHeightPx?: number;
  interactiveEnhanceGeneratedAt?: unknown;
  approvedMaxPrintWidthInches?: number;
  approvedMaxPrintHeightInches?: number;
  sizingPolicyVersion?: string;
  sizingWarningCode?: string;
  halftoneDetection?: import("@fresh-prints/shared/types/halftone/halftone.types").HalftoneDetectionPersisted;
  halftoneSubmitterResponse?: import("@fresh-prints/shared/types/halftone/halftone.types").HalftoneSubmitterResponsePersisted;
  halftoneStaffDecision?: import("@fresh-prints/shared/types/halftone/halftone.types").HalftoneStaffDecisionPersisted;
  /** Provenance for staff/import/intake halftone decisions when known. */
  halftoneDecisionSource?: HalftoneDecisionSource;
  /**
   * @deprecated Legacy transitive `companionSets/{id}` pointer, replaced 2026-08-09 by pairwise
   * `companionDesignIds`. No longer written for new links; healed (deleted) on the next pairwise
   * link/unlink touch to this design. Ignored for status/matching — use `companionDesignIds`.
   */
  companionSetId?: string;
  /**
   * Direct companion neighbor IDs only (no transitive closure) — the pairwise, non-transitive
   * replacement for the old `companionSetId` group pointer. Symmetric: if `b` appears here on
   * design `a`, `a` appears on design `b`. Bounded to 50 entries. Managed exclusively by
   * `companionSetService` (transaction writes directly on this document) — never through
   * `updateDesign`.
   */
  companionDesignIds?: string[];
  /**
   * Staff working-queue flag ("Needs Companion"). **Unlinked-only**: `true` means staff is still
   * waiting to link this design and it has no companion neighbors (`companionDesignIds` empty).
   * Cleared as soon as the design gets its first link — see `companionSetService.linkDesign` —
   * and never auto-raised on unlink. A design with any neighbor is always "Linked", regardless
   * of this flag. Managed exclusively by `companionSetService`. Never customer-facing.
   */
  companionSetIncomplete?: boolean;
  /**
   * Staff-only human classification ("Explicit Content" in Studio, "Censored Content" in
   * Portal). Missing/undefined ⇒ not explicit. AI must not set this field.
   */
  isExplicitContent?: boolean;
  /**
   * Staff-entered words/phrases to mask in Portal title/description while Censored mode is on
   * and `isExplicitContent` is true. Missing/empty = no text masking. Kept if Explicit is later
   * turned off (inactive until Explicit is on again). Does not alter stored title/description.
   */
  censoredTerms?: string[];
  queueCount: number;
  requestCount?: number;
  showAddCount?: number;
  printCount?: number;
  lastRequestedAt?: Timestamp;
  lastAddedToShowAt?: Timestamp;
  lastPrintedAt?: Timestamp;
  /**
   * Most recent transition into `status: "ready"` — the canonical default catalog ordering key
   * (Owner QA Amendment 3). Set on approval into ready and refreshed when a reprocessed design is
   * approved back into ready. Never changed by title/tag/category/description/background/sizing or
   * any request/show metadata edit. Absent on legacy designs approved before this field existed;
   * consumers fall back to `createdAt` for those (see resolveReadyOrderMillis).
   */
  readyAt?: Timestamp;
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
  /** Versioned Smart Profile / search intelligence (Functions-owned generation). */
  smartProfile?: DesignSmartProfile;
  /** Last raw AI dimension snapshot before staff merge (Functions-owned). */
  smartProfileAiSnapshot?: SmartProfileDimensionLists;
  /** Smart Profile import presets from Studio session state (durable; persisted on design create). */
  smartProfileImportPresets?: Partial<SmartProfileDimensionLists>;
  /** Batch import job id when design was created from a folder/ZIP/multi-PNG batch. */
  importBatchId?: string;
  /** Original source filename at import (audit/context only). */
  importSourceFileName?: string;
  /** Relative path within folder/ZIP when available. */
  importRelativePath?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Operational status captured when entering `archived`. */
  previousStatus?: DesignStatus;
  archivedAt?: Timestamp;
  archivedBy?: string;
  /** Set by owner purge callable when originals/previews are deleted (thumbnail kept). */
  assetsPurgedAt?: Timestamp;
  assetsPurgedBy?: string;
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
  wasUpscaled?: boolean;
  upscaleFactor?: number;
  upscalePassCount?: 0 | 1;
  approvedMaxPrintWidthInches?: number;
  approvedMaxPrintHeightInches?: number;
  sizingPolicyVersion?: string;
  sizingWarningCode?: string;
  /**
   * Optional mat (`#rrggbb`). Omit / do not pass grey default — missing means display grey.
   */
  artworkBackgroundHex?: string;
  artworkBackgroundSource?: ArtworkBackgroundSource;
  halftoneDetection?: import("@fresh-prints/shared/types/halftone/halftone.types").HalftoneDetectionPersisted;
  halftoneStaffDecision?: import("@fresh-prints/shared/types/halftone/halftone.types").HalftoneStaffDecisionPersisted;
  halftoneDecisionSource?: HalftoneDecisionSource;
  aiReviewStatus?: AiReviewStatus;
  aiProcessed?: boolean;
  aiReviewed?: boolean;
  importBatchId?: string;
  importSourceFileName?: string;
  importRelativePath?: string;
  /** Smart Profile import presets from Studio session state (optional). */
  smartProfileImportPresets?: Partial<SmartProfileDimensionLists>;
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
    | "halftoneStaffDecision"
    | "isExplicitContent"
    | "censoredTerms"
  >
> & {
  /**
   * Set a normalized `#rrggbb`, or `null` / `""` to clear (default grey).
   * Staff writes also set `artworkBackgroundSource` to `staff_manual`.
   */
  artworkBackgroundHex?: string | null;
  artworkBackgroundSource?: ArtworkBackgroundSource | null;
  halftoneDecisionSource?: HalftoneDecisionSource | null;
  /**
   * Set an allowlisted placement, or `null` to clear (Unspecified).
   */
  artworkPlacement?: ArtworkPlacement | null;
};

/**
 * Same-stack authority snapshot: mapped Design plus raw Firestore fields safe for
 * `mergeDesignDocumentDataAfterWrite` when skipping a redundant pre-write getDoc.
 */
export interface DesignAuthoritySnapshot {
  design: Design;
  documentData: Record<string, unknown>;
}
