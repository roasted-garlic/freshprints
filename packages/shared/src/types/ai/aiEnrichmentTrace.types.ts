export const AI_ENRICHMENT_TRACE_SOURCES = [
  "LIVE PROCESSING",
  "PLAYGROUND",
  "DEV INTEGRATION - LIVE PROVIDER",
  "AUTOMATED TEST - MOCK/FIXTURE",
] as const;

export type AiEnrichmentTraceSource = (typeof AI_ENRICHMENT_TRACE_SOURCES)[number];
export type AiEnrichmentTracePass = "PASS 1" | "PASS 2";
export type AiEnrichmentTraceStage =
  | "created" | "prompt_ready" | "request_sent" | "provider_response" | "provider_error" | "parsed"
  | "candidate" | "semantic_review" | "persisted" | "complete" | "failed";

export interface AiEnrichmentTraceCost { inputUsd?: number; outputUsd?: number; totalUsd?: number; }
export interface AiEnrichmentTraceStageEvent {
  stage: AiEnrichmentTraceStage;
  at: string;
  durationMs?: number;
  data?: Record<string, unknown>;
}

export interface AiEnrichmentTracePass2Diagnostics {
  semanticReviewInput?: Record<string, unknown>;
  renderedPrompt?: Record<string, unknown>;
  providerRequest?: Record<string, unknown>;
  patchValidationInput?: Record<string, unknown>;
}

export interface AiEnrichmentTrace {
  schemaVersion: 1;
  traceId: string;
  parentTraceId?: string;
  source: AiEnrichmentTraceSource;
  pass?: AiEnrichmentTracePass;
  designId?: string;
  attemptId?: string;
  testName?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  normalizerVersion?: string;
  workflowMode?: string;
  /** @deprecated Historical compatibility metadata; not an active Processing gate. */
  semanticReviewerEnabled?: boolean;
  autonomousEnabled?: boolean;
  captureFullTrace: boolean;
  startedAt: string;
  completedAt?: string;
  lifecycleState: AiEnrichmentTraceStage;
  input?: Record<string, unknown>;
  prompt?: { storedTemplate?: string; effectiveSystem?: string; effectiveUser?: string; hashes?: Record<string, string> };
  responseContract?: Record<string, unknown>;
  requestMetadata?: Record<string, unknown>;
  providerResponse?: { shape?: Record<string, unknown>; raw?: unknown; usage?: Record<string, unknown>; finishReason?: string };
  providerError?: Record<string, unknown>;
  normalized?: Record<string, unknown>;
  smartProfile?: { aiProduced?: Record<string, unknown>; effective?: Record<string, unknown>; provenance?: Record<string, unknown> };
  vcp?: Record<string, unknown>;
  decisions?: Record<string, unknown>;
  pass2?: Record<string, unknown>;
  pass2Diagnostics?: AiEnrichmentTracePass2Diagnostics;
  candidate?: Record<string, unknown>;
  persistence?: Record<string, unknown>;
  costs?: { pass1?: AiEnrichmentTraceCost; pass2?: AiEnrichmentTraceCost; combined?: AiEnrichmentTraceCost };
  stages: AiEnrichmentTraceStageEvent[];
  expected?: unknown;
  actual?: unknown;
  testResult?: "PASS" | "FAIL";
}

export interface AiEnrichmentTraceSink {
  record(trace: AiEnrichmentTrace): Promise<void> | void;
  stage(traceId: string, event: AiEnrichmentTraceStageEvent): Promise<void> | void;
}
