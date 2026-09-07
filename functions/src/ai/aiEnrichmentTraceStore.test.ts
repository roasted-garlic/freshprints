import assert from "node:assert/strict";
import test from "node:test";

import { writeAiEnrichmentTraceDocument } from "./aiEnrichmentTraceStore";

test("trace document writes remain successful without logging", async () => {
  let writes = 0;
  const logs: unknown[] = [];
  await writeAiEnrichmentTraceDocument(async () => { writes += 1; }, { traceId: "success", collection: "bounded" }, (_event, context) => logs.push(context));
  assert.equal(writes, 1);
  assert.deepEqual(logs, []);
});

test("bounded trace write failures are fail-soft and safely logged", async () => {
  const logs: Array<{ event: string; context: Record<string, unknown> }> = [];
  await writeAiEnrichmentTraceDocument(
    async () => { throw new Error("Cannot use undefined at prompt.effectiveUser; secret=do-not-log"); },
    { traceId: "failed", collection: "bounded" },
    (event, context) => logs.push({ event, context }),
  );
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.event, "ai_enrichment_trace.write_failed");
  assert.deepEqual(logs[0]?.context, {
    operation: "trace_write",
    traceId: "failed",
    collection: "bounded",
    errorName: "Error",
    errorMessage: "Cannot use undefined at prompt.effectiveUser; secret=[redacted]",
    projectId: process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "unknown",
  });
  assert.equal(JSON.stringify(logs).includes("do-not-log"), false);
});

test("full trace write failures are independently fail-soft", async () => {
  let called = false;
  await writeAiEnrichmentTraceDocument(async () => { called = true; throw new Error("full write failed"); }, { traceId: "full", collection: "full" }, () => undefined);
  assert.equal(called, true);
});
