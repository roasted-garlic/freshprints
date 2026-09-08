/**
 * Shared AI processing types — used by renderer, functions, and documentation.
 */

import type { SuggestedNewTag } from "../catalogTag.types";
import type { VisualContextProfile } from "../catalog/visualContext.types";
import type { SemanticReviewDecision, SemanticReviewStatus, SemanticReviewPatch } from "../catalog/semanticReview.types";

export const AI_PROCESSING_STAGES = [
  "queued",
  "preparing_image",
  "sending_to_ai",
  "receiving_response",
  "validating_response",
  "ready_for_review",
  "failed",
] as const;

export type AiProcessingStage = (typeof AI_PROCESSING_STAGES)[number];

/** Failure diagnostics for the current processing attempt, separate from prior AI output. */
export interface DesignAiProcessingError {
  attemptId: string;
  errorCode: string;
  errorMessage: string;
  provider?: string;
  occurredAt: string;
}

export interface AiSuggestionFieldConfidence {
  title?: number;
  description?: number;
  categoryId?: number;
  /** @deprecated Historical AI-tag confidence; active Pass 1 does not produce it. */
  tags?: number;
}

export interface DesignAiSuggestions {
  title?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  /** @deprecated Historical AI output; active Pass 1 never writes catalog tags. */
  tags?: string[];
  /** @deprecated Historical AI output; active Pass 1 never writes suggested tags. */
  suggestedNewTags?: SuggestedNewTag[];
  confidence?: number;
  fieldConfidence?: AiSuggestionFieldConfidence;
  provider?: string;
  model?: string;
  promptVersion?: string;
  generatedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  estimatedCostUsd?: number | null;
  /** @deprecated Retired AI tag-rerank metadata retained only for historical reads. */
  tagRerankStatus?: "skipped" | "succeeded" | "failed";
  /** @deprecated Retired AI tag-rerank metadata retained only for historical reads. */
  tagRerankFailureReason?: string;
  /** @deprecated Retired AI tag-rerank metadata retained only for historical reads. */
  tagRerankPromptTokens?: number | null;
  /** @deprecated Retired AI tag-rerank metadata retained only for historical reads. */
  tagRerankCompletionTokens?: number | null;
  /** @deprecated Retired AI tag-rerank metadata retained only for historical reads. */
  tagRerankEstimatedCostUsd?: number | null;
  /** @deprecated Retired AI tag-rerank metadata retained only for historical reads. */
  tagRerankPromptVersion?: string;
  /** @deprecated Retired AI tag-rerank metadata retained only for historical reads. */
  tagRerankUncoveredConcepts?: string[];
  /** @deprecated Retired Suggestion Author metadata retained only for historical reads. */
  suggestionAuthorStatus?: "skipped" | "succeeded" | "failed";
  /** @deprecated Retired Suggestion Author metadata retained only for historical reads. */
  suggestionAuthorFailureReason?: string;
  /** @deprecated Retired Suggestion Author metadata retained only for historical reads. */
  suggestionAuthorPromptTokens?: number | null;
  /** @deprecated Retired Suggestion Author metadata retained only for historical reads. */
  suggestionAuthorCompletionTokens?: number | null;
  /** @deprecated Retired Suggestion Author metadata retained only for historical reads. */
  suggestionAuthorEstimatedCostUsd?: number | null;
  /** @deprecated Retired Suggestion Author metadata retained only for historical reads. */
  suggestionAuthorPromptVersion?: string;
  semanticReviewStatus?: SemanticReviewStatus;
  semanticReviewFailureReason?: string;
  semanticReviewDecision?: SemanticReviewDecision;
  semanticReviewReason?: string;
  semanticReviewPromptTokens?: number | null;
  semanticReviewCompletionTokens?: number | null;
  semanticReviewEstimatedCostUsd?: number | null;
  semanticReviewPromptVersion?: string;
  semanticReviewModel?: string;
  semanticReviewProvider?: string;
  semanticReviewBlockersResolved?: string[];
  semanticReviewBlockersUnresolved?: string[];
  semanticReviewPatchesApplied?: SemanticReviewPatch[];
}

export interface DesignAiAnalysis {
  visualContextProfile?: VisualContextProfile;
  primarySubject?: string;
  secondarySubjects?: string[];
  theme?: string;
  holiday?: string;
  season?: string;
  style?: string;
  audience?: string;
  colorPalette?: string[];
  artworkContainsText?: boolean;
  visibleText?: string[];
  visibleTextColor?: "black" | "white" | "mixed" | "unknown";
  /** True when readable text is the entire design with no illustration/characters/icons. */
  textOnlyArtwork?: boolean;
  textRecognitionConfidence?: number;
  spellingConfidence?: number;
  transparencyConfidence?: number;
  estimatedPrintComplexity?: string;
  trademarkWarning?: string;
  overallConfidence?: number;
  /** @deprecated Historical transient AI-tag input; active Pass 1 does not consume or persist it. */
  rawTags?: string[];
  /**
   * Raw model category candidate (freeform, not guaranteed to match an approved category name).
   * Historical transient category candidate. Active Pass 1 uses exact category
   * trust and does not use AI tags or matchedTags as authority.
   */
  rawCategory?: string;
  /** Shadow halftone evidence only — never drives staff halftone decision (ADR-FP-080). */
  halftoneShadowAssessment?: import("../catalog/smartProfile.types").HalftoneShadowAssessment;
  /**
   * Transient Smart Profile parse payload from enrichment JSON — deleted before Firestore write.
   */
  smartProfileEnrichmentParse?: import("../catalog/smartProfile.types").SmartProfileEnrichmentParse;
  /**
   * Transient pre-sanitize artwork text lines for Explicit Content Automation.
   * Deleted before Firestore write — not persisted.
   */
  explicitContentArtworkEvidence?: string[];
}

export const AI_PROCESSING_STAGE_LABELS: Record<AiProcessingStage, string> = {
  queued: "Queued for AI",
  preparing_image: "Preparing image",
  sending_to_ai: "Sending to AI",
  receiving_response: "Receiving response",
  validating_response: "Validating response",
  ready_for_review: "Ready for review",
  failed: "AI processing failed",
};
