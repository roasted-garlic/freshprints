import type {
  AiEnrichmentTrace,
  AiEnrichmentTracePass,
  AiEnrichmentTracePass2Diagnostics,
  AiEnrichmentTraceSink,
} from "../types/ai/aiEnrichmentTrace.types";

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
  pass2Diagnostics: AiEnrichmentTracePass2Diagnostics | undefined;
  parserState: "REACHED" | "NOT REACHED";
  vcpState: "REACHED" | "NOT REACHED";
  candidateState: "REACHED" | "NOT REACHED";
  persistenceState: "REACHED" | "NOT REACHED";
}

/**
 * Returns the pass represented by a trace, including older records written
 * before pass metadata was stored explicitly.
 */
export function getAiEnrichmentTracePass(trace: AiEnrichmentTrace): AiEnrichmentTracePass | null {
  if (trace.pass) return trace.pass;
  if (trace.parentTraceId || trace.pass2 || trace.stages.some((stage) => stage.stage === "semantic_review")) return "PASS 2";
  if (trace.source === "PLAYGROUND" || trace.costs?.pass1) return "PASS 1";
  return null;
}

export function getAiEnrichmentTracePassLabel(trace: AiEnrichmentTrace): string {
  return getAiEnrichmentTracePass(trace) ?? "PASS —";
}

export function getAiEnrichmentTraceDisplayName(trace: AiEnrichmentTrace): string {
  if (trace.testName) return trace.testName;
  if (trace.source === "PLAYGROUND") {
    const pass = getAiEnrichmentTracePass(trace);
    return pass ? `Playground · ${pass}` : "Playground run";
  }
  return trace.designId ?? "Unattributed run";
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
    pass2Diagnostics: trace.pass2Diagnostics,
    parserState: trace.stages.some((stage) => stage.stage === "parsed") ? "REACHED" : "NOT REACHED",
    vcpState: vcp === undefined ? "NOT REACHED" : "REACHED",
    candidateState: candidate === undefined ? "NOT REACHED" : "REACHED",
    persistenceState: persistence === undefined ? "NOT REACHED" : "REACHED",
  };
}

export const AI_TRACE_MAX_FIELD_LENGTH = 32_000;
export const AI_TRACE_MAX_STAGES = 64;

const AI_TRACE_PASS2_MAX_ARRAY_ITEMS = 100;
const AI_TRACE_PASS2_MAX_OBJECT_KEYS = 256;
const AI_TRACE_PASS2_MAX_DEPTH = 16;

export interface AiEnrichmentTraceDiagnosticTruncation {
  path: string;
  reason: "string_length" | "array_items" | "object_keys" | "depth";
  original: number;
  retained: number;
}

interface DiagnosticProjectionContext {
  truncations: AiEnrichmentTraceDiagnosticTruncation[];
  redactions: string[];
}

function isDiagnosticSafeKey(key: string): boolean {
  return /^(?:prompt|completion|total)(?:Tokens|_tokens)$/i.test(key) ||
    /^max_(?:completion|prompt)_tokens$/i.test(key);
}

function isDiagnosticSecretKey(key: string): boolean {
  return !isDiagnosticSafeKey(key) && /authorization|api.?key|secret|access.?token|refresh.?token|id.?token|credential|cookie|password|token|rawImage|imageBytes|image(?:Url|URI|Data|Base64)/i.test(key);
}

