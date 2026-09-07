export interface SanitizedProviderError {
  status?: number;
  code?: string;
  type?: string;
  message?: string;
  fieldPath?: string;
  requestId?: string;
  retryable?: boolean;
  classification?: string;
}

export function sanitizeProviderError(error: unknown): SanitizedProviderError {
  const source = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const response = source.response && typeof source.response === "object" ? source.response as Record<string, unknown> : {};
  const body = source.error && typeof source.error === "object" ? source.error as Record<string, unknown> : source;
  const message = [body.message, response.message, source.message].find((v): v is string => typeof v === "string");
  const status = [source.status, response.status, response.statusCode].find((v): v is number => typeof v === "number");
  const result: SanitizedProviderError = {};
  if (status !== undefined) result.status = status;
  for (const [target, keys] of Object.entries({ code: ["code", "errorCode"], type: ["type", "errorType"], fieldPath: ["field", "path", "fieldPath"], requestId: ["requestId", "request_id"] })) {
    const value = keys.map((key) => body[key] ?? source[key] ?? response[key]).find((v): v is string => typeof v === "string");
    if (value) result[target as keyof SanitizedProviderError] = value as never;
  }
  if (message) result.message = message.slice(0, 2_000);
  result.retryable = status === 408 || status === 429 || (status !== undefined && status >= 500);
  result.classification = result.retryable ? "transient" : "provider_request_rejected";
  return result;
}
