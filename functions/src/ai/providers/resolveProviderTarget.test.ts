import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveProviderTarget,
  GEMINI_CHAT_COMPLETIONS_URL,
  OPENAI_CHAT_COMPLETIONS_URL,
} from "./resolveProviderTarget";

describe("resolveProviderTarget", () => {
  it("defaults to the Google Gemini OpenAI-compatible endpoint", () => {
    const target = resolveProviderTarget();
    assert.equal(target.providerId, "google");
    assert.equal(target.baseUrl, GEMINI_CHAT_COMPLETIONS_URL);
  });

  it("resolves OpenAI Chat Completions when providerId is openai", () => {
    const target = resolveProviderTarget("openai");
    assert.equal(target.providerId, "openai");
    assert.equal(target.baseUrl, OPENAI_CHAT_COMPLETIONS_URL);
  });
});
