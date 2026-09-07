export type AiEnrichmentErrorSurface = "playground" | "semanticReview";

type ErrorRecord = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

const DEPLOYMENT_UNAVAILABLE_MESSAGE =
  "AI Playground is unavailable right now. Confirm Cloud Functions are deployed for the selected Firebase project.";

function asRecord(value: unknown): ErrorRecord | null {
  return value && typeof value === "object"
    ? (value as ErrorRecord)
    : null;
}

function readDiagnosticCategory(error: unknown): string | undefined {
  const details = asRecord(asRecord(error)?.details) as Record<
    string,
    unknown
  > | null;
  const category = details?.aiErrorCategory ?? details?.category ?? details?.kind;
  return typeof category === "string" ? category : undefined;
}

function isGenericCallableMessage(message: string): boolean {
  return new Set([
    "internal",
    "unknown",
    "unavailable",
    "not-found",
    "failed-precondition",
    "invalid-argument",
    "permission-denied",
  ]).has(message.trim().toLowerCase());
}

export function resolveAiEnrichmentCallableErrorMessage(
  error: unknown,
  surface: AiEnrichmentErrorSurface,
): string {
  const record = asRecord(error);
  const code = typeof record?.code === "string" ? record.code : undefined;
  const message = typeof record?.message === "string" ? record.message.trim() : "";
  const category = readDiagnosticCategory(error);

  switch (category) {
    case "provider_upstream_failure":
      return surface === "semanticReview"
        ? "The configured AI provider could not complete the Semantic Review. No changes were applied."
        : "The configured AI provider could not complete the Playground request.";
    case "response_extraction_failure":
    case "malformed_json":
    case "semantic_result_validation_failure":
    case "patch_validation_failure":
      return "The AI provider returned an unsupported Semantic Review response. No changes were applied.";
    case "semantic_review_noop":
      return "Semantic Review proposed no effective change. No changes were applied.";
    case "business_precondition":
      return surface === "semanticReview"
        ? "Semantic Review cannot run for this result."
        : message && !isGenericCallableMessage(message)
          ? message
          : "The AI Playground request cannot run with the current inputs.";
    case "timeout_network":
      return surface === "semanticReview"
        ? "Semantic Review timed out or could not reach the AI provider."
        : "The Playground request timed out or could not reach the AI provider.";
    case "unknown_internal":
      return surface === "semanticReview"
        ? "Semantic Review failed unexpectedly. No changes were applied."
        : "The Playground request failed unexpectedly. No changes were applied.";
  }

  if (code === "functions/unauthenticated") {
    return "You must be signed in to use the AI playground.";
  }
  if (code === "functions/permission-denied") {
    return message && message !== "permission-denied"
      ? message
      : "Only owners and admins can use the AI playground.";
  }
  if (code === "functions/unavailable" || code === "functions/not-found") {
    return DEPLOYMENT_UNAVAILABLE_MESSAGE;
  }
  if (code === "functions/deadline-exceeded") {
    return surface === "semanticReview"
      ? "Semantic Review timed out. Try again later."
      : "The Playground request timed out. Try again later.";
  }
  if (code === "functions/failed-precondition") {
    return message && !isGenericCallableMessage(message)
      ? message
      : surface === "semanticReview"
        ? "Semantic Review cannot run for this result."
        : "The Playground request cannot run with the current inputs.";
  }
  if (code === "functions/invalid-argument") {
    return message && !isGenericCallableMessage(message)
      ? message
      : "The AI Playground request is invalid. Check the prompt and image, then try again.";
  }
  if (code === "functions/internal") {
    return surface === "semanticReview"
      ? "Semantic Review failed unexpectedly. No changes were applied."
      : "The Playground request failed unexpectedly. No changes were applied.";
  }

  const normalized = message.toLowerCase();
  if (/timeout|timed out|networkerror|failed to fetch|err_failed/.test(normalized)) {
    return surface === "semanticReview"
      ? "Semantic Review timed out or could not reach the AI provider."
      : "The Playground request timed out or could not reach the AI provider.";
  }
  if (message) {
    return message;
  }
  return surface === "semanticReview"
    ? "Semantic Review failed unexpectedly. No changes were applied."
    : "Unable to run the AI playground request.";
}
