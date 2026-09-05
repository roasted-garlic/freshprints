import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAiEnrichmentProvider } from "./resolveAiEnrichmentProvider";
import { buildVisionRequestBody } from "./geminiVisionEnrichmentProvider";

describe("resolveAiEnrichmentProvider", () => {
  it("routes a gemini model to the google provider when a gemini key is supplied", () => {
    const provider = resolveAiEnrichmentProvider(
      /*geminiApiKey*/ "gemini-test-key",
      /*configuredVisionModelId*/ "gemini-2.5-flash-lite",
    );

    assert.equal(provider.providerId, "google");
    assert.equal(provider.modelId, "gemini-2.5-flash-lite");
  });

  it("routes gemini-3.1-flash-lite through google without prefix inference", () => {
    const provider = resolveAiEnrichmentProvider(
      "gemini-test-key",
      "gemini-3.1-flash-lite",
    );

    assert.equal(provider.providerId, "google");
    assert.equal(provider.modelId, "gemini-3.1-flash-lite");
  });

  it("routes gpt-5.6-luna through openai when OpenAI key is supplied", () => {
    const provider = resolveAiEnrichmentProvider(
      "gemini-test-key",
      "gpt-5.6-luna",
      undefined,
      "openai-test-key",
    );

    assert.equal(provider.providerId, "openai");
    assert.equal(provider.modelId, "gpt-5.6-luna");
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

  it("allows Luna override when Gemini is the configured default", () => {
    const provider = resolveAiEnrichmentProvider(
      "gemini-test-key",
      "gemini-2.5-flash-lite",
      "gpt-5.6-luna",
      "openai-test-key",
    );

    assert.equal(provider.providerId, "openai");
    assert.equal(provider.modelId, "gpt-5.6-luna");
  });

  it("allows Gemini override when Luna is the configured default", () => {
    const provider = resolveAiEnrichmentProvider(
      "gemini-test-key",
      "gpt-5.6-luna",
      "gemini-3.1-flash-lite",
      "openai-test-key",
    );

    assert.equal(provider.providerId, "google");
    assert.equal(provider.modelId, "gemini-3.1-flash-lite");
  });

  it("fails closed for Luna when OpenAI key is missing", () => {
    assert.throws(
      () =>
        resolveAiEnrichmentProvider(
          "gemini-test-key",
          "gpt-5.6-luna",
          undefined,
          "",
        ),
      /OPENAI_API_KEY/,
    );
  });

  it("falls back to the development provider when Gemini path has no gemini key", () => {
    const provider = resolveAiEnrichmentProvider(
      /*geminiApiKey*/ "",
      /*configuredVisionModelId*/ "gemini-2.5-flash-lite",
    );

    assert.equal(provider.providerId, "development");
  });
});

describe("buildVisionRequestBody dual-provider", () => {
  it("pins reasoning_effort low for Luna and omits it for Gemini", () => {
    const luna = JSON.parse(
      buildVisionRequestBody(
        "gpt-5.6-luna",
        "prompt",
        "abc",
        "image/png",
        100,
        "system",
      ),
    ) as Record<string, unknown>;
    const gemini = JSON.parse(
      buildVisionRequestBody(
        "gemini-2.5-flash-lite",
        "prompt",
        "abc",
        "image/png",
        100,
        "system",
      ),
    ) as Record<string, unknown>;

    assert.equal(luna.reasoning_effort, "low");
    assert.equal(luna.model, "gpt-5.6-luna");
    assert.equal("reasoning_effort" in gemini, false);
    assert.equal(gemini.model, "gemini-2.5-flash-lite");
  });
});
