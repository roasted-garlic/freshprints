/**
 * Shared AI processing types — used by renderer, functions, and documentation.
 */

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
  confidence?: number;
  fieldConfidence?: AiSuggestionFieldConfidence;
  provider?: string;
  model?: string;
  promptVersion?: string;
  generatedAt?: string;
  errorCode?: string;
  errorMessage?: string;
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
  textRecognitionConfidence?: number;
  spellingConfidence?: number;
  transparencyConfidence?: number;
  estimatedPrintComplexity?: string;
  trademarkWarning?: string;
  overallConfidence?: number;
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
