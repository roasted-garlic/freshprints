import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAiEnrichmentProvider } from "./resolveAiEnrichmentProvider";

describe("resolveAiEnrichmentProvider", () => {
  it("routes a gemini model to the google provider when a gemini key is supplied", () => {
    const provider = resolveAiEnrichmentProvider(
      /*geminiApiKey*/ "gemini-test-key",
      /*configuredVisionModelId*/ "gemini-2.5-flash-lite",
    );

    assert.equal(provider.providerId, "google");
    assert.equal(provider.modelId, "gemini-2.5-flash-lite");
  });

  it("uses an allowlisted one-off override without mutating the configured model", () => {
    const provider = resolveAiEnrichmentProvider(
      /*geminiApiKey*/ "gemini-test-key",
      /*configuredVisionModelId*/ "gemini-2.5-flash-lite",
      /*overrideVisionModelId*/ "gemini-3.1-flash-lite",
    );

    assert.equal(provider.providerId, "google");
    assert.equal(provider.modelId, "gemini-3.1-flash-lite");
  });

  it("falls back to the development provider when no gemini key is supplied", () => {
    const provider = resolveAiEnrichmentProvider(
      /*geminiApiKey*/ "",
      /*configuredVisionModelId*/ "gemini-2.5-flash-lite",
    );

    assert.equal(provider.providerId, "development");
  });
});
