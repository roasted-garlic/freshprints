import assert from "node:assert/strict";
import { readFile, unlink } from "node:fs/promises";
import test from "node:test";
import type { AiEnrichmentTrace } from "../../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
import {
  buildAiEnrichmentPass2Diagnostics,
  validateAiEnrichmentTrace,
} from "../../../packages/shared/src/utils/aiEnrichmentTrace";
import {
  writeAiEnrichmentTraceArtifact,
} from "./aiEnrichmentTraceArtifacts";

test("writes an importable bounded automated-test trace artifact without Firestore", async () => {
  const trace: AiEnrichmentTrace = {
    schemaVersion: 1,
    traceId: "artifact-test-trace",
    source: "AUTOMATED TEST - MOCK/FIXTURE",
    testName: "aiEnrichmentTraceArtifacts.test",
    provider: "mock-fixture",
    model: "fixture-model",
    captureFullTrace: false,
    startedAt: new Date(0).toISOString(),
    lifecycleState: "complete",
    stages: [{ stage: "complete", at: new Date(0).toISOString() }],
    pass2Diagnostics: buildAiEnrichmentPass2Diagnostics({
      semanticReviewInput: { originalSmartProfile: { subjects: ["fixture"] } },
      renderedPrompt: { systemMessage: "fixture system", userMessage: "fixture user" },
      providerRequest: { model: "fixture-model", max_completion_tokens: 1200 },
      patchValidationInput: { status: "NOT_REACHED" },
    }),
    testResult: "PASS",
  };

  const artifactPath = await writeAiEnrichmentTraceArtifact(trace);
  try {
    const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as unknown;
    assert.equal(validateAiEnrichmentTrace(artifact), true);
    assert.equal((artifact as AiEnrichmentTrace).source, "AUTOMATED TEST - MOCK/FIXTURE");
    assert.equal(
      (artifact as AiEnrichmentTrace).pass2Diagnostics?.providerRequest?.model,
      "fixture-model",
    );
  } finally {
    await unlink(artifactPath).catch(() => undefined);
  }
});
