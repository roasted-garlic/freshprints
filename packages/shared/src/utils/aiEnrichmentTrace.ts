import type { AiEnrichmentTrace, AiEnrichmentTraceSink } from "../types/ai/aiEnrichmentTrace.types";

export interface AiEnrichmentTraceProjection {
  effectivePrompt: unknown;
  responseContract: unknown;
  providerResponse: unknown;
  providerError: unknown;
  normalized: unknown;
  expected: unknown;
  actual: unknown;
  testResult: unknown;
  vcp: unknown;
  decisions: unknown;
  candidate: unknown;
  persistence: unknown;
  parserState: "REACHED" | "NOT REACHED";
  vcpState: "REACHED" | "NOT REACHED";
  candidateState: "REACHED" | "NOT REACHED";
  persistenceState: "REACHED" | "NOT REACHED";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Makes a redacted trace safe for Firestore without mutating the source.
 * Undefined array entries are omitted so the resulting array is not sparse;
 * ordering of all retained entries is preserved. Non-plain Firestore values
 * (Date, Timestamp, GeoPoint, etc.) pass through unchanged.
 */
export function removeUndefinedForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry !== undefined)
      .map((entry) => removeUndefinedForFirestore(entry)) as T;
  }
  if (isPlainObject(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) output[key] = removeUndefinedForFirestore(entry);
    }
    return output as T;
  }
  return value;
}

function latestStageData(trace: AiEnrichmentTrace, stageName: AiEnrichmentTrace["stages"][number]["stage"]): Record<string, unknown> {
  return [...trace.stages].reverse().find((stage) => stage.stage === stageName)?.data ?? {};
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null);
}

/**
 * Projects the canonical trace shape for display. Full/owner fields win, while
 * bounded stage payloads remain useful when no top-level field was captured.
 */
export function projectAiEnrichmentTrace(trace: AiEnrichmentTrace): AiEnrichmentTraceProjection {
  const promptStage = latestStageData(trace, "prompt_ready");
  const requestStage = latestStageData(trace, "request_sent");
  const responseStage = latestStageData(trace, "provider_response");
  const errorStage = latestStageData(trace, "provider_error");
  const parsedStage = latestStageData(trace, "parsed");
  const candidateStage = latestStageData(trace, "candidate");
  const semanticStage = latestStageData(trace, "semantic_review");
  const persistedStage = latestStageData(trace, "persisted");
  const completeStage = latestStageData(trace, "complete");
  const normalized = firstDefined(trace.normalized, parsedStage.normalized);
  const vcp = firstDefined(trace.vcp, parsedStage.vcp, candidateStage.vcp, semanticStage.vcp);
  const candidate = firstDefined(trace.candidate, candidateStage.candidate);
  const persistence = firstDefined(trace.persistence, persistedStage.persistence);
  return {
    effectivePrompt: firstDefined(trace.prompt?.effectiveUser, promptStage.effectivePrompt),
    responseContract: firstDefined(trace.responseContract, requestStage.responseFormat, requestStage.responseContract),
    providerResponse: firstDefined(trace.providerResponse, responseStage),
    providerError: firstDefined(trace.providerError, errorStage),
    normalized,
    expected: firstDefined(trace.expected, completeStage.expected),
    actual: firstDefined(trace.actual, completeStage.actual),
    testResult: firstDefined(trace.testResult, completeStage.testResult),
    vcp,
    decisions: firstDefined(trace.decisions, completeStage.decisions, candidateStage.decisions, semanticStage.decisions),
    candidate,
    persistence,
    parserState: trace.stages.some((stage) => stage.stage === "parsed") ? "REACHED" : "NOT REACHED",
    vcpState: vcp === undefined ? "NOT REACHED" : "REACHED",
    candidateState: candidate === undefined ? "NOT REACHED" : "REACHED",
    persistenceState: persistence === undefined ? "NOT REACHED" : "REACHED",
  };
}

export const AI_TRACE_MAX_FIELD_LENGTH = 32_000;
export const AI_TRACE_MAX_STAGES = 64;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === undefined) return undefined;
  if (typeof value === "string") return value.length > AI_TRACE_MAX_FIELD_LENGTH ? `${value.slice(0, AI_TRACE_MAX_FIELD_LENGTH)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => scrub(v, depth + 1));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/authorization|api.?key|secret|token|password|rawImage|imageBytes|base64/i.test(key)) continue;
    const safe = scrub(entry, depth + 1);
    if (safe !== undefined) out[key] = safe;
  }
  return out;
}

export function serializeAiEnrichmentTrace(trace: AiEnrichmentTrace, fullCapture = false): AiEnrichmentTrace {
  const copy = scrub(trace) as AiEnrichmentTrace;
  copy.captureFullTrace = fullCapture && trace.captureFullTrace;
  if (!copy.captureFullTrace && copy.prompt) {
    copy.prompt = { ...copy.prompt, effectiveSystem: undefined, effectiveUser: undefined };
  }
  if (!copy.captureFullTrace && copy.providerResponse) {
    copy.providerResponse = { ...copy.providerResponse, raw: undefined };
  }
  copy.stages = (copy.stages ?? []).slice(-AI_TRACE_MAX_STAGES);
  return removeUndefinedForFirestore(copy);
}

export function validateAiEnrichmentTrace(value: unknown): value is AiEnrichmentTrace {
  if (!value || typeof value !== "object") return false;
  const trace = value as Partial<AiEnrichmentTrace>;
  return trace.schemaVersion === 1 && typeof trace.traceId === "string" && typeof trace.source === "string" &&
    typeof trace.startedAt === "string" && Array.isArray(trace.stages);
}

export function compareAiEnrichmentTraces(left: AiEnrichmentTrace, right: AiEnrichmentTrace): Record<string, { left: unknown; right: unknown }> {
  const fields = ["prompt", "responseContract", "requestMetadata", "providerResponse", "providerError", "normalized", "vcp", "decisions"] as const;
  const result: Record<string, { left: unknown; right: unknown }> = {};
  for (const field of fields) {
    const a = JSON.stringify((left as unknown as Record<string, unknown>)[field]);
    const b = JSON.stringify((right as unknown as Record<string, unknown>)[field]);
    if (a !== b) result[field] = { left: (left as unknown as Record<string, unknown>)[field], right: (right as unknown as Record<string, unknown>)[field] };
  }
  return result;
}

export function failSoftTraceCall<T extends AiEnrichmentTraceSink>(sink: T | undefined, operation: () => Promise<void> | void): void {
  if (!sink) return;
  try { void Promise.resolve(operation()).catch(() => undefined); } catch { /* observability cannot affect enrichment */ }
}

export class InMemoryAiEnrichmentTraceSink implements AiEnrichmentTraceSink {
  private readonly traces = new Map<string, AiEnrichmentTrace>();
  record(trace: AiEnrichmentTrace): void { this.traces.set(trace.traceId, serializeAiEnrichmentTrace(trace, trace.captureFullTrace)); }
  stage(traceId: string, event: AiEnrichmentTrace["stages"][number]): void {
    const trace = this.traces.get(traceId); if (!trace) return;
    trace.stages.push(event); trace.lifecycleState = event.stage; trace.completedAt = event.stage === "complete" || event.stage === "failed" ? event.at : trace.completedAt;
    this.record(trace);
  }
  get(traceId: string): AiEnrichmentTrace | undefined { const value = this.traces.get(traceId); return value ? structuredClone(value) : undefined; }
  list(): AiEnrichmentTrace[] { return [...this.traces.values()].map((value) => structuredClone(value)); }
}
