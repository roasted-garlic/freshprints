import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveProviderTarget,
  GEMINI_CHAT_COMPLETIONS_URL,
  OPENAI_CHAT_COMPLETIONS_URL,
} from "./resolveProviderTarget";

describe("resolveProviderTarget", () => {
  it("routes gemini- prefixed models to Google", () => {
    const target = resolveProviderTarget("gemini-2.5-flash-lite");
    assert.equal(target.providerId, "google");
    assert.equal(target.baseUrl, GEMINI_CHAT_COMPLETIONS_URL);
    assert.equal(target.supportsReasoningEffort, false);
  });

  it("routes gpt- prefixed models to OpenAI", () => {
    const target = resolveProviderTarget("gpt-5.4-nano-2026-03-17");
    assert.equal(target.providerId, "openai");
    assert.equal(target.baseUrl, OPENAI_CHAT_COMPLETIONS_URL);
    assert.equal(target.supportsReasoningEffort, true);
  });

  it("routes unknown models to OpenAI by default", () => {
    const target = resolveProviderTarget("unknown-model-xyz");
    assert.equal(target.providerId, "openai");
    assert.equal(target.supportsReasoningEffort, true);
  });

  it("routes any gemini-* variant to Google", () => {
    const target = resolveProviderTarget("gemini-3.0-pro");
    assert.equal(target.providerId, "google");
    assert.equal(target.supportsReasoningEffort, false);
  });
});
