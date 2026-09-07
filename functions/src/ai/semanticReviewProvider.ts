import { estimateVisionCostUsd } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import type { SemanticReviewResult } from "../../../packages/shared/src/types/catalog/semanticReview.types";
import { extractJsonObject as parseJson } from "./simpleCatalogEnrichmentResponse";
import { fetchVisionWithRetry, VisionRequestError } from "./visionRequestRetry";
import type { ProviderTarget } from "./providers/resolveProviderTarget";
import { CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION } from "../../../packages/shared/src/types/catalog/semanticReview.types";
import {
  SemanticReviewValidationError,
  parseSemanticReviewResultWithDiagnostics,
} from "./semanticReviewCore";
import { SEMANTIC_REVIEW_CANONICAL_NO_OP_REASON } from "../../../packages/shared/src/utils/semanticReviewPolicy";
import { buildSemanticReviewResponseFormat } from "./semanticReviewSchema";
import {
  safeSemanticReviewErrorMessage,
  sanitizeSemanticReviewExtractedExcerpt,
  SemanticReviewError,
  type SemanticReviewDiagnostics,
} from "./semanticReviewErrors";

export const SEMANTIC_REVIEW_SYSTEM_PROMPT =
  "You are a text-only semantic catalog reviewer. Return JSON only.";

export interface SemanticReviewProviderRequestBody {
  model: string;
  max_completion_tokens: number;
  response_format: ReturnType<typeof buildSemanticReviewResponseFormat>;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
}

export function buildSemanticReviewProviderRequestBody(input: {
  modelId: string;
  prompt: string;
}): SemanticReviewProviderRequestBody {
  return {
    model: input.modelId,
    max_completion_tokens: 1200,
    response_format: buildSemanticReviewResponseFormat(),
    messages: [
      { role: "system", content: SEMANTIC_REVIEW_SYSTEM_PROMPT },
      { role: "user", content: input.prompt },
    ],
  };
}

type AssistantContent = string | Array<{ type?: string; text?: string }>;

interface SemanticReviewPayload {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: AssistantContent };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function describeSemanticReviewPayload(
  payload: unknown,
): Pick<
  SemanticReviewDiagnostics,
  | "responseContentShape"
  | "responseChoiceCount"
  | "responseHasMessage"
  | "finishReason"
  | "promptTokens"
  | "completionTokens"
> {
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as SemanticReviewPayload)
      : undefined;
  const choices = Array.isArray(record?.choices) ? record.choices : undefined;
  const firstChoice = choices?.[0];
  const content = firstChoice?.message?.content;
  let responseContentShape = "missing_content";
  if (!choices) {
    responseContentShape = "missing_choices";
  } else if (!firstChoice?.message) {
    responseContentShape = "missing_message";
  } else if (typeof content === "string") {
    responseContentShape = "string";
  } else if (Array.isArray(content)) {
    responseContentShape = content.some(
      (part) => part?.type === "text" && typeof part.text === "string",
    )
      ? "text_parts"
      : "unsupported_parts";
  } else if (content !== undefined) {
    responseContentShape = typeof content;
  }

  return {
    responseContentShape,
    responseChoiceCount: choices?.length ?? 0,
    responseHasMessage: Boolean(firstChoice?.message),
    finishReason:
      typeof firstChoice?.finish_reason === "string"
        ? firstChoice.finish_reason
        : undefined,
    promptTokens:
      typeof record?.usage?.prompt_tokens === "number"
        ? record.usage.prompt_tokens
        : null,
    completionTokens:
      typeof record?.usage?.completion_tokens === "number"
        ? record.usage.completion_tokens
        : null,
  };
}

export function extractSemanticReviewContent(payload: unknown): string {
  const choices = (
    payload as {
      choices?: Array<{ message?: { content?: AssistantContent } }>;
    } | null
  )?.choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content
      .filter(
        (part) => part?.type === "text" && typeof part.text === "string",
      )
      .map((part) => part.text)
      .join("");
    if (text) return text;
  }
  throw new Error("Semantic reviewer returned no content.");
}

function providerFailureCategory(
  error: unknown,
): "provider_upstream_failure" | "timeout_network" {
  if (error instanceof VisionRequestError) {
    return error.status === 408 || error.status === 504
      ? "timeout_network"
      : "provider_upstream_failure";
  }
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|network|fetch/i.test(message)
    ? "timeout_network"
    : "provider_upstream_failure";
}

function diagnosticsFromProviderError(error: unknown): SemanticReviewDiagnostics {
  if (error instanceof VisionRequestError) {
    return {
      category: providerFailureCategory(error),
      stage: "provider_request",
      httpStatus: error.status,
      ...(error.providerError?.retryable === true
        ? { retryable: true }
        : error.providerError?.retryable === false
          ? { retryable: false }
          : {}),
      errorName: error.name,
    };
  }
  return {
    category: providerFailureCategory(error),
    stage: "provider_request",
    errorName: error instanceof Error ? error.name : "UnknownError",
  };
}

