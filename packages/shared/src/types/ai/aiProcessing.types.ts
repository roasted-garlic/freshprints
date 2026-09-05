/**
 * Shared AI processing types — used by renderer, functions, and documentation.
 */

import type { SuggestedNewTag } from "../catalogTag.types";

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

export interface AiSuggestionFieldConfidence {
  title?: number;
  description?: number;
  categoryId?: number;
  tags?: number;
}

export interface DesignAiSuggestions {
  title?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
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
  /**
   * Status of the optional text-only tag reranker second call. "skipped" means tagRerankMode was
   * off or the auto heuristic did not trigger for this design (no second call was made). Never
   * set at all on designs processed before this feature shipped.
   */
  tagRerankStatus?: "skipped" | "succeeded" | "failed";
  /** Set only when tagRerankStatus is "failed" — why the second call did not produce usable output. */
  tagRerankFailureReason?: string;
  tagRerankPromptTokens?: number | null;
  tagRerankCompletionTokens?: number | null;
  tagRerankEstimatedCostUsd?: number | null;
  tagRerankPromptVersion?: string;
  /**
   * Concepts the reranker flagged as important but not covered by approvedTagCandidates. Feeds
   * suggestedNewTags generation only — never a source of persisted final tags directly.
   */
  tagRerankUncoveredConcepts?: string[];
  /**
   * Status of the optional AI-authored suggested-tag quality call. "skipped" means the
   * last-resort gate did not fire for this design (no suggestions were needed at all) or
   * suggestionAuthorMode was off (server-templated suggestions were used instead, if any).
   * Distinct from tagRerankStatus — these are two independent optional calls that may or may not
   * share a single physical request (see plan §2.4). Never set on designs processed before this
   * feature shipped.
   */
  suggestionAuthorStatus?: "skipped" | "succeeded" | "failed";
  /** Set only when suggestionAuthorStatus is "failed" — why the call did not produce usable output. */
  suggestionAuthorFailureReason?: string;
  suggestionAuthorPromptTokens?: number | null;
  suggestionAuthorCompletionTokens?: number | null;
  suggestionAuthorEstimatedCostUsd?: number | null;
  suggestionAuthorPromptVersion?: string;
}

export interface DesignAiAnalysis {
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
  /**
   * Raw model tag strings before single-word tokenization. Preserves multi-word tags/aliases
   * (e.g. "rock and roll") so the catalog tag resolver can match them against approved names
   * and aliases. Transient pipeline signal — not persisted with the design.
   */
  rawTags?: string[];
  /**
   * Raw model category candidate (freeform, not guaranteed to match an approved category name).
   * Used only as a scoring signal by the server-side theme/category resolver, alongside
   * title/description/visibleText/matchedTags. Transient pipeline signal — never persisted as the
   * final category and always deleted before the design write, same as rawTags.
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
