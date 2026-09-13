export type SemanticReviewFailureCategory =
  | "provider_upstream_failure"
  | "response_extraction_failure"
  | "malformed_json"
  | "semantic_result_validation_failure"
  | "patch_validation_failure"
  | "semantic_review_noop"
  | "business_precondition"
  | "timeout_network"
  | "unknown_internal";

export type SemanticReviewDiagnosticCategory =
  | "success"
  | SemanticReviewFailureCategory;

export type SemanticReviewFailureStage =
  | "provider_request"
  | "response_extraction"
  | "json_parse"
  | "semantic_result_validation"
  | "patch_validation"
  | "precondition"
  | "unknown";

export interface SemanticReviewDiagnostics {
  category: SemanticReviewDiagnosticCategory;
  stage: SemanticReviewFailureStage;
  httpStatus?: number;
  retryable?: boolean;
  responseContentShape?: string;
  responseChoiceCount?: number;
  responseHasMessage?: boolean;
  finishReason?: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  rejectionReason?: string;
  validationFault?: string;
  /** Bounded sanitized excerpt of extracted provider text; never secrets/images. */
  sanitizedExtractedExcerpt?: string;
  /** Internal-only raw payload for an explicitly owner-authorized full trace. */
  rawProviderResponse?: unknown;
  topLevelJsonKeys?: string[];
  errorName?: string;
  patchValidation?: Record<string, unknown>;
}

export const SEMANTIC_REVIEW_DIAGNOSTIC_EXCERPT_MAX_CHARS = 800;

export function sanitizeSemanticReviewExtractedExcerpt(
  content: string,
  maxChars = SEMANTIC_REVIEW_DIAGNOSTIC_EXCERPT_MAX_CHARS,
): string {
  return content
    .replace(/[\r\n]+/g, " ")
    .replace(
      /(authorization|api[_-]?key|secret|token|password)\s*[:=]\s*[^\s;,]+/gi,
      "$1=[redacted]",
    )
    .replace(
      /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi,
      "data:image/[redacted]",
    )
    .slice(0, maxChars);
}

export class SemanticReviewError extends Error {
  readonly category: SemanticReviewFailureCategory;
  readonly stage: SemanticReviewFailureStage;
  readonly diagnostics: SemanticReviewDiagnostics;

  constructor(
    message: string,
    category: SemanticReviewFailureCategory,
    stage: SemanticReviewFailureStage,
    diagnostics: Omit<SemanticReviewDiagnostics, "category" | "stage"> = {},
  ) {
    super(message);
    this.name = "SemanticReviewError";
    this.category = category;
    this.stage = stage;
    this.diagnostics = { ...diagnostics, category, stage };
  }
}

export function safeSemanticReviewErrorMessage(
  category: Exclude<SemanticReviewFailureCategory, "success">,
): string {
  switch (category) {
    case "provider_upstream_failure":
      return "The configured AI provider could not complete the Semantic Review.";
    case "response_extraction_failure":
    case "malformed_json":
    case "semantic_result_validation_failure":
    case "patch_validation_failure":
      return "The AI provider returned an unsupported Semantic Review response.";
    case "semantic_review_noop":
      return "Semantic Review proposed no effective change. No changes were applied.";
    case "business_precondition":
      return "Semantic Review cannot run for this result.";
    case "timeout_network":
      return "Semantic Review timed out or could not reach the AI provider.";
    case "unknown_internal":
      return "Semantic Review failed unexpectedly. No changes were applied.";
  }
}
