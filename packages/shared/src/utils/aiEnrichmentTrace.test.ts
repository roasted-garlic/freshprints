import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import { compareAiEnrichmentTraces, InMemoryAiEnrichmentTraceSink, projectAiEnrichmentTrace, removeUndefinedForFirestore, serializeAiEnrichmentTrace, validateAiEnrichmentTrace } from "./aiEnrichmentTrace";

const trace = { schemaVersion: 1 as const, traceId: "t1", source: "AUTOMATED TEST - MOCK/FIXTURE" as const, captureFullTrace: true, startedAt: new Date(0).toISOString(), lifecycleState: "created" as const, stages: [], prompt: { effectiveUser: "safe" }, providerResponse: { raw: { ok: true } } };
test("trace serializer redacts full content unless enabled", () => {
  const bounded = serializeAiEnrichmentTrace(trace, false);
  assert.equal(bounded.prompt?.effectiveUser, undefined); assert.equal(bounded.providerResponse?.raw, undefined);
  assert.equal(serializeAiEnrichmentTrace(trace, true).prompt?.effectiveUser, "safe");
});
test("trace sink stores stages and comparison is field-focused", () => {
  const sink = new InMemoryAiEnrichmentTraceSink(); sink.record(trace); sink.stage("t1", { stage: "parsed", at: new Date(1).toISOString() });
  assert.equal(sink.get("t1")?.lifecycleState, "parsed"); assert.equal(validateAiEnrichmentTrace(sink.get("t1")), true);
  assert.deepEqual(Object.keys(compareAiEnrichmentTraces(trace, { ...trace, normalized: { title: "x" } })), ["normalized"]);
});
test("trace projection renders canonical stage data and preserves owner precedence", () => {
  const projected = projectAiEnrichmentTrace({
    ...trace,
    captureFullTrace: false,
    prompt: undefined,
    stages: [
      { stage: "prompt_ready", at: new Date(1).toISOString(), data: { effectivePrompt: "fixture prompt" } },
      { stage: "request_sent", at: new Date(2).toISOString(), data: { responseFormat: "fixture-schema" } },
      { stage: "provider_response", at: new Date(3).toISOString(), data: { source: "fixture" } },
      { stage: "parsed", at: new Date(4).toISOString(), data: { normalized: { title: "Fixture title" } } },
      { stage: "complete", at: new Date(5).toISOString(), data: { expected: { title: "Expected" }, actual: { title: "Fixture title" }, testResult: "PASS" } },
    ],
  });
  assert.equal(projected.effectivePrompt, "fixture prompt");
  assert.equal(projected.responseContract, "fixture-schema");
  assert.deepEqual(projected.normalized, { title: "Fixture title" });
  assert.deepEqual(projected.actual, { title: "Fixture title" });
  assert.equal(projected.testResult, "PASS");
  assert.equal(projected.vcpState, "NOT REACHED");
  const full = projectAiEnrichmentTrace({ ...trace, prompt: { effectiveUser: "owner prompt" }, stages: [{ stage: "prompt_ready", at: new Date(1).toISOString(), data: { effectivePrompt: "bounded prompt" } }] });
  assert.equal(full.effectivePrompt, "owner prompt");
});
test("Firestore cleanup removes undefined values without mutating or damaging valid values", () => {
  const date = new Date("2026-01-02T03:04:05.000Z");
  class TimestampLike { toDate = () => date; toMillis = () => date.getTime(); }
  const timestampLike = new TimestampLike();
  const timestamp = Timestamp.fromDate(date);
  const source = { top: undefined, nested: { keep: "yes", drop: undefined, nil: null }, values: [1, undefined, null, { drop: undefined, keep: true }], date, timestampLike, timestamp };
  const cleaned = removeUndefinedForFirestore(source);
  assert.equal("top" in cleaned, false);
  assert.deepEqual(cleaned.nested, { keep: "yes", nil: null });
  assert.deepEqual(cleaned.values, [1, null, { keep: true }]);
  assert.equal(cleaned.date, date);
  assert.equal(cleaned.timestampLike, timestampLike);
  assert.equal(cleaned.timestamp, timestamp);
  assert.equal("top" in source, true);
  assert.equal(source.nested.drop, undefined);
});
test("bounded and full serialized traces are Firestore-safe", () => {
  const candidate = { ...trace, prompt: { effectiveUser: "prompt", effectiveSystem: "system" }, providerResponse: { raw: { secret: undefined }, shape: { ok: true } }, completedAt: undefined };
  const bounded = serializeAiEnrichmentTrace(candidate, false) as unknown as Record<string, unknown>;
  const full = serializeAiEnrichmentTrace(candidate, true) as unknown as Record<string, unknown>;
  const hasUndefined = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(hasUndefined);
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return value === undefined;
    return Object.values(value).some(hasUndefined);
  };
  assert.equal(hasUndefined(bounded), false);
  assert.equal(hasUndefined(full), false);
  assert.equal((bounded.prompt as Record<string, unknown>).effectiveUser, undefined);
  assert.equal((full.prompt as Record<string, unknown>).effectiveUser, "prompt");
});
