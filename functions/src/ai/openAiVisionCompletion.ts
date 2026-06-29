import {
  OPENAI_VISION_MAX_COMPLETION_TOKENS,
  OPENAI_VISION_MAX_COMPLETION_TOKENS_RETRY,
} from "./aiEnrichmentConfig";

export interface OpenAiCompletionUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
}

export interface OpenAiCompletionChoice {
  finishReason: string | null;
  content: string | null;
}

export interface OpenAiChatCompletionPayload {
  model?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
}

export class OpenAiEmptyOutputError extends Error {
  readonly errorCode: string;
  readonly finishReason: string | null;

  constructor(message: string, errorCode: string, finishReason: string | null) {
    super(message);
    this.name = "OpenAiEmptyOutputError";
    this.errorCode = errorCode;
    this.finishReason = finishReason;
  }
}

export function extractOpenAiCompletionChoice(
  payload: OpenAiChatCompletionPayload,
): OpenAiCompletionChoice {
  const choice = payload.choices?.[0];
  const rawContent = choice?.message?.content;
  const content = typeof rawContent === "string" && rawContent.trim() ? rawContent.trim() : null;

  return {
    finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
    content,
  };
}

export function extractOpenAiCompletionUsage(
  payload: OpenAiChatCompletionPayload,
): OpenAiCompletionUsage {
  const usage = payload.usage;

  return {
    promptTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : null,
    completionTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null,
    reasoningTokens:
      typeof usage?.completion_tokens_details?.reasoning_tokens === "number"
        ? usage.completion_tokens_details.reasoning_tokens
        : null,
  };
}

export function isReasoningBudgetExhausted(
  finishReason: string | null,
  reasoningTokens: number | null,
  maxCompletionTokens: number,
): boolean {
  if (finishReason !== "length" || reasoningTokens === null) {
    return false;
  }

  return reasoningTokens >= maxCompletionTokens * 0.9;
}

export function resolveEmptyOutputErrorCode(
  finishReason: string | null,
  reasoningTokens: number | null,
  maxCompletionTokens: number,
): string {
  if (isReasoningBudgetExhausted(finishReason, reasoningTokens, maxCompletionTokens)) {
    return "openai_token_budget_exhausted";
  }

  return "openai_empty_output";
}

export function buildEmptyOutputUserMessage(finishReason: string | null): string {
  const reasonLabel = finishReason?.trim() || "unknown";

  return `OpenAI returned no visible output (reason: ${reasonLabel}). Try again or switch model in Settings.`;
}

export function assertOpenAiCompletionHasContent(
  payload: OpenAiChatCompletionPayload,
  modelId: string,
  maxCompletionTokens: number,
): string {
  const choice = extractOpenAiCompletionChoice(payload);
  const usage = extractOpenAiCompletionUsage(payload);

  if (choice.content) {
    return choice.content;
  }

  // Usage and empty_content are logged by openAiVisionEnrichmentProvider before retry/throw.

  const errorCode = resolveEmptyOutputErrorCode(
    choice.finishReason,
    usage.reasoningTokens,
    maxCompletionTokens,
  );

  throw new OpenAiEmptyOutputError(
    buildEmptyOutputUserMessage(choice.finishReason),
    errorCode,
    choice.finishReason,
  );
}

export function shouldRetryEmptyOutputWithHigherCap(
  payload: OpenAiChatCompletionPayload,
  maxCompletionTokens: number,
): boolean {
  const choice = extractOpenAiCompletionChoice(payload);
  const usage = extractOpenAiCompletionUsage(payload);

  return (
    !choice.content &&
    maxCompletionTokens < OPENAI_VISION_MAX_COMPLETION_TOKENS_RETRY &&
    isReasoningBudgetExhausted(choice.finishReason, usage.reasoningTokens, maxCompletionTokens)
  );
}

export { OPENAI_VISION_MAX_COMPLETION_TOKENS, OPENAI_VISION_MAX_COMPLETION_TOKENS_RETRY };
