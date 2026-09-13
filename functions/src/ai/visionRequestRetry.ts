import { logPipelineEvent } from "../lib/pipelineLog";
import { VisionEmptyOutputError } from "./visionCompletion";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const RETRYABLE_VISION_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_VISION_ERROR_MESSAGE_LENGTH = 300;

export class VisionRequestError extends Error {
  readonly status: number;
  readonly providerError?: Record<string, unknown>;

  constructor(message: string, status: number, providerError?: Record<string, unknown>) {
    super(message);
    this.name = "VisionRequestError";
    this.status = status;
    this.providerError = providerError;
  }
}

const MAX_PROVIDER_ERROR_VALUE_LENGTH = 300;

function boundedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, MAX_PROVIDER_ERROR_VALUE_LENGTH)
    : undefined;
}

export function sanitizeVisionProviderError(
  status: number,
  body: unknown,
  retryable = RETRYABLE_VISION_STATUSES.has(status),
): Record<string, unknown> {
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const nested = record.error && typeof record.error === "object"
    ? record.error as Record<string, unknown>
    : record;
  const details: Record<string, unknown> = {
    status,
    retryable,
    classification: status === 400 ? "vision_invalid_request" : status >= 500 ? "vision_server_error" : "provider_request_failed",
  };
  for (const [output, keys] of Object.entries({
    code: ["code", "errorCode"],
    type: ["type", "errorType"],
    message: ["message", "errorMessage"],
    path: ["path", "field", "parameter"],
    requestId: ["requestId", "request_id", "id"],
  })) {
    const value = keys.map((key) => boundedString(nested[key]) ?? boundedString(record[key])).find(Boolean);
    if (value) details[output] = value;
  }
  return details;
}

export interface VisionRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  modelId?: string;
  /** Per-attempt timeout — aborts a single hung request so it can't stall the whole retry loop. */
  timeoutMs?: number;
  /** Called once per retryable attempt after a failed try (not on the final failure). */
  onRetry?: (info: { attempt: number; maxRetries: number }) => void | Promise<void>;
}

const DEFAULT_VISION_REQUEST_TIMEOUT_MS = 45_000;

async function readVisionError(response: Response): Promise<{ message: string; details: Record<string, unknown> }> {
  try {
    const body = await response.json() as unknown;
    const details = sanitizeVisionProviderError(response.status, body);
    const message = boundedString(details.message);

    if (message) {
      return { message: message.slice(0, MAX_VISION_ERROR_MESSAGE_LENGTH), details };
    }
    return { message: `AI vision request failed with status ${response.status}`, details };
  } catch {
    // Response body may not be JSON.
  }

  return {
    message: `AI vision request failed with status ${response.status}`,
    details: sanitizeVisionProviderError(response.status, undefined),
  };
}

export async function fetchVisionWithRetry(
  url: string,
  init: RequestInit,
  options: VisionRetryOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? DEFAULT_VISION_REQUEST_TIMEOUT_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: timeoutController.signal });

      if (response.ok) {
        return response;
      }

      const providerError = await readVisionError(response);

      if (!RETRYABLE_VISION_STATUSES.has(response.status) || attempt === maxRetries) {
        logPipelineEvent("vision.request.failed", {
          status: response.status,
          message: providerError.message,
          model: options.modelId ?? null,
        });
        throw new VisionRequestError(providerError.message, response.status, providerError.details);
      }

      lastError = new VisionRequestError(providerError.message, response.status, providerError.details);
    } catch (error) {
      lastError =
        error instanceof Error && error.name === "AbortError"
          ? new Error(`AI vision request timed out after ${timeoutMs}ms`)
          : error;

      if (attempt === maxRetries) {
        throw lastError;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (options.onRetry) {
      await options.onRetry({ attempt: attempt + 1, maxRetries });
    }

    await sleep(baseDelayMs * 2 ** attempt);
  }

  throw lastError instanceof Error ? lastError : new Error("AI vision request failed.");
}

export function resolveVisionErrorCode(error: unknown): string {
  if (error instanceof VisionEmptyOutputError) {
    return error.errorCode;
  }

  if (error instanceof VisionRequestError) {
    if (error.status === 400) {
      return "vision_invalid_request";
    }

    if (error.status === 429) {
      return "vision_rate_limited";
    }

    if (error.status >= 500) {
      return "vision_server_error";
    }
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("429")) {
    return "vision_rate_limited";
  }

  if (/status 5\d\d/.test(message)) {
    return "vision_server_error";
  }

  if (message.includes("504") || message.toLowerCase().includes("timeout")) {
    return "vision_timeout";
  }

  if (message.includes("status 400") || message.toLowerCase().includes("unsupported parameter")) {
    return "vision_invalid_request";
  }

  if (message.toLowerCase().includes("no visible output")) {
    return "vision_empty_output";
  }

  return "ai_processing_failed";
}
