import {
  VISION_MAX_COMPLETION_TOKENS,
  VISION_MAX_COMPLETION_TOKENS_RETRY,
} from "./aiEnrichmentConfig";

export interface VisionCompletionUsage {
  promptTokens: number | null;
  completionTokens: number | null;
}

export interface VisionCompletionChoice {
  finishReason: string | null;
  content: string | null;
}

export interface VisionChatCompletionPayload {
  model?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class VisionEmptyOutputError extends Error {
  readonly errorCode: string;
  readonly finishReason: string | null;

  constructor(message: string, errorCode: string, finishReason: string | null) {
    super(message);
    this.name = "VisionEmptyOutputError";
    this.errorCode = errorCode;
    this.finishReason = finishReason;
  }
}

export function extractVisionCompletionChoice(
  payload: VisionChatCompletionPayload,
): VisionCompletionChoice {
  const choice = payload.choices?.[0];
  const rawContent = choice?.message?.content;
  const content = typeof rawContent === "string" && rawContent.trim() ? rawContent.trim() : null;

  return {
    finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
    content,
  };
}

export function extractVisionCompletionUsage(
  payload: VisionChatCompletionPayload,
): VisionCompletionUsage {
  const usage = payload.usage;

  return {
    promptTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : null,
    completionTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null,
  };
}

export function buildEmptyOutputUserMessage(finishReason: string | null): string {
  const reasonLabel = finishReason?.trim() || "unknown";

  return `The AI provider returned no visible output (reason: ${reasonLabel}). Try again or switch model in Settings.`;
}

export function assertVisionCompletionHasContent(
  payload: VisionChatCompletionPayload,
): string {
  const choice = extractVisionCompletionChoice(payload);

  if (choice.content) {
    return choice.content;
  }

  // Usage and empty_content are logged by geminiVisionEnrichmentProvider before retry/throw.

  throw new VisionEmptyOutputError(
    buildEmptyOutputUserMessage(choice.finishReason),
    "vision_empty_output",
    choice.finishReason,
  );
}

export { VISION_MAX_COMPLETION_TOKENS, VISION_MAX_COMPLETION_TOKENS_RETRY };
