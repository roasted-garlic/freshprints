import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { FirebaseError } from "firebase/app";

import {
  ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS,
  resolveAiEnrichmentCallableErrorMessage,
} from "./aiEnrichmentCallableErrorMessage";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression coverage for the client/server callable timeout mismatch
 * (post-launch-catalog-and-processing-stability, Owner QA Amendment 5).
 *
 * enqueueAiEnrichment's server-side timeoutSeconds is 180 (functions/src/enqueueAiEnrichment.ts),
 * well above the Firebase JS SDK's 70-second callable default
 * (node_modules/@firebase/functions/dist/index.cjs.js: "Default timeout to 70s, but let the
 * options override it."). Without a client-side override, any design whose Gemini pipeline
 * genuinely runs longer than 70s caused the client call to reject with
 * functions/deadline-exceeded while the server-side pipeline kept running to completion
 * independently — the client then lost track of that design's real completion until an unrelated
 * later reload happened to observe it, producing the reported "Processing count/list freezes,
 * then everything reconciles at once" symptom.
 */
describe("enqueueAiEnrichment client timeout is aligned with the server's 180s allowance", () => {
  it("the client timeout constant exceeds the server's timeoutSeconds by a real margin, not merely matches the SDK default", () => {
    const serverSource = read("functions/src/enqueueAiEnrichment.ts");
    const serverTimeoutMatch = serverSource.match(/timeoutSeconds:\s*(\d+)/);
    assert.ok(serverTimeoutMatch, "expected to find enqueueAiEnrichment's server-side timeoutSeconds");
    const serverTimeoutMs = Number(serverTimeoutMatch![1]) * 1000;

    assert.equal(serverTimeoutMs, 180_000, "server-side allowance changed — re-verify the client buffer below");
    assert.ok(
      ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS > serverTimeoutMs,
      "the client timeout must exceed the server's own allowance, with a real buffer for network/serialization overhead",
    );
    assert.ok(
      ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS > 70_000,
      "the client timeout must exceed the Firebase SDK's 70-second callable default",
    );
  });

  it("the installed Firebase SDK's own callable default is genuinely 70 seconds (confirms the mismatch this fix closes was real)", () => {
    const sdkSource = read("node_modules/@firebase/functions/dist/index.cjs.js");
    assert.match(sdkSource, /Default timeout to 70s, but let the options override it\./);
    assert.match(sdkSource, /const timeout = options\.timeout \|\| 70000;/);
  });

  it("callTracedFunction accepts and forwards an optional per-call timeout override to httpsCallable", () => {
    const source = read("apps/studio/src/renderer/src/config/tracedCallable.ts");
    assert.match(source, /callableOptions\?:\s*HttpsCallableOptions/);
    assert.match(
      source,
      /httpsCallable<Request, Response>\(functionsInstance, callableName, callableOptions\)/,
    );
  });

  it("aiEnrichmentEnqueueService passes the aligned timeout specifically for enqueueAiEnrichment, not as a blanket change", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/services/aiEnrichmentEnqueueService.ts",
    );
    const enqueueBlock = source.slice(
      source.indexOf("async function enqueueAiEnrichment("),
      source.indexOf("export const aiEnrichmentEnqueueService"),
    );
    assert.match(enqueueBlock, /\{ timeout: ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS \}/);

    // resetForProcessing calls a different, Firestore-only callable with its own (unrelated,
    // shorter) server-side timeout — it must NOT receive this override.
    const resetBlock = source.slice(source.indexOf("async resetForProcessing("));
    assert.doesNotMatch(resetBlock, /ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS/);
  });
});

describe("functions/deadline-exceeded is mapped to an accurate, non-alarming message", () => {
  it("maps deadline-exceeded to a message distinct from a genuine failure", () => {
    const error = new FirebaseError("functions/deadline-exceeded", "DEADLINE_EXCEEDED");
    const message = resolveAiEnrichmentCallableErrorMessage(error);

    assert.match(message, /taking longer than expected/i);
    assert.doesNotMatch(message, /could not be queued|could not start|unavailable|permission/i);
  });

  it("still maps a genuine failed-precondition to an actionable message, unaffected by the new case", () => {
    const error = new FirebaseError(
      "functions/failed-precondition",
      "This design is no longer eligible for automatic AI enqueue.",
    );
    const message = resolveAiEnrichmentCallableErrorMessage(error);

    assert.equal(message, "This design is no longer eligible for automatic AI enqueue.");
  });

  it("still maps unavailable/internal to the existing Functions-deployment guidance, unaffected by the new case", () => {
    const error = new FirebaseError("functions/unavailable", "UNAVAILABLE");
    const message = resolveAiEnrichmentCallableErrorMessage(error);

    assert.match(message, /Confirm Cloud Functions are deployed/);
  });

  it("maps a plain (non-Firebase) Error through its own message, and an unrecognized value to the generic fallback", () => {
    assert.equal(resolveAiEnrichmentCallableErrorMessage(new Error("boom")), "boom");
    assert.equal(resolveAiEnrichmentCallableErrorMessage("not an error at all"), "Unable to run AI processing right now.");
  });
});