function redactDiagnosticString(value: string): string {
  return value
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi, "[redacted image data URI]")
    .replace(/https?:\/\/[^\s"']+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s"']*)?/gi, "[redacted image URL]")
    .replace(/(authorization|api[_-]?key|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|password)\s*[:=]\s*[^\s;,]+/gi, "$1=[redacted]");
}

function projectDiagnosticValue(
  value: unknown,
  path: string,
  context: DiagnosticProjectionContext,
  depth = 0,
): unknown {
  if (value === undefined) return undefined;
  if (typeof value === "string") {
    const redacted = redactDiagnosticString(value);
    if (redacted.length <= AI_TRACE_MAX_FIELD_LENGTH) return redacted;
    context.truncations.push({
      path,
      reason: "string_length",
      original: redacted.length,
      retained: AI_TRACE_MAX_FIELD_LENGTH,
    });
    return `${redacted.slice(0, AI_TRACE_MAX_FIELD_LENGTH)}…`;
  }
  if (typeof value !== "object" || value === null) return value;
  if (depth >= AI_TRACE_PASS2_MAX_DEPTH) {
    const size = Array.isArray(value) ? value.length : Object.keys(value).length;
    context.truncations.push({ path, reason: "depth", original: size, retained: 0 });
    return "[TRUNCATED: maximum diagnostic depth reached]";
  }
  if (Array.isArray(value)) {
    if (value.length > AI_TRACE_PASS2_MAX_ARRAY_ITEMS) {
      context.truncations.push({
        path,
        reason: "array_items",
        original: value.length,
        retained: AI_TRACE_PASS2_MAX_ARRAY_ITEMS,
      });
    }
    return value
      .slice(0, AI_TRACE_PASS2_MAX_ARRAY_ITEMS)
      .map((entry, index) => projectDiagnosticValue(entry, `${path}[${index}]`, context, depth + 1));
  }
  const entries = Object.entries(value);
  if (entries.length > AI_TRACE_PASS2_MAX_OBJECT_KEYS) {
    context.truncations.push({
      path,
      reason: "object_keys",
      original: entries.length,
      retained: AI_TRACE_PASS2_MAX_OBJECT_KEYS,
    });
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of entries.slice(0, AI_TRACE_PASS2_MAX_OBJECT_KEYS)) {
    const childPath = path ? `${path}.${key}` : key;
    if (isDiagnosticSecretKey(key)) {
      context.redactions.push(childPath);
      continue;
    }
    const projected = projectDiagnosticValue(entry, childPath, context, depth + 1);
    if (projected !== undefined) output[key] = projected;
  }
  return output;
}

function projectPass2DiagnosticSection(value: unknown, section: string): Record<string, unknown> {
  const context: DiagnosticProjectionContext = { truncations: [], redactions: [] };
  const source = isPlainObject(value) && isPlainObject(value._diagnostic) && value._diagnostic.bounded === true
    ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== "_diagnostic"))
    : value;
  const projected = projectDiagnosticValue(source, section, context);
  const metadata = {
    bounded: true,
    ...(context.truncations.length ? { truncations: context.truncations } : {}),
    ...(context.redactions.length ? { redactions: context.redactions } : {}),
  };
  if (projected && typeof projected === "object" && !Array.isArray(projected)) {
    return { ...(projected as Record<string, unknown>), _diagnostic: metadata };
  }
  return { value: projected, _diagnostic: metadata };
}

export function buildAiEnrichmentPass2Diagnostics(input: {
  semanticReviewInput: unknown;
  renderedPrompt: unknown;
  providerRequest?: unknown;
  patchValidationInput?: unknown;
}): AiEnrichmentTracePass2Diagnostics {
  return {
    semanticReviewInput: projectPass2DiagnosticSection(input.semanticReviewInput, "semanticReviewInput"),
    renderedPrompt: projectPass2DiagnosticSection(input.renderedPrompt, "renderedPrompt"),
    ...(input.providerRequest === undefined
      ? {}
      : { providerRequest: projectPass2DiagnosticSection(input.providerRequest, "providerRequest") }),
    ...(input.patchValidationInput === undefined
      ? {}
      : { patchValidationInput: projectPass2DiagnosticSection(input.patchValidationInput, "patchValidationInput") }),
  };
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 12 || value === undefined) return undefined;
  if (typeof value === "string") return value.length > AI_TRACE_MAX_FIELD_LENGTH ? `${value.slice(0, AI_TRACE_MAX_FIELD_LENGTH)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => scrub(v, depth + 1));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const isSafeUsageMetric = /^(prompt|completion|total)(?:Tokens|_tokens)$/i.test(key);
    const isSafeRequestOption = /^max_(?:completion|prompt)_tokens$/i.test(key);
    if (!isSafeUsageMetric && !isSafeRequestOption && /authorization|api.?key|secret|token|password|rawImage|imageBytes|base64/i.test(key)) continue;
    const safe = scrub(entry, depth + 1);
    if (safe !== undefined) out[key] = safe;
  }
  return out;
}

export function serializeAiEnrichmentTrace(trace: AiEnrichmentTrace, fullCapture = false): AiEnrichmentTrace {
  const copy = scrub(trace) as AiEnrichmentTrace;
  copy.captureFullTrace = fullCapture && trace.captureFullTrace;
  if (trace.pass2Diagnostics) {
    copy.pass2Diagnostics = buildAiEnrichmentPass2Diagnostics({
      semanticReviewInput: trace.pass2Diagnostics.semanticReviewInput,
      renderedPrompt: trace.pass2Diagnostics.renderedPrompt,
      providerRequest: trace.pass2Diagnostics.providerRequest,
      patchValidationInput: trace.pass2Diagnostics.patchValidationInput,
    });
  }
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
  const fields = ["prompt", "responseContract", "requestMetadata", "pass2Diagnostics", "providerResponse", "providerError", "normalized", "vcp", "decisions"] as const;
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
