import assert from "node:assert/strict";
import test from "node:test";

import type { AiEnrichmentTrace } from "../../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
import { projectAiEnrichmentTrace } from "../../../packages/shared/src/utils/aiEnrichmentTrace";

test("failed provider trace is truthful and does not fabricate later stages", () => {
  const trace: AiEnrichmentTrace = {
    schemaVersion: 1,
    traceId: "failed-playground",
    source: "PLAYGROUND",
    captureFullTrace: false,
    startedAt: new Date(0).toISOString(),
    completedAt: new Date(1).toISOString(),
    lifecycleState: "failed",
    provider: "google",
    model: "gemini-2.5-flash-lite",
    providerError: { status: 400, classification: "vision_invalid_request", message: "Bad request" },
    stages: [
      { stage: "created", at: new Date(0).toISOString() },
      { stage: "prompt_ready", at: new Date(1).toISOString(), data: { effectivePrompt: "fixture prompt" } },
      { stage: "request_sent", at: new Date(2).toISOString(), data: { responseFormat: "fixture-schema" } },
      { stage: "provider_error", at: new Date(3).toISOString(), data: { status: 400, message: "Bad request" } },
      { stage: "failed", at: new Date(4).toISOString(), data: { parser: "NOT REACHED", normalized: "NOT REACHED", vcp: "NOT REACHED", candidate: "NOT REACHED", persistence: "NOT REACHED" } },
    ],
  };
  const projection = projectAiEnrichmentTrace(trace);
  assert.equal(trace.lifecycleState, "failed");
  assert.equal(projection.effectivePrompt, "fixture prompt");
  assert.equal(projection.responseContract, "fixture-schema");
  assert.deepEqual(projection.providerError, trace.providerError);
  assert.equal(projection.parserState, "NOT REACHED");
  assert.equal(projection.vcpState, "NOT REACHED");
  assert.equal(projection.candidateState, "NOT REACHED");
  assert.equal(projection.persistenceState, "NOT REACHED");
  assert.equal(projection.normalized, undefined);
  assert.equal(projection.actual, undefined);
});