function validationFailure(
  error: unknown,
  base: SemanticReviewDiagnostics,
  extractedContent?: string,
): SemanticReviewError {
  const stage =
    error instanceof SemanticReviewValidationError
      ? error.stage
      : "semantic_result_validation";
  const isCanonicalNoOp =
    stage === "patch_validation" &&
    error instanceof SemanticReviewValidationError &&
    error.message === SEMANTIC_REVIEW_CANONICAL_NO_OP_REASON;
  const category = isCanonicalNoOp
    ? "semantic_review_noop"
    : stage === "patch_validation"
      ? "patch_validation_failure"
      : "semantic_result_validation_failure";
  const topLevelJsonKeys =
    extractedContent && extractedContent.trim().startsWith("{")
      ? (() => {
          try {
            const parsed = JSON.parse(extractedContent) as unknown;
            return parsed &&
              typeof parsed === "object" &&
              !Array.isArray(parsed)
              ? Object.keys(parsed as Record<string, unknown>).slice(0, 24)
              : undefined;
          } catch {
            return undefined;
          }
        })()
      : undefined;
  return new SemanticReviewError(
    safeSemanticReviewErrorMessage(category),
    category,
    stage,
    {
      ...base,
      rejectionReason: error instanceof Error ? error.message : undefined,
      validationFault:
        error instanceof SemanticReviewValidationError
          ? error.validationFault
          : undefined,
      patchValidation:
        error instanceof SemanticReviewValidationError
          ? (error.patchValidation as unknown as Record<string, unknown> | undefined)
          : undefined,
      ...(extractedContent
        ? {
            sanitizedExtractedExcerpt:
              sanitizeSemanticReviewExtractedExcerpt(extractedContent),
          }
        : {}),
      ...(topLevelJsonKeys ? { topLevelJsonKeys } : {}),
    },
  );
}

export async function callSemanticReviewer(input: {
  apiKey: string;
  providerTarget: ProviderTarget;
  modelId: string;
  prompt: string;
  designId: string;
  currentSmartProfile?: Record<string, string[]>;
  captureFullTrace?: boolean;
  onRequestReady?: (
    request: SemanticReviewProviderRequestBody,
  ) => void | Promise<void>;
}): Promise<{
  result: SemanticReviewResult;
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  provider: string;
  model: string;
  promptVersion: string;
  rawProviderResponse: unknown;
  diagnostics: SemanticReviewDiagnostics;
}> {
  let response: Response;
  try {
    const requestBody = buildSemanticReviewProviderRequestBody({
      modelId: input.modelId,
      prompt: input.prompt,
    });
    try {
      await Promise.resolve(
        input.onRequestReady?.(structuredClone(requestBody)),
      ).catch(() => undefined);
    } catch {
      // Diagnostic callbacks are fail-soft and cannot alter provider behavior.
    }
    response = await fetchVisionWithRetry(
      input.providerTarget.baseUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      { modelId: input.modelId, maxRetries: 1 },
    );
  } catch (error) {
    const diagnostics = diagnosticsFromProviderError(error);
    const category = providerFailureCategory(error);
    throw new SemanticReviewError(
      safeSemanticReviewErrorMessage(category),
      category,
      "provider_request",
      diagnostics,
    );
  }

  const responseStatus = response.status;
  let payload: SemanticReviewPayload;
  try {
    payload = (await response.json()) as SemanticReviewPayload;
  } catch (error) {
    throw new SemanticReviewError(
      safeSemanticReviewErrorMessage("malformed_json"),
      "malformed_json",
      "json_parse",
      {
        httpStatus: responseStatus,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    );
  }

  const payloadDiagnostics: SemanticReviewDiagnostics = {
    category: "success",
    stage: "semantic_result_validation",
    httpStatus: responseStatus,
    ...describeSemanticReviewPayload(payload),
  };
  const failureDiagnostics = input.captureFullTrace
    ? { ...payloadDiagnostics, rawProviderResponse: payload }
    : payloadDiagnostics;

  let content: string;
  try {
    content = extractSemanticReviewContent(payload);
  } catch (error) {
    throw new SemanticReviewError(
      safeSemanticReviewErrorMessage("response_extraction_failure"),
      "response_extraction_failure",
      "response_extraction",
      {
        ...failureDiagnostics,
        rejectionReason: error instanceof Error ? error.message : undefined,
      },
    );
  }

  const raw = parseJson(content);
  if (Object.keys(raw).length === 0 && content.trim() !== "{}") {
    throw new SemanticReviewError(
      safeSemanticReviewErrorMessage("malformed_json"),
      "malformed_json",
      "json_parse",
      {
        ...failureDiagnostics,
        rejectionReason: "No JSON object could be extracted.",
        sanitizedExtractedExcerpt:
          sanitizeSemanticReviewExtractedExcerpt(content),
      },
    );
  }

  let result: SemanticReviewResult;
  try {
    const parsed = parseSemanticReviewResultWithDiagnostics(
      raw,
      input.currentSmartProfile,
    );
    result = parsed.result;
    payloadDiagnostics.patchValidation = parsed.patchValidation as unknown as Record<string, unknown>;
  } catch (error) {
    throw validationFailure(error, failureDiagnostics, content);
  }

  const promptTokens = payloadDiagnostics.promptTokens ?? null;
  const completionTokens = payloadDiagnostics.completionTokens ?? null;
  return {
    result,
    promptTokens,
    completionTokens,
    estimatedCostUsd:
      promptTokens != null && completionTokens != null
        ? estimateVisionCostUsd(input.modelId, promptTokens, completionTokens)
        : null,
    provider: input.providerTarget.providerId,
    model: input.modelId,
    promptVersion: CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
    rawProviderResponse: payload,
    diagnostics: {
      ...payloadDiagnostics,
    },
  };
}
