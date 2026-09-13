import type { HttpsError } from "firebase-functions/v2/https";

import {
  safeSemanticReviewErrorMessage,
  SemanticReviewError,
} from "./semanticReviewErrors";
import {
  deadlineExceeded,
  failedPrecondition,
  internal,
} from "../lib/errors";

export function mapSemanticReviewError(error: unknown): HttpsError {
  if (!(error instanceof SemanticReviewError)) {
    return internal("Semantic Review failed unexpectedly.", {
      aiErrorCategory: "unknown_internal",
    });
  }
  const details = { aiErrorCategory: error.category };
  if (error.category === "timeout_network") {
    return deadlineExceeded(safeSemanticReviewErrorMessage(error.category), details);
  }
  if (
    error.category === "provider_upstream_failure" ||
    error.category === "response_extraction_failure" ||
    error.category === "malformed_json" ||
    error.category === "semantic_result_validation_failure" ||
    error.category === "patch_validation_failure" ||
    error.category === "semantic_review_noop" ||
    error.category === "business_precondition"
  ) {
    return failedPrecondition(safeSemanticReviewErrorMessage(error.category), details);
  }
  return internal(safeSemanticReviewErrorMessage("unknown_internal"), details);
}
