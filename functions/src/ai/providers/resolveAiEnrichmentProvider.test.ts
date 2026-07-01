import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAiEnrichmentProvider } from "./resolveAiEnrichmentProvider";

describe("resolveAiEnrichmentProvider", () => {
  it("keeps gpt-5.4-nano as the configured default when no override is supplied", () => {
    const provider = resolveAiEnrichmentProvider(
      /*openAiApiKey*/ "test-key",
      /*geminiApiKey*/ "",
      /*configuredVisionModelId*/ "gpt-5.4-nano-2026-03-17",
      /*configuredReasoningEffort*/ "medium",
    );

    assert.equal(provider.providerId, "openai");
    assert.equal(provider.modelId, "gpt-5.4-nano-2026-03-17");
  });

  it("uses an allowlisted one-off override without mutating the configured model", () => {
    const provider = resolveAiEnrichmentProvider(
      /*openAiApiKey*/ "test-key",
      /*geminiApiKey*/ "",
      /*configuredVisionModelId*/ "gpt-5.4-nano-2026-03-17",
      /*configuredReasoningEffort*/ "medium",
      /*overrideVisionModelId*/ "gpt-5.4-mini-2026-03-17",
    );

    assert.equal(provider.providerId, "openai");
    assert.equal(provider.modelId, "gpt-5.4-mini-2026-03-17");
  });

  it("routes a gemini model to the google provider when a gemini key is supplied", () => {
    const provider = resolveAiEnrichmentProvider(
      /*openAiApiKey*/ "",
      /*geminiApiKey*/ "gemini-test-key",
      /*configuredVisionModelId*/ "gemini-2.5-flash-lite",
      /*configuredReasoningEffort*/ "medium",
    );

    assert.equal(provider.providerId, "google");
    assert.equal(provider.modelId, "gemini-2.5-flash-lite");
  });
});
