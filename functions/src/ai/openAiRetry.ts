import { logPipelineEvent } from "../lib/pipelineLog";
import { OpenAiEmptyOutputError } from "./openAiVisionCompletion";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const RETRYABLE_OPENAI_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_OPENAI_ERROR_MESSAGE_LENGTH = 300;

export class OpenAiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAiRequestError";
    this.status = status;
  }
}

export interface OpenAiRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  modelId?: string;
}

async function readOpenAiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    const message = body.error?.message?.trim();

    if (message) {
      return message.slice(0, MAX_OPENAI_ERROR_MESSAGE_LENGTH);
    }
  } catch {
    // Response body may not be JSON.
  }

  return `OpenAI request failed with status ${response.status}`;
}

export async function fetchOpenAiWithRetry(
  url: string,
  init: RequestInit,
  options: OpenAiRetryOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 2000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, init);

      if (response.ok) {
        return response;
      }

      const errorMessage = await readOpenAiErrorMessage(response);

      if (!RETRYABLE_OPENAI_STATUSES.has(response.status) || attempt === maxRetries) {
        logPipelineEvent("openai.request.failed", {
          status: response.status,
          message: errorMessage,
          model: options.modelId ?? null,
        });
        throw new OpenAiRequestError(errorMessage, response.status);
      }

      lastError = new OpenAiRequestError(errorMessage, response.status);
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }
    }

    await sleep(baseDelayMs * 2 ** attempt);
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI request failed.");
}

export function resolveOpenAiErrorCode(error: unknown): string {
  if (error instanceof OpenAiEmptyOutputError) {
    return error.errorCode;
  }

  if (error instanceof OpenAiRequestError) {
    if (error.status === 400) {
      return "openai_invalid_request";
    }

    if (error.status === 429) {
      return "openai_rate_limited";
    }

    if (error.status >= 500) {
      return "openai_server_error";
    }
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("429")) {
    return "openai_rate_limited";
  }

  if (/status 5\d\d/.test(message)) {
    return "openai_server_error";
  }

  if (message.includes("504") || message.toLowerCase().includes("timeout")) {
    return "openai_timeout";
  }

  if (message.includes("status 400") || message.toLowerCase().includes("unsupported parameter")) {
    return "openai_invalid_request";
  }

  if (message.toLowerCase().includes("no visible output")) {
    return "openai_empty_output";
  }

  return "ai_processing_failed";
}
