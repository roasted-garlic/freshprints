import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import type { AiEnrichmentTrace } from "../types/ai/aiEnrichmentTrace.types";
import { buildAiEnrichmentPass2Diagnostics, compareAiEnrichmentTraces, getAiEnrichmentTraceDisplayName, getAiEnrichmentTracePass, getAiEnrichmentTracePassLabel, InMemoryAiEnrichmentTraceSink, projectAiEnrichmentTrace, removeUndefinedForFirestore, serializeAiEnrichmentTrace, validateAiEnrichmentTrace } from "./aiEnrichmentTrace";

const trace = { schemaVersion: 1 as const, traceId: "t1", source: "AUTOMATED TEST - MOCK/FIXTURE" as const, captureFullTrace: true, startedAt: new Date(0).toISOString(), lifecycleState: "created" as const, stages: [], prompt: { effectiveUser: "safe" }, providerResponse: { raw: { ok: true } } };
test("trace serializer redacts full content unless enabled", () => {
  const bounded = serializeAiEnrichmentTrace(trace, false);
  assert.equal(bounded.prompt?.effectiveUser, undefined); assert.equal(bounded.providerResponse?.raw, undefined);
  assert.equal(serializeAiEnrichmentTrace(trace, true).prompt?.effectiveUser, "safe");
});
test("trace display metadata identifies Playground passes and preserves old records", () => {
  const pass1 = { ...trace, source: "PLAYGROUND" as const };
  assert.equal(getAiEnrichmentTracePass(pass1), "PASS 1");
  assert.equal(getAiEnrichmentTracePassLabel(pass1), "PASS 1");
  assert.equal(getAiEnrichmentTraceDisplayName(pass1), "Playground · PASS 1");

  const pass2 = {
    ...pass1,
    parentTraceId: "pass-1",
    pass2: { pass1TraceId: "pass-1" },
  };
  assert.equal(getAiEnrichmentTracePass(pass2), "PASS 2");
  assert.equal(getAiEnrichmentTraceDisplayName(pass2), "Playground · PASS 2");

  const namedTest = {
    ...trace,
    testName: "aiEnrichmentTrace.live.test",
    pass: "PASS 1" as const,
  };
  assert.equal(getAiEnrichmentTraceDisplayName(namedTest), "aiEnrichmentTrace.live.test");
});
test("trace sink stores stages and comparison is field-focused", () => {
  const sink = new InMemoryAiEnrichmentTraceSink(); sink.record(trace); sink.stage("t1", { stage: "parsed", at: new Date(1).toISOString() });
  assert.equal(sink.get("t1")?.lifecycleState, "parsed"); assert.equal(validateAiEnrichmentTrace(sink.get("t1")), true);
  assert.deepEqual(Object.keys(compareAiEnrichmentTraces(trace, { ...trace, normalized: { title: "x" } })), ["normalized"]);
  assert.deepEqual(
    Object.keys(compareAiEnrichmentTraces(
      { ...trace, pass2Diagnostics: { renderedPrompt: { userMessage: "left" } } },
      { ...trace, pass2Diagnostics: { renderedPrompt: { userMessage: "right" } } },
    )),
    ["pass2Diagnostics"],
  );
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

test("retains safe provider usage metrics while redacting credential-like tokens", () => {
  const serialized = serializeAiEnrichmentTrace(
    {
      ...trace,
      providerResponse: {
        usage: { promptTokens: 12, completionTokens: 7 },
        apiKey: "do-not-store",
        accessToken: "do-not-store",
        token: "do-not-store",
      } as unknown as AiEnrichmentTrace["providerResponse"],
    },
    true,
  );
  assert.deepEqual(serialized.providerResponse, {
      usage: { promptTokens: 12, completionTokens: 7 },
  });
});
test("retains bounded diagnostic request options and complete full-trace schemas", () => {
  const responseContract = {
    type: "json_schema",
    json_schema: {
      name: "trace_schema",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          decision: {
            type: "string",
            enum: ["APPROVE", "APPROVE_WITH_PATCH"],
          },
          patches: {
            type: "object",
            additionalProperties: false,
            properties: {
              subjects: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  };
  const candidate = {
    ...trace,
    responseContract,
    requestMetadata: {
      requestOptions: { max_completion_tokens: 1200 },
      authorization: "do-not-store",
    },
  };
  const bounded = serializeAiEnrichmentTrace(candidate, false);
  assert.deepEqual(bounded.requestMetadata, {
    requestOptions: { max_completion_tokens: 1200 },
  });
  assert.deepEqual(
    (bounded.responseContract as Record<string, unknown>).json_schema,
    responseContract.json_schema,
  );
  const full = serializeAiEnrichmentTrace(candidate, true);
  assert.deepEqual(
    (full.responseContract as Record<string, unknown>).json_schema,
    responseContract.json_schema,
  );
});

test("preserves explicit Pass 2 boundary diagnostics while redacting secrets and marking truncation", () => {
  const diagnostics = buildAiEnrichmentPass2Diagnostics({
    semanticReviewInput: {
      originalSmartProfile: { subjects: ["musicians"] },
      visualContextProfile: { summary: "A band", peopleCharacters: ["musicians"] },
      eligibleBlockers: ["structured_evidence_gap:subjects:musicians"],
      pass2Eligibility: "eligible",
    },
    renderedPrompt: {
      promptVersion: "catalog-semantic-review-v4",
      systemMessage: "You are a text-only semantic catalog reviewer. Return JSON only.",
      userMessage: "musicians",
    },
    providerRequest: {
      model: "gemini-2.5-flash-lite",
      max_completion_tokens: 1200,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "catalog_semantic_review_v4",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["decision"],
            properties: {
              decision: { type: "string", enum: ["APPROVE", "APPROVE_WITH_PATCH"] },
              patches: { type: "object", additionalProperties: false, properties: { subjects: { type: "array", items: { type: "string" } } } },
            },
          },
        },
      },
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "musicians" },
      ],
      authorization: "Bearer should-not-store",
      apiKey: "should-not-store",
      imageUrl: "https://example.test/image.png",
    },
    patchValidationInput: {
      currentSmartProfile: { subjects: ["beatles", "musicians"] },
      rawProviderPatch: { subjects: ["beatles", "musicians"] },
      canonicalFrom: [{ field: "subjects", values: ["beatles", "musicians"] }],
      canonicalTo: [{ field: "subjects", values: ["beatles", "musicians"] }],
      validationResult: { valid: false, reason: "Semantic review patch is a no-op after canonical normalization." },
    },
  });
  assert.deepEqual(diagnostics.semanticReviewInput?.originalSmartProfile, { subjects: ["musicians"] });
  assert.equal(diagnostics.renderedPrompt?.userMessage, "musicians");
  const request = diagnostics.providerRequest as Record<string, unknown>;
  assert.equal(request.max_completion_tokens, 1200);
  const responseFormat = request.response_format as Record<string, unknown>;
  const schema = (responseFormat.json_schema as Record<string, unknown>).schema as Record<string, unknown>;
  assert.deepEqual(schema.required, ["decision"]);
  assert.deepEqual(
    ((schema.properties as Record<string, unknown>).decision as Record<string, unknown>).enum,
    ["APPROVE", "APPROVE_WITH_PATCH"],
  );
  assert.equal(JSON.stringify(diagnostics).includes("should-not-store"), false);
  assert.equal(JSON.stringify(diagnostics).includes("image.png"), false);

  const serialized = serializeAiEnrichmentTrace(
    { ...trace, captureFullTrace: false, pass2Diagnostics: diagnostics },
    false,
  );
  assert.equal(serialized.pass2Diagnostics?.renderedPrompt?.userMessage, "musicians");
  assert.deepEqual(
    (serialized.pass2Diagnostics?.providerRequest?.response_format as Record<string, unknown>)?.type,
    "json_schema",
  );

  const truncated = buildAiEnrichmentPass2Diagnostics({
    semanticReviewInput: { description: "x".repeat(32_010) },
    renderedPrompt: { userMessage: "short" },
  });
  assert.equal(
    ((truncated.semanticReviewInput?._diagnostic as Record<string, unknown>).truncations as unknown[]).length,
    1,
  );
});
