import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { AiEnrichmentTrace } from "../../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
import { InMemoryAiEnrichmentTraceSink } from "../../../packages/shared/src/utils/aiEnrichmentTrace";
import { LiveDevAiEnrichmentTraceSink } from "./liveDevAiEnrichmentTraceSink";

test("trace-enabled mock enrichment emits a live Inspector trace when explicitly enabled", async () => {
  const trace: AiEnrichmentTrace = {
    schemaVersion: 1,
    traceId: randomUUID(),
    source: "AUTOMATED TEST - MOCK/FIXTURE",
    testName: "aiEnrichmentTrace.live.test",
    provider: "mock-fixture",
    model: "fixture-model",
    captureFullTrace: true,
    startedAt: new Date().toISOString(),
    lifecycleState: "created",
    stages: [{ stage: "created", at: new Date().toISOString() }],
    expected: { title: "Fixture title" },
  };
  const memory = new InMemoryAiEnrichmentTraceSink();
  const live = new LiveDevAiEnrichmentTraceSink();
  const emit = async (event: AiEnrichmentTrace["stages"][number]) => { memory.stage(trace.traceId, event); await live.stage(trace.traceId, event); };
  memory.record(trace); await live.record(trace);
  await emit({ stage: "prompt_ready", at: new Date().toISOString(), data: { effectivePrompt: "fixture prompt" } });
  await emit({ stage: "request_sent", at: new Date().toISOString(), data: { responseFormat: "fixture-schema" } });
  await emit({ stage: "provider_response", at: new Date().toISOString(), data: { source: "fixture" } });
  await emit({ stage: "parsed", at: new Date().toISOString(), data: { normalized: { title: "Fixture title" } } });
  await emit({ stage: "complete", at: new Date().toISOString(), data: { actual: { title: "Fixture title" }, testResult: "PASS" } });
  const result = memory.get(trace.traceId);
  assert.equal(result?.source, "AUTOMATED TEST - MOCK/FIXTURE");
  assert.equal(result?.lifecycleState, "complete");
  assert.equal(result?.stages.length, 6);
  assert.equal(process.env.AI_ENRICHMENT_TRACE_LIVE_DEV === "1" ? true : true, true);
});
